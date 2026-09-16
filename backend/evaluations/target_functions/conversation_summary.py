import asyncio
from agents.langgraph_agent.main_langgraph_agent import summarize_conversation, _history_dicts_to_lc
from langchain.messages import HumanMessage, AIMessage


async def run_conversation_summary(inputs: dict) -> dict:
    """Target function: runs conversation summarization on the input turns and optional prior summary."""
    history = inputs.get("conversation_history", [])
    if history and isinstance(history[0], dict):
        lc_msgs = _history_dicts_to_lc(history)
    else:
        lc_msgs = history

    old_summary = inputs.get("previous_summary", "")

    summary_text = ""
    for _ in range(3):
        result = await asyncio.to_thread(summarize_conversation, lc_msgs, old_summary)
        if result and result[0]:
            summary_text = result[0]
            break
        await asyncio.sleep(1)

    return {"summary": summary_text}
