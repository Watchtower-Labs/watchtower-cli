#!/usr/bin/env python3
"""
Minimal test to validate Watchtower plugin with Google ADK.
This creates the simplest possible ADK agent to test plugin integration.
"""

import asyncio
import os
from datetime import datetime, timezone
from dotenv import load_dotenv
from google.adk.agents import Agent
from google.adk.runners import InMemoryRunner
from google.adk.models.lite_llm import LiteLlm
from google.genai.types import Content, Part
from watchtower import AgentTracePlugin

# Load environment variables from .env file
load_dotenv()


# Simple test tools to demonstrate full lifecycle
def calculator(operation: str, a: float, b: float) -> float:
    """Performs basic math operations."""
    operations = {
        "add": lambda x, y: x + y,
        "subtract": lambda x, y: x - y,
        "multiply": lambda x, y: x * y,
        "divide": lambda x, y: x / y if y != 0 else 0,
    }
    # Returns 0 for unknown operations (intentional soft failure for test resilience)
    result = operations.get(operation, lambda x, y: 0)(a, b)
    print(f"  [TOOL] Calculator: {a} {operation} {b} = {result}")
    return result


def get_time() -> str:
    """Returns current time."""
    now = datetime.now(timezone.utc).isoformat()
    print(f"  [TOOL] Current time: {now}")
    return now


async def main():
    print("=" * 70)
    print("Minimal Google ADK + Watchtower Integration Test")
    print("=" * 70)
    print()

    # Create agent with tools to show full lifecycle
    # Using ChatGPT via LiteLLM to bypass Gemini quota
    agent = Agent(
        name="minimal_agent",
        model=LiteLlm(model="gpt-4o-mini"),  # Fast and cheap OpenAI model
        instruction="You are a helpful assistant. Use the calculator and time tools when appropriate.",
        tools=[calculator, get_time],
    )

    # Create plugin
    plugin = AgentTracePlugin(
        enable_stdout=os.environ.get("WATCHTOWER_LIVE") == "1",
        run_id=os.environ.get("WATCHTOWER_RUN_ID"),
    )

    print(f"Live mode: {os.environ.get('WATCHTOWER_LIVE') == '1'}")
    print(f"Run ID: {plugin.run_id}")
    print()

    # Create runner with plugin
    runner = InMemoryRunner(
        agent=agent,
        app_name="minimal_test",
        plugins=[plugin],  # Plugin attached here!
    )

    # Setup session
    user_id = "test_user"
    session_id = "test_session"

    # Create session using the proper API
    print("Creating session...")
    session = await runner.session_service.create_session(
        app_name="minimal_test",
        user_id=user_id,
        session_id=session_id,
    )
    print(f"Session created successfully! ID: {session.id}")
    print()

    # Run a query that will trigger tool usage
    query = "What is 15 multiplied by 7? Also, what time is it?"
    print(f"Query: {query}")
    print("-" * 70)

    message = Content(
        parts=[Part(text=query)],
        role="user"
    )

    print("Running agent...")
    try:
        async for event in runner.run_async(
            user_id=user_id,
            session_id=session_id,
            new_message=message
        ):
            # Print any content from the agent
            if hasattr(event, 'content') and event.content:
                print(f"Agent: {event.content}")

        print()
        print("=" * 70)
        print("SUCCESS!")
        print("=" * 70)

        # Show trace location
        if plugin.file_writer:
            trace_path = plugin.file_writer.get_trace_path()
            if trace_path:
                print(f"Trace saved to: {trace_path}")
                print()
                print("View with: watchtower show last")

    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
        return 1

    return 0


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    exit(exit_code)
