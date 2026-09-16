import json
import uuid
import groq
import query_cache
from typing import Literal
from log.logger import log
from pydantic import ValidationError
from langgraph.graph import END
from langgraph.types import Command
from langgraph.errors import NodeError
from langgraph.config import get_stream_writer
from langchain_core.exceptions import OutputParserException
from langchain.messages import SystemMessage, HumanMessage, ToolMessage, AIMessage
from ..models.models import SearchAgentState, OutputSchema, JudgeVerdict
from ..LLMs.llm import standard_llm, judge_llm
from ..prompts.prompt import (
    IDENTIFIER_CLARIFY_MARKER,
    IDENTIFIER_CLARIFY_MSG,
    IDENTIFIER_LABELS,
    INVALID_BARCODE_MARKER,
    INVALID_BARCODE_NOTE,
    INVALID_BARCODE_WITH_PRODUCT_MSG,
    UNVERIFIED_IDENTIFIER_NOTE,
    JUDGE_PROMPT,
    NO_EXACT_SIMILAR_MSG,
    NO_RESULTS_MSG,
    SEMANTIC_RESULTS_MSG,
)
from ..tools.tools import KeywordFilterSearch, SemanticFilterSearch, WebSearch
from ..utils.utils import (
    KEYWORD_FIELDS,
    WEB_FILTER_FIELDS,
    build_search_prompt,
    digits_only,
    identifier_only_args,
    is_bare_number,
    is_valid_barcode,
    select_tools,
    should_loop,
    validate_ids,
    apply_filter_check,
    dedup_by_id,
    _compact_for_judge,
)


TOOLS_BY_NAME = {
    t.name: t for t in [KeywordFilterSearch, SemanticFilterSearch, WebSearch]
}

# Re-ask the judge at most this many times if it returns ids that aren't in the
# candidate pool (hallucinated), before falling back to the valid ids only.
JUDGE_MAX_RETRIES = 2


def _is_bad_output(e: Exception) -> bool:
    """True if the exception is a malformed-output error the model can fix (client-side
    parse/validation OR Groq's server-side json_validate_failed), vs a transient/infra
    error (rate limit, timeout, network) to bail on."""
    is_client = isinstance(e, (OutputParserException, ValidationError))
    is_groq_json = isinstance(e, groq.APIError) and "json_validate_failed" in str(e)
    return is_client or is_groq_json


def _failed_generation(e: Exception) -> str:
    """The model's own broken text, if Groq stashed it in the error body (else "").
    `.body` is the parsed error dict; its shape varies by SDK version
    ({"error": {...}} or the flat {...}), so unwrap either."""
    if isinstance(e, groq.APIError):
        body = getattr(e, "body", None)
        err = body.get("error", body) if isinstance(body, dict) else {}
        return err.get("failed_generation", "") if isinstance(err, dict) else ""
    return ""


def _build_web_query(state: SearchAgentState) -> str:
    """Deterministic web query from the pinned first-call args (context-resolved, so
    a follow-up turn like "find more like that" can't poison it). Keyword-first:
    norm_name + companies + filters; semantic-first: semantic_query + companies +
    filters."""
    kp = state.get("keyword_params") or {}
    filters = state.get("filters") or {}
    parts: list = []
    if state.get("first_tool") == SemanticFilterSearch.name:
        if state.get("semantic_query"):
            parts.append(state["semantic_query"])
    elif kp.get("norm_name"):
        parts.append(kp["norm_name"])
    parts.extend(kp.get("companies") or [])
    for v in filters.values():
        if not v:
            continue
        parts.extend(v if isinstance(v, list) else [str(v)])
    return " ".join(str(p) for p in parts).strip()


def _web_tool_call(query: str) -> AIMessage:
    """Synthesize a WebSearch tool call so the normal tool_node/judge flow runs even
    though the model declined to emit one itself."""
    return AIMessage(
        content="",
        tool_calls=[
            {
                "name": WebSearch.name,
                "args": {"query": query},
                "id": f"web_{uuid.uuid4().hex[:8]}",
                "type": "tool_call",
            }
        ],
    )


