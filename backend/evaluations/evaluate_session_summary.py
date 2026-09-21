import sys
import asyncio
from dotenv import load_dotenv
from config.supabase_client import get_supabase
from config.langsmith_client import get_langsmith_client
from evaluations.evaluators.summary_evaluator import (
    conversation_summary_evaluator,
)

# Ensure stdout handles UTF-8 on Windows terminals
sys.stdout.reconfigure(encoding="utf-8")

load_dotenv(override=True)

DEFAULT_SESSION_ID = "d70ab533-9701-4567-b551-f864d3e0dcb1"


async def fetch_summary_with_included_messages(session_id: str, pick_latest: bool = True):
    """
    Fetch summaries for a session and retrieve ONLY the exact messages 
    whose IDs are listed in each summary's `message_ids` column.
    """
    client = await get_supabase()

    # 1. Fetch summaries for the session
    query = (
        client.table("chat_summaries")
        .select("id, session_id, summary, message_ids, created_at")
        .eq("session_id", session_id)
        .order("created_at", desc=True)
    )
    if pick_latest:
        query = query.limit(1)

    res_sum = await query.execute()
    summaries = res_sum.data or []
    if not summaries:
        return []

    # 2. For each summary, fetch ONLY the messages that are in its message_ids
    results = []
    for s in summaries:
        msg_ids = s.get("message_ids") or []
        if not msg_ids:
            continue

        res_msgs = (
            await client.table("chat_messages")
            .select("id, role, content, search_results, created_at")
            .in_("id", msg_ids)
            .order("created_at")
            .execute()
        )
        included_messages = res_msgs.data or []

        results.append({
            "summary_id": s.get("id"),
            "session_id": session_id,
            "created_at": s.get("created_at"),
            "summary_text": s.get("summary", ""),
            "message_ids": msg_ids,
            "included_messages": included_messages,
        })

    return results


async def evaluate_session_summaries_local(session_id: str = DEFAULT_SESSION_ID):
    """Evaluate all existing summaries in Supabase against ONLY their included message IDs."""
    print("=" * 80)
    print(f"EVALUATING EXISTING DATABASE SUMMARIES FOR SESSION: {session_id}")
    print("=" * 80)

    # Fetch summaries with ONLY their included messages (all summaries for this session)
    summary_items = await fetch_summary_with_included_messages(session_id, pick_latest=False)

    if not summary_items:
        print(f"No summaries found in database for session {session_id}.")
        return

    print(f"Found {len(summary_items)} summary record(s) in `chat_summaries` for this session.\n")

    for idx, item in enumerate(reversed(summary_items), 1):
        summary_text = item["summary_text"]
        msgs = item["included_messages"]
        msg_ids = item["message_ids"]

        print("=" * 80)
        print(f"SUMMARY #{idx} (Created: {item['created_at']})")
        print(f"Covered Message IDs Count: {len(msg_ids)}")
        print(f"Actual Messages Retrieved: {len(msgs)}")
        print("-" * 80)
        print("CONVERSATION HISTORY (ONLY INCLUDED MESSAGES):")
        for m_idx, m in enumerate(msgs, 1):
            role = "User" if m.get("role") == "user" else "Assistant"
            print(f"  [{m_idx}] (ID: {m.get('id')}) {role}: {m.get('content')}")

        print("-" * 80)
        print(f"STORED SUMMARY:\n{summary_text}")
        print("-" * 80)

        # Run LLM-as-a-Judge on this exact pair
        eval_inputs = {
            "previous_summary": "",
            "conversation_history": msgs,
        }
        eval_outputs = {"summary": summary_text}

        print("Evaluating summary against its included messages using LLM Judge...")
        grade_results = await conversation_summary_evaluator(eval_inputs, eval_outputs)

        for res in grade_results:
            score = res.get("score", 0.0)
            percentage = round(score * 100, 1)
            print(f"\n>> JUDGE SCORE: {percentage}% ({score}/1.0)")
            print(f">> JUDGE REASONING:\n{res.get('comment')}")
        print("=" * 80 + "\n")


async def evaluate_sessions_to_langsmith(session_ids: list[str] = None):
    """
    Fetch existing summaries and ONLY their included messages from Supabase,
    and run LangSmith evaluation.
    """
    client = get_langsmith_client()
    supabase = await get_supabase()

    if session_ids:
        target_sids = session_ids
    else:
        print("Scanning Supabase for all sessions that have summaries...")
        res = await supabase.table("chat_summaries").select("session_id").execute()
        target_sids = list({row["session_id"] for row in (res.data or []) if row.get("session_id")})

    if not target_sids:
        print("No sessions with summaries found in database.")
        return

    print(f"Found {len(target_sids)} session(s) with summaries. Fetching included messages...")

    eval_examples = []
    for sid in target_sids:
        # Fetch the latest summary and only its included messages
        items = await fetch_summary_with_included_messages(sid, pick_latest=True)
        if items:
            item = items[0]
            eval_examples.append({
                "inputs": {
                    "session_id": sid,
                    "previous_summary": "",
                    "conversation_history": item["included_messages"],
                },
                "outputs": {
                    "summary": item["summary_text"],
                    "covered_message_ids_count": len(item["message_ids"]),
                }
            })

    if not eval_examples:
        print("No valid summary examples to evaluate.")
        return

    LIVE_DATASET_NAME = "Halal One: Database Stored Summaries"

    # Clean / Recreate dataset in LangSmith to avoid appending duplicates on repeated runs
    if client.has_dataset(dataset_name=LIVE_DATASET_NAME):
        old_dataset = client.read_dataset(dataset_name=LIVE_DATASET_NAME)
        client.delete_dataset(dataset_id=old_dataset.id)

    dataset = client.create_dataset(
        dataset_name=LIVE_DATASET_NAME,
        description="Evaluates stored database summaries against ONLY their included message IDs.",
    )

    client.create_examples(
        dataset_id=dataset.id,
        examples=eval_examples,
    )

    # Pass-through target function that returns the stored summary
    async def get_stored_summary(inputs: dict) -> dict:
        # Lookup the stored summary for this session from the dataset
        sid = inputs.get("session_id")
        items = await fetch_summary_with_included_messages(sid, pick_latest=True)
        return {"summary": items[0]["summary_text"] if items else ""}

    print(f"Launching LangSmith evaluation experiment on '{LIVE_DATASET_NAME}'...")
    results = await client.aevaluate(
        get_stored_summary,
        data=LIVE_DATASET_NAME,
        evaluators=[conversation_summary_evaluator],
        experiment_prefix="experiment-stored-summaries 1.0",
        max_concurrency=2,
    )
    print("\n" + "=" * 80)
    print("LANGSMITH EVALUATION COMPLETE!")
    print("Check your LangSmith Project Dashboard to view all scores and traces.")
    print("=" * 80)
    return results


if __name__ == "__main__":
    args = sys.argv[1:]
    if "--langsmith" in args or "--all" in args:
        sids = [a for a in args if not a.startswith("--")]
        asyncio.run(evaluate_sessions_to_langsmith(sids if sids else None))
    else:
        sid = args[0] if args else DEFAULT_SESSION_ID
        asyncio.run(evaluate_session_summaries_local(sid))
