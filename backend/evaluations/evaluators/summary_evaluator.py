import os
import json
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from pydantic import BaseModel, Field
from langchain.messages import AIMessage, HumanMessage, SystemMessage

load_dotenv(override=True)

class SummaryJudgeGrade(BaseModel):
    """Detailed score and reasoning for the conversation summary evaluation."""
    reasoning: str = Field(
        ...,
        description="Step-by-step breakdown explaining points awarded or deducted based on the rubric."
    )
    score: float = Field(
        ...,
        description="Score between 0.0 and 1.0 (or 0% to 100%) following the rubric brackets."
    )

SUMMARY_JUDGE_SYSTEM_PROMPT = """You are an expert conversational AI evaluator specializing in multi-turn conversation summarization, memory retention, and context folding for HalalOne.

<Rubric>
Evaluate the summary based on the following criteria and score brackets:

### Score Brackets:
- **90% - 100% (Exceptional / Flawless)**:
  - Preserves 100% of permanent facts & hard constraints (e.g. allergies, specific mosques/certifications like SANHA-only, strict dietary rules).
  - Accurately captures all key search topics, intent transitions, dead-ends (searches returning 0 results), and final assistant resolutions.
  - Properly executes folding: copies forward active previous summary facts without re-summarizing them, drops resolved/superseded items, and merges new turns seamlessly.
  - Zero conversational filler, zero preambles (e.g., no "Here is a summary"), zero hallucinations.
  - Extremely concise, dense paragraph format within budget (<1000 tokens).

- **75% - 85% (Good / Strong)**:
  - All critical permanent constraints/preferences and major search outcomes are preserved.
  - Successfully folds previous summaries without losing important context.
  - Minor deductions: slight wordiness/verbosity, or omission of a minor non-essential assistant detail (e.g. didn't mention exact number of search hits, but captured the product type and state).

- **50% - 70% (Mediocre / Partial)**:
  - Captures some search requests but has noticeable deficiencies:
    - Missed a secondary preference or state change (e.g. forgot that a product was rejected later in the conversation).
    - Failed to drop superseded facts from the previous summary.
    - Minor conversational filler, mild preamble, or slightly bloated length.

- **25% - 40% (Poor / Critical Flaws)**:
  - Failed to retain a critical permanent constraint (e.g., forgot severe nut allergy or permanent certification filter).
  - Failed to fold previous summary properly (e.g. completely erased previous summary or re-summarized it and hallucinated).
  - Included severe conversational chatter, lists/bullets despite paragraph rule, or heavy hallucinations.

- **0% - 20% (Unacceptable / Failed)**:
  - Output is empty, irrelevant, hallucinates completely non-existent dialogue, or contradicts the conversation facts.

### Point Deductions:
- Deduct 40-50% if ANY permanent constraint (e.g., allergy, strict certification rule) is dropped or contradicted.
- Deduct 20-30% if the previous summary's active facts were lost during folding or if superseded/resolved items were incorrectly retained.
- Deduct 10-15% for preambles ("Here is a summary:"), conversational filler, or formatting as bullet points instead of a concise paragraph.
- Deduct 15-25% for hallucinations or invented facts not present in the conversation history.
</Rubric>

<Instructions>
1. Carefully inspect the <input> (which includes the conversation history and any previous summary) and the <output> (the generated summary).
2. Check for the retention of permanent user preferences and constraints (allergies, hard dietary requirements).
3. If a `PREVIOUS SUMMARY` was provided, verify folding integrity: were active permanent facts carried forward word-for-word, and were superseded facts dropped?
4. Check whether key search inquiries and dead-ends are captured concisely.
5. Check for unnecessary preambles, formatting violations (e.g. bullet points), or hallucinations.
6. Provide clear, step-by-step reasoning citing specific elements, then assign a numerical score between 0.0 and 1.0 based on the rubric above.
</Instructions>

<Reminder>
- The goal is to reward dense, accurate summaries that preserve vital long-term context and user constraints with zero conversational fluff.
- Permanent rules ("never", "always", "from now on") must NEVER be dropped.
- Output valid JSON matching the schema.
</Reminder>
"""

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise ValueError("GROQ API Key is missing!")

llm = ChatGroq(
    api_key=GROQ_API_KEY,
    model="openai/gpt-oss-20b",
    temperature=0
)

summary_judge_llm = llm.with_structured_output(SummaryJudgeGrade)


def _format_history_text(history: list) -> str:
    lines = []
    for m in history:
        if isinstance(m, dict):
            role = "User" if m.get("role") == "user" else "Assistant"
            content = m.get("content", "")
        else:
            role = "User" if getattr(m, "type", "") == "human" else "Assistant"
            content = getattr(m, "content", "")
        lines.append(f"{role}: {content}")
    return "\n".join(lines)


async def conversation_summary_evaluator(inputs: dict, outputs: dict, reference_outputs: dict = None) -> list:
    """Evaluates the quality and accuracy of the generated summary against conversation history and rubric."""
    prev_summary = inputs.get("previous_summary", "")
    history = inputs.get("conversation_history", [])
    history_text = _format_history_text(history)
    
    generated_summary = outputs.get("summary", "")
    if not generated_summary:
        return [
            {"key": "summary_quality", "score": 0.0, "comment": "No summary produced (empty output)."}
        ]

    input_text = ""
    if prev_summary:
        input_text += f"PREVIOUS SUMMARY:\n{prev_summary}\n\n"
    input_text += f"CONVERSATION HISTORY:\n{history_text}"

    user_message = f"""<input>
{input_text}
</input>

<output>
{generated_summary}
</output>
"""

    try:
        grade: SummaryJudgeGrade = await summary_judge_llm.ainvoke([
            SystemMessage(content=SUMMARY_JUDGE_SYSTEM_PROMPT),
            HumanMessage(content=user_message)
        ])
        score = max(0.0, min(1.0, grade.score))
        return [
            {"key": "summary_quality", "score": score, "comment": grade.reasoning}
        ]
    except Exception as e:
        return [
            {"key": "summary_quality", "score": 0.0, "comment": f"Evaluation error: {e}"}
        ]