def _as_list(value) -> list:
    return value if isinstance(value, list) else ([value] if value else [])


def _already_asked_identifier(messages: list, value: str) -> bool:
    """True if we already asked about THIS number in the conversation, so the user's
    answer ("it's a barcode", "search anyway") runs the search instead of being asked
    again. Scoped to the value: a different bad number later is still questioned."""
    wanted = digits_only(value)
    for m in messages:
        if getattr(m, "type", None) != "ai":
            continue
        content = str(getattr(m, "content", "") or "")
        asked = IDENTIFIER_CLARIFY_MARKER in content or INVALID_BARCODE_MARKER in content
        if asked and wanted and wanted in digits_only(content):
            return True
    return False


def _identifier_clarification(state: SearchAgentState, call: dict) -> str | None:
    """The question to ask instead of searching, or None to let the search run.

    - Nothing but identifiers, and the user's message was a bare number: which field
      it belongs to is a guess (barcodes and FDA numbers are both usually 13 digits
      here) → ask which kind it is.
    - A barcode that isn't well-formed (wrong length or failing check digit), with or
      without a product name → it's almost certainly mistyped. On its own: ask which
      kind + "check the number". With a product/brand: offer to search without it,
      because searching with it can only return nothing — or, via the web fallback,
      a product that was never checked against that barcode.
    Asked once per number: the user can always answer "search anyway".
    """
    args = call["args"]
    keyword_args = args.get("keyword_args") or {}
    filter_args = args.get("filter_args") or {}
    identifiers = identifier_only_args(keyword_args, filter_args)
    bad_barcodes = [str(b) for b in _as_list(dict(filter_args).get("barcodes")) if not is_valid_barcode(b)]
    bare = bool(identifiers) and is_bare_number(state.get("user_prompt") or "")

    if not bare and not bad_barcodes:
        return None

    if identifiers:
        values = [str(v) for vals in identifiers.values() for v in _as_list(vals)]
        value = bad_barcodes[0] if bad_barcodes else values[0]
        if _already_asked_identifier(state["messages"], value):
            return None
        msg = IDENTIFIER_CLARIFY_MSG.format(value=value)
        if bad_barcodes:
            msg += "\n\n" + INVALID_BARCODE_NOTE.format(value=value)
    else:
        value = bad_barcodes[0]
        if _already_asked_identifier(state["messages"], value):
            return None
        kw = dict(keyword_args)
        product = " ".join(
            [*(str(c) for c in _as_list(kw.get("companies"))), str(kw.get("norm_name") or "")]
        ).strip() or "the product"
        msg = INVALID_BARCODE_WITH_PRODUCT_MSG.format(value=value, product=product)

    log.info("identifier.clarify_asked", value=value, bare=bare, bad_barcode=bool(bad_barcodes),
             identifier_only=bool(identifiers))
    return msg


def search_node(state: SearchAgentState) -> dict:
    """Issue one search tool call, or (first call only) reply directly.

    The first visit binds {keyword, semantic} with tool_choice="auto": the model
    may decline to search and answer directly, which is the "direct" route. Later
    loop passes force a call ("any") so the fallback ladder (select_tools) holds
    while the LLM is still free to reformulate the args for the tool it's given.
    """
    is_first = not state.get("tools_called")
    names = select_tools(state.get("first_tool"), state.get("tools_called", []))
    tools = [TOOLS_BY_NAME[n] for n in names]
    # auto on the first call lets the model reply directly; any forces a call after.
    tool_choice = "auto" if is_first else "any"
    llm_with_tools = standard_llm.bind_tools(tools, tool_choice=tool_choice)
    try:
        result = llm_with_tools.invoke(
            [SystemMessage(build_search_prompt(names, allow_direct=is_first))]
            + state["messages"]
        )
    except Exception as e:
        # Groq raises "Tool choice is required, but model did not call a tool" when
        # a forced (loop) call declines to search. If WebSearch was on the table this
        # call, we DON'T let the decline end the turn — we synthesize the web call
        # ourselves with a query built from the pinned args (guaranteed last-resort
        # web search). For any other declined tool we honor it and go to response.
        # Re-raise anything else (rate limit, network) for the node retry policy.
        if isinstance(e, groq.APIError) and "did not call a tool" in str(e).lower():
            log.warning("search_node.declined_tool", tools=names, error=str(e))
            if WebSearch.name in names:
                query = _build_web_query(state)
                if query:
                    return {"messages": [_web_tool_call(query)]}
            return {"messages": [AIMessage(content="")]}
        raise
    tool_calls = getattr(result, "tool_calls", None)
    # A turn that comes down to a bare number (or a malformed barcode) is ambiguous:
    # ask which field it belongs to instead of searching one at random. Only on the
    # first call, where replying directly is still allowed.
    if is_first and tool_calls and len(tool_calls) == 1 and tool_calls[0]["name"] == KeywordFilterSearch.name:
        question = _identifier_clarification(state, tool_calls[0])
        if question:
            return {"messages": [AIMessage(content=question)], "classification": "direct"}

    update = {"messages": [result]}
    # Only the first (unforced) call decides the route: a tool call means search,
    # no tool call means the model already wrote a direct reply.
    if is_first:
        update["classification"] = "search" if tool_calls else "direct"
    return update


