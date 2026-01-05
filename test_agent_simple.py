#!/usr/bin/env python3
"""
Simple test agent for validating Watchtower SDK and CLI integration.

Compatible with Google ADK 1.21.0+

Usage:
    # Run directly (generates trace file)
    python test_agent_simple.py

    # Run with CLI tail mode (live streaming)
    watchtower tail python test_agent_simple.py

    # View the generated trace
    watchtower show last
"""

import asyncio
import os
import sys
from datetime import datetime

try:
    from google.adk.agents import Agent
    from google.adk.runners import InMemoryRunner
    from google.adk.sessions import Session
    from google.genai.types import Content, Part
except ImportError as e:
    print(f"ERROR: Required packages not installed: {e}")
    print("Install with: pip install google-adk")
    sys.exit(1)

try:
    from watchtower import AgentTracePlugin
except ImportError:
    print("ERROR: watchtower SDK not installed")
    sys.exit(1)


# ============================================================================
# Test Tools
# ============================================================================

def simple_calculator(operation: str, a: float, b: float) -> float:
    """
    Performs basic math operations.

    Args:
        operation: One of 'add', 'subtract', 'multiply', 'divide'
        a: First number
        b: Second number

    Returns:
        Result of the operation
    """
    operations = {
        "add": lambda x, y: x + y,
        "subtract": lambda x, y: x - y,
        "multiply": lambda x, y: x * y,
        "divide": lambda x, y: x / y if y != 0 else float('inf'),
    }

    if operation not in operations:
        raise ValueError(f"Unknown operation: {operation}")

    result = operations[operation](a, b)
    print(f"  [Tool] Calculated: {a} {operation} {b} = {result}")
    return result


def get_current_time(timezone: str = "UTC") -> str:
    """
    Returns the current time.

    Args:
        timezone: Timezone for the time (only UTC supported in this test)

    Returns:
        Current timestamp as ISO 8601 string
    """
    now = datetime.utcnow().isoformat()
    print(f"  [Tool] Current time ({timezone}): {now}")
    return now


# ============================================================================
# Main Test Agent
# ============================================================================

async def run_test_agent():
    """Run the test agent with various queries to generate trace events."""

    print("=" * 70)
    print("Watchtower SDK + CLI Integration Test (Simple)")
    print("=" * 70)
    print()

    # Check environment variables set by CLI tail mode
    is_live_mode = os.environ.get("AGENTTRACE_LIVE") == "1"
    run_id = os.environ.get("AGENTTRACE_RUN_ID")

    print(f"Live mode: {is_live_mode}")
    print(f"Run ID: {run_id or 'auto-generated'}")
    print()

    # Create agent
    agent = Agent(
        name="test_calculator_agent",
        model="gemini-2.0-flash",
        instruction="""You are a helpful assistant with access to:
        - A calculator for math operations
        - Time/date information

        Use these tools when appropriate to answer user questions.""",
        tools=[simple_calculator, get_current_time],
    )

    # Configure tracing plugin
    plugin = AgentTracePlugin(
        # Write to files (always enabled)
        enable_file=True,
        # Stream to stdout only when CLI is tailing
        enable_stdout=is_live_mode,
        # Use CLI-provided run ID if available
        run_id=run_id,
    )

    # Create runner with tracing
    runner = InMemoryRunner(
        agent=agent,
        app_name="watchtower_test",
        plugins=[plugin],
    )

    # Test queries that exercise different event types
    test_queries = [
        "What is 15 multiplied by 7?",
        "What time is it right now?",
        "Calculate 100 divided by 4",
    ]

    user_id = "test_user"
    session_id = f"test_session_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"

    # Create and register the session
    session = Session(
        id=session_id,
        appName="watchtower_test",
        userId=user_id,
    )
    await runner.memory_service.add_session_to_memory(session)

    print(f"Starting agent with {len(test_queries)} test queries...")
    print()

    for i, query in enumerate(test_queries, 1):
        print(f"[Query {i}/{len(test_queries)}] {query}")
        print("-" * 70)

        try:
            # Create message content for the agent
            message_content = Content(
                parts=[Part(text=query)],
                role="user"
            )

            # Run the agent with the message
            async for event in runner.run_async(
                user_id=user_id,
                session_id=session_id,
                new_message=message_content
            ):
                if hasattr(event, 'content') and event.content:
                    # Print agent responses
                    print(f"  [Agent] {event.content}")
            print()
        except Exception as e:
            print(f"  [ERROR] {e}")
            import traceback
            traceback.print_exc()
            print()

    # Report trace location
    print("=" * 70)
    print("Test completed!")
    print("=" * 70)

    try:
        trace_path = plugin.file_writer.get_trace_path()
        print(f"Trace saved to: {trace_path}")
        print()
        print("View the trace with:")
        print(f"  watchtower show last")
        print(f"  watchtower show {os.path.basename(trace_path).replace('.jsonl', '')}")
    except Exception as e:
        print(f"Note: Could not get trace path ({e})")

    print()


# ============================================================================
# Entry Point
# ============================================================================

if __name__ == "__main__":
    try:
        asyncio.run(run_test_agent())
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
        sys.exit(0)
    except Exception as e:
        print(f"\n\nERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
