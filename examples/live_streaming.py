"""
Live streaming with Watchtower CLI.

This example demonstrates how Watchtower streams events in real-time.
"""

import os
from watchtower.sdk import create_for_anthropic


def demonstrate_live_streaming():
    """Demonstrate live event streaming."""

    # Check if live streaming is enabled (set by watchtower tail command)
    is_live = os.getenv("WATCHTOWER_LIVE", "0") == "1"
    run_id = os.getenv("WATCHTOWER_RUN_ID", "unknown")

    print("=== Watchtower Live Streaming ===")
    print(f"Live Mode: {'✅ ENABLED' if is_live else '❌ DISABLED'}")
    print(f"Run ID: {run_id}")
    print()

    if is_live:
        print("Events are being streamed to stdout in real-time.")
        print("Watchtower CLI will display them as they occur.")
    else:
        print("Events are being written to trace files.")
        print("Use 'watchtower tail' to enable live streaming.")
    print()

    # Create observer
    observer = create_for_anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    # Make observed LLM call
    print("Making an observed LLM call...\n")

    try:
        response = observer.observe_llm_call([
            {"role": "user", "content": "Hello! This is a live streaming demo."}
        ])

        print(f"Response: {response.content[0].text}")
        print(f"Model: {response.model}")
        print(f"Tokens: {response.usage.input_tokens} in, {response.usage.output_tokens} out")
    except Exception as e:
        print(f"Error: {e}")

    print("\n=== Viewing Live Streams ===")
    print("To see live event streaming, run:")
    print()
    print("  watchtower tail python examples/live_streaming.py")
    print()
    print("This will:")
    print("  1. Set WATCHTOWER_LIVE=1 environment variable")
    print("  2. Set WATCHTOWER_RUN_ID environment variable")
    print("  3. Capture stdout in real-time")
    print("  4. Display events as they occur")
    print()

    # Demonstrate event types that would be streamed
    print("=== Event Types Streamed ===")
    event_types = [
        "run.start - Agent invocation begins",
        "llm.request - LLM call initiated",
        "llm.response - LLM response received",
        "tool.start - Tool execution begins",
        "tool.end - Tool execution completes",
        "tool.error - Tool execution failed",
        "run.end - Agent invocation completes",
    ]

    for event_type in event_types:
        print(f"  • {event_type}")

    print("\n=== Multi-Agent Live Streaming ===")
    print("For multi-agent workflows, Watchtower also streams:")
    print("  • agent.transfer - Agent handoff events")
    print("  • state.change - Agent state modifications")
    print()
    print("Example multi-agent streaming:")
    print("  watchtower tail python examples/multi_agent_parallel.py")


def show_keyboard_shortcuts():
    """Show keyboard shortcuts for live viewing."""

    print("\n=== Keyboard Shortcuts ===")
    shortcuts = [
        ("↑ / k", "Navigate up"),
        ("↓ / j", "Navigate down"),
        ("Enter", "Expand event details"),
        ("Esc", "Back to list"),
        ("q", "Quit"),
        ("PageUp", "Previous page"),
        ("PageDown", "Next page"),
        ("Home", "Jump to start"),
        ("End", "Jump to end"),
        ("/", "Search"),
        ("*", "Bookmark"),
    ]

    for key, action in shortcuts:
        print(f"  {key:10} - {action}")


def show_rate_limiting():
    """Show rate limiting information."""

    print("\n=== Rate Limiting ===")
    print("Live streaming includes rate limiting to prevent UI overwhelm:")
    print()
    print("Default settings:")
    print("  • Max events/second: 120")
    print("  • Burst capacity: 30 events")
    print()
    print("Customize with:")
    print("  watchtower tail --max-events-per-second 200 --burst-size 50 python script.py")
    print()
    print("This helps with:")
    print("  • High-frequency event generation")
    print("  • Large multi-agent parallel workflows")
    print("  • Rapid tool execution")


def show_troubleshooting():
    """Show troubleshooting tips for live streaming."""

    print("\n=== Troubleshooting ===")

    issues = [
        ("Events not appearing",
         "1. Ensure WATCHTOWER_LIVE=1 is set\n"
         "2. Check script imports observer methods\n"
         "3. Verify PYTHONUNBUFFERED=1 (automatic with CLI)"),

        ("Stuttering or lag",
         "1. Reduce max-events-per-second\n"
         "2. Use minimal theme\n"
         "3. Check terminal performance"),

        ("Colors not displaying",
         "1. Try different theme (dark/light/minimal)\n"
         "2. Check terminal ANSI support\n"
         "3. Use minimal theme for plain terminals"),

        ("Process not terminating",
         "1. Press 'q' to quit\n"
         "2. Use Ctrl+C if needed\n"
         "3. Check for zombie processes"),
    ]

    for symptom, solutions in issues:
        print(f"\n{symptom}:")
        print(f"  {solutions}")


if __name__ == "__main__":
    print("╔══════════════════════════════════════════════════╗")
    print("║         Watchtower Live Streaming Demo                ║")
    print("╚════════════════════════════════════════════════════╝")
    print()

    # Check for API key
    if not os.getenv("ANTHROPIC_API_KEY"):
        print("⚠️  Warning: ANTHROPIC_API_KEY not set")
        print("Set it with: export ANTHROPIC_API_KEY=your-key\n")

    # Run demonstrations
    demonstrate_live_streaming()
    show_keyboard_shortcuts()
    show_rate_limiting()
    show_troubleshooting()

    print("\n=== Resources ===")
    print("Documentation: https://github.com/Watchtower-Labs/watchtower-cli/blob/main/docs/")
    print("Examples: https://github.com/Watchtower-Labs/watchtower-cli/tree/main/examples/")
    print("Issues: https://github.com/Watchtower-Labs/watchtower-cli/issues")