def should_continue(state: SearchAgentState) -> Literal["cache_node", "tool_node", "response_node"]:
    """Run the pending tool call, or (safety only, since the call is forced) go
    straight to the response. The FIRST call of a turn goes through cache_node,
    which either serves it from the cache or passes it on to tool_node; retry
    loops are never cached, so they go straight to tool_node."""
    last_message = state["messages"][-1]
    if not getattr(last_message, "tool_calls", None):
        return "response_node"
    return "tool_node" if state.get("tools_called") else "cache_node"


def cache_node(state: SearchAgentState) -> Command[Literal["tool_node", "response_node"]]:
    """Global query cache in front of the first search call.

    Only keyword-first searches are keyed (on the LLM's resolved args, so any
    wording of the same product — and context-dependent follow-ups — land on the
    same key). Semantic query text varies with phrasing, so it isn't cached.

    Hit  → emit the cached products the same way tool_node would, author the
           ToolMessage the tool-call protocol expects, and jump to response_node
           (skips Typesense and the judge LLM).
    Miss → record the key so response_node can save the result, run the tool.
    Shadow mode never serves: it stashes the would-be hit for comparison.
    """
    miss = Command(goto="tool_node")
    if not state.get("cache_enabled"):
        return miss

    tool_calls = state["messages"][-1].tool_calls
    call = tool_calls[0]
    if len(tool_calls) != 1 or call["name"] != KeywordFilterSearch.name:
        log.info("qcache.skip", reason="not_keyword_search", tool=call["name"])
        return miss

    key = query_cache.build_key(call["args"].get("keyword_args"), call["args"].get("filter_args"))
    if key is None:
        log.info("qcache.skip", reason="no_key")
        return miss

    cached = query_cache.get(key)
    source = "key"
    if cached is None:
        # Identifier-only question ("barcode: 21515"): no exact entry, but the
        # product card may already be cached from a different question.
        identifiers = query_cache.identifier_only_query(
            call["args"].get("keyword_args"), call["args"].get("filter_args")
        )
        cards = query_cache.find_by_identifiers(identifiers) if identifiers else None
        if cards:
            cached = {"matched": cards[:10], "relevant": []}
            source = "identifier"
    if cached is None:
        log.info("qcache.miss", key=key)
        return Command(update={"cache_key": key}, goto="tool_node")

    if query_cache.SHADOW:
        log.info("qcache.shadow_hit", key=key, source=source)
        return Command(update={"cache_key": key, "cache_shadow": cached}, goto="tool_node")

    matched = cached.get("matched") or []
    relevant = cached.get("relevant") or []
    log.info("qcache.hit", key=key, source=source, matched=len(matched), relevant=len(relevant))

    # Same stream event tool_node emits, so the UI renders a hit like a fresh search.
    products = matched + relevant
    if products:
        get_stream_writer()({"search_results": products, "tool": call["name"]})

    summary = (
        f"{call['name']}: found {len(matched)} matching product(s)."
        if matched else
        f"{call['name']}: no products matched."
    )
    return Command(
        update={
            "messages": [ToolMessage(content=summary, tool_call_id=call["id"])],
            "tools_called": [call["name"]],
            "first_tool": call["name"],
            "matched": matched,
            "relevant": relevant,
            "cache_key": key,
            "cache_hit": True,
        },
        goto="response_node",
    )


def tool_node(state: SearchAgentState) -> dict:
    """Execute the tool call and keep the full results in state. The ToolMessage
    is written by judge_node instead (it knows the match verdict), so no message is
    appended here — judge_node runs next and never invokes an LLM on state messages
    in between, so the tool-call/tool-result protocol stays intact."""

    writer = get_stream_writer()
    tool_calls = state["messages"][-1].tool_calls
    pool: list = []
    ran = None
    keyword_params = None
    filters = None
    semantic_query = None
    semantic_companies = None

    for tool_call in tool_calls:
        tool = TOOLS_BY_NAME.get(tool_call["name"])
        if tool is None:
            log.warning("agent.tool.unknown", tool=tool_call["name"])
            continue

        observation = tool.invoke(tool_call["args"]) or []
        ran = tool_call["name"]
        # Chart the tool mix (keyword / semantic / web) and whether it returned rows.
        log.info("tool.invoked", tool=tool_call["name"], results=len(observation))
        # Capture the match criteria for the judge / web-fallback query.
        if tool_call["name"] == KeywordFilterSearch.name:
            keyword_params = tool_call["args"].get("keyword_args")
            filters = tool_call["args"].get("filter_args")
        elif tool_call["name"] == SemanticFilterSearch.name:
            semantic_query = tool_call["args"].get("semantic_query")
            semantic_companies = tool_call["args"].get("companies")
            filters = tool_call["args"].get("filter_args")

        if observation:
            writer({"search_results": observation, "tool": tool_call["name"]})
            pool.extend(observation)

    update: dict = {
        "tools_called": [ran] if ran else [],
        "current_pool": pool,
    }
    # first tool call sets the trajectory (and its budget)
    if not state.get("first_tool") and ran:
        update["first_tool"] = ran
    # Pin the FIRST call's criteria (context-resolved source of truth). Keyword pins
    # keyword_args; semantic pins {companies} (judged) + the query text (web fallback).
    if not state.get("first_tool"):
        if ran == KeywordFilterSearch.name:
            update["keyword_params"] = keyword_params
            update["filters"] = filters
        elif ran == SemanticFilterSearch.name:
            update["keyword_params"] = {"companies": semantic_companies} if semantic_companies else None
            update["filters"] = filters
            update["semantic_query"] = semantic_query
    return update


def _bad_output_feedback(e: Exception) -> str | None:
    """If the exception is a malformed-output error the model can fix, return a
    correction message to feed back; otherwise None (a transient/infra error to
    bail on). Covers client-side parse/validation failures AND Groq's server-side
    json_validate_failed (raised as a BadRequestError, so the other two never see
    it)."""
    if not _is_bad_output(e):
        return None
    # Groq stashes the model's own broken text in the error body — echo it back so
    # it can see exactly what to fix.
    failed = _failed_generation(e)
    return (
        "Your previous reply was not valid against the required schema"
        + (f". You returned:\n{failed}\n" if failed else ". ")
        + "Reply with ONLY valid JSON of the form "
        + '{"reasoning": "<short reasoning>", "matched_ids": ["<id>", ...]} and nothing else. '
        + "Make sure every string is closed and the JSON is complete."
    )


def _judge_matches(keyword_params: dict, candidates: list) -> list:
    """LLM-as-judge: ids of the candidates that exactly match the user's keyword
    criteria. Re-asks with feedback if it invents ids, then keeps only valid ones."""
    if not candidates:
        return []

    # Show only the keyword fields the user actually gave: the judge compares each
    # provided field against the product's same field, nothing else.
    show_fields = [f for f in KEYWORD_FIELDS if keyword_params.get(f)]
    candidate_ids = [c.get("canonical_id") for c in candidates if c.get("canonical_id")]
    blob = "\n\n".join(_compact_for_judge(c, show_fields) for c in candidates)
    messages = [
        SystemMessage(JUDGE_PROMPT),
        HumanMessage(
            f"USER WANTS:\n{json.dumps(keyword_params)}\n\nCANDIDATES:\n{blob}"
        ),
    ]

    valid: list = []
    for attempt in range(JUDGE_MAX_RETRIES + 1):
        try:
            # the judge llm is also emitting a reasoning field (extra tokens). Have to see whether to remove it or not.
            verdict: JudgeVerdict = judge_llm.invoke(messages)
        except Exception as e:
            feedback = _bad_output_feedback(e)
            if feedback is not None:
                # Malformed output (bad JSON / wrong shape, client- or Groq-side) —
                # the model's fault, so feed it back and let it correct.
                log.warning("judge.parse_failed", error=str(e), attempt=attempt + 1)
                messages.append(HumanMessage(feedback))
                continue
            # Transient/infra (rate limit, timeout, network): not the model's fault
            # and nothing to feed back — bail with whatever's valid so far.
            log.error("judge.invoke.failed", error=str(e), error_type=type(e).__name__)
            return valid
        valid, hallucinated = validate_ids(verdict.matched_ids, candidate_ids)
        if not hallucinated:
            return valid
        log.warning("judge.hallucinated_ids", ids=hallucinated, attempt=attempt + 1)
        messages.append(
            AIMessage(content=json.dumps({"matched_ids": verdict.matched_ids}))
        )
        messages.append(
            HumanMessage(
                f"You returned ids that are not in the candidates: {hallucinated}. "
                "Only return ids that appear verbatim on an `id:` line. Do not infer or invent."
            )
        )
    return valid


def _identifier_filters(filters: dict | None) -> dict:
    """The identifier filters (barcode / FDA / cert number) the user gave."""
    return {k: _as_list(v) for k, v in (filters or {}).items() if k in WEB_FILTER_FIELDS and v}


def _split_web_results(pool: list, filters: dict | None) -> tuple[list, list]:
    """Split web results into (passers, unverified) against the identifiers the
    user gave; products that CONTRADICT an identifier are dropped.

    - passers:    carry every identifier field the user gave, with a matching value
                  → can be judged as a match.
    - unverified: simply don't list that field (web pages rarely show barcodes or FDA
                  numbers) → may be the product, but nothing confirms the number, so
                  they are only ever shown as similar, never as an exact match.
    - dropped:    list the field with a DIFFERENT value → contradicts the user.
    With no identifier filters every product passes, exactly as before.
    """
    lenient, _rejected = apply_filter_check(
        pool, filters, only_fields=WEB_FILTER_FIELDS, loose=True, skip_missing=True
    )
    strict, _ = apply_filter_check(
        lenient, filters, only_fields=WEB_FILTER_FIELDS, loose=True, skip_missing=False
    )
    strict_ids = {id(p) for p in strict}
    unverified = [p for p in lenient if id(p) not in strict_ids]
    if unverified:
        log.info("judge.web_unverified_identifiers", count=len(unverified),
                 fields=sorted(_identifier_filters(filters)))
    return strict, unverified


def judge_node(
    state: SearchAgentState,
) -> Command[Literal["response_node", "orchestration_node"]]:
    """Split the latest tool results into matched vs relevant.

    - Semantic-FIRST query: purely conceptual, no exact target → nothing "matches";
      everything found is a relevant/similar suggestion. (A downstream semantic
      call under a keyword-first query is still judged with the stored criteria.)
    - Filter-rejected products are dropped outright — they break the user's explicit
      filters, so they are neither matched nor relevant.
    - Keyword criteria (if given) are checked by the LLM judge; the passers that
      don't match become relevant/similar suggestions.

    On a match we return to response immediately (first match ends the loop);
    otherwise we accumulate relevant and hand off to orchestration.
    """
    pool = state.get("current_pool", [])
    prior_relevant = state.get("relevant", [])
    keyword_params = state.get("keyword_params")
    last_tool = state.get("tools_called", [])[-1] if state.get("tools_called") else None
    # Web products that don't carry an identifier the user gave: shown as similar,
    # never as a match (see _split_web_results).
    unverified: list = []

    if state.get("first_tool") == SemanticFilterSearch.name:
        # Semantic-first. Web results (only reachable as a semantic fallback) get the
        # same hard-identifier check as the keyword path; DB semantic results are
        # already Typesense-filtered, so they pass through.
        if last_tool == WebSearch.name:
            passers, unverified = _split_web_results(pool, state.get("filters"))
        else:
            passers = pool
        if keyword_params:
            # A brand was named → judge on the company arg: brand-matching products
            # are Matches, the rest are similar.
            matched_ids = set(_judge_matches(keyword_params, passers))
            matched = [p for p in passers if p.get("canonical_id") in matched_ids]
            non_matched = [
                p for p in passers if p.get("canonical_id") not in matched_ids
            ]
        else:
            # No brand → trust the vector relevance: everything is a Match.
            matched, non_matched = passers, []
    else:
        # Only filter-passers can be matched or relevant; rejected ones are dropped.
        # Web results were never DB-filtered, so re-check them on the hard
        # identifiers only, hyphen/case-insensitively, and only where the result
        # actually carries that field (see WEB_FILTER_FIELDS).
        if last_tool == WebSearch.name:
            passers, unverified = _split_web_results(pool, state.get("filters"))
        else:
            passers, _rejected = apply_filter_check(pool, state.get("filters"))
        if keyword_params:
            matched_ids = set(_judge_matches(keyword_params, passers))
            matched = [p for p in passers if p.get("canonical_id") in matched_ids]
            non_matched = [
                p for p in passers if p.get("canonical_id") not in matched_ids
            ]
        else:
            # filter-only query → the filter passers ARE the matches (no LLM needed)
            matched, non_matched = passers, []

    # Non-matching passers are always relevant/similar, accumulated across calls
    # and de-duplicated. Filter-rejected products never enter relevant; unverified
    # web products do (they may well be the product — we just can't confirm it).
    relevant = dedup_by_id(prior_relevant + non_matched + unverified)
    unverified_update = (
        {"unverified_identifiers": _identifier_filters(state.get("filters"))} if unverified else {}
    )

    # Author the ToolMessage here (not in tool_node) so it states the JUDGED
    # outcome: on a no-match loop, search_node reads an authoritative "no products
    # matched" signal instead of a raw count it could mistake for success. Required
    # for the tool-call protocol, so it's emitted on both paths.
    label = last_tool or "search"
    summary = (
        f"{label}: found {len(matched)} matching product(s)."
        if matched
        else f"{label}: no products matched."
    )
    tool_calls = getattr(state["messages"][-1], "tool_calls", None) or []
    tool_messages = [
        ToolMessage(content=summary, tool_call_id=tc["id"]) for tc in tool_calls
    ]

    if matched:
        return Command(
            update={
                "messages": tool_messages,
                "matched": matched,
                "relevant": relevant,
                **unverified_update,
            },
            goto="response_node",
        )
    return Command(
        update={"messages": tool_messages, "matched": [], "relevant": relevant, **unverified_update},
        goto="orchestration_node",
    )


def orchestration_node(
    state: SearchAgentState,
) -> Command[Literal["search_node", "response_node"]]:
    """Loop controller: fall back to the next tool if the budget allows, else stop.

    This node is only reached when the latest call produced NO matches (judge_node
    routes straight to response as soon as there's a match), so both trajectories
    simply climb the ladder until a match lands or the budget runs out. For
    semantic-first this means: no Match → retry semantic / fall back to web.
    """
    first_tool = state.get("first_tool")
    calls = len(state.get("tools_called", []))
    loop = should_loop(first_tool, calls)
    return Command(goto="search_node" if loop else "response_node")


# Fields allowed out to the client (whitelist applied when returning products).
_ALLOWED_OUT = set(OutputSchema.model_fields)


def _project(raw: dict) -> dict:
    """Return only client-facing fields; default DB products to verified."""
    proj = {k: v for k, v in raw.items() if k in _ALLOWED_OUT}
    proj.setdefault("verified", True)
    return proj


def _unverified_note(identifiers: dict | None) -> str:
    """'I couldn't confirm barcode `X` on these results.' — or '' if nothing to say."""
    parts = [
        f"{IDENTIFIER_LABELS.get(field, field)} " + ", ".join(f"`{v}`" for v in values)
        for field, values in (identifiers or {}).items()
        if values
    ]
    return UNVERIFIED_IDENTIFIER_NOTE.format(identifiers=" or ".join(parts)) if parts else ""


def response_node(state: SearchAgentState) -> dict:
    """Attach the already-decided product buckets and set the message.

    The split (matched/relevant) was done in judge_node, so this node never
    re-selects products. It also avoids the LLM whenever the outcome is known:
      - matches found        → short "Found N products for you." line
      - only similar found   → fixed "no exact match, here are similar" message
      - search found nothing → fixed "couldn't find it" message
      - direct chit-chat     → reuse the reply search_node already wrote
    """
    matched = state.get("matched", [])
    relevant = state.get("relevant", [])
    matched_out = [_project(p) for p in matched][:10]
    relevant_out = [_project(p) for p in relevant][:10]

    if matched_out:
        n = len(matched_out)
        response = f"Found {n} product{'s' if n != 1 else ''} for you."
    elif relevant_out:
        # semantic-first query wanted "similar", so don't apologise for missing
        # exact matches the user never asked for.
        response = (
            SEMANTIC_RESULTS_MSG
            if state.get("first_tool") == SemanticFilterSearch.name
            else NO_EXACT_SIMILAR_MSG
        )
        # Say WHY these aren't exact: some couldn't be checked against the
        # barcode / FDA / cert number the user gave.
        note = _unverified_note(state.get("unverified_identifiers"))
        if note:
            response = f"{response} {note}"
    elif state.get("classification") == "search":
        response = NO_RESULTS_MSG
    else:
        # direct: search_node already wrote the reply on the first (unforced) call.
        response = state["messages"][-1].content

    # Semantic hits aren't guaranteed exact, so their bucket is labelled "Matches";
    # keyword hits stay "Exact Matches". The frontend renders this as the section tag.
    match_label = (
        "Matches"
        if state.get("first_tool") == SemanticFilterSearch.name
        else "Exact Matches"
    )
    final = {
        "response": response,
        "matched": matched_out,
        "relevant": relevant_out,
        "match_label": match_label,
    }
    _save_to_cache(state, final["matched"], final["relevant"])
    return {"messages": [AIMessage(content=json.dumps(final))]}


def _save_to_cache(state: SearchAgentState, matched: list, relevant: list) -> None:
    """Store a freshly computed search result under the key cache_node recorded.

    Skipped when: the turn wasn't keyed (cache_key unset), it was served from the
    cache (don't refresh the TTL off itself), WebSearch ran (unverified, and the
    ladder only reaches web once the DB had no match), or nothing was found —
    with the ladder a DB miss always escalates to WebSearch, so an empty result
    without web means the model declined to search, which isn't a real answer.
    """
    key = state.get("cache_key")
    if not key or state.get("cache_hit"):
        return

    shadow = state.get("cache_shadow")
    if shadow is not None:
        # Would serving the cached entry have shown the user the same products?
        log.info(
            "qcache.shadow_compare",
            key=key,
            matched_agree=query_cache.ids(shadow.get("matched")) == query_cache.ids(matched),
            relevant_agree=query_cache.ids(shadow.get("relevant")) == query_cache.ids(relevant),
        )

    if WebSearch.name in (state.get("tools_called") or []):
        log.info("qcache.skip_save", key=key, reason="web_search_ran")
        return
    if not matched and not relevant:
        log.info("qcache.skip_save", key=key, reason="no_products")
        return
    query_cache.put(key, matched, relevant)


def default_error_handler(state: SearchAgentState, error: NodeError):
    """Recovery node, handles node failures."""

    log.error(
        "agent.node.failed",
        node=error.node,
        error=str(error),
        error_type=type(error.error).__name__,
    )
    response_object = {
        "response": "Some error occured, please try again.",
        "matched": [],
        "relevant": [],
    }

    return Command(
        update={"messages": [AIMessage(content=json.dumps(response_object))]},
        goto=END,
    )