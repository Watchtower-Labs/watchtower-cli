"""
Basic Watchtower usage patterns.

This example demonstrates different ways to use Watchtower SDK.
"""

import os

from watchtower.sdk import Watchtower, create_for_anthropic, create_for_openai

# Example 1: Auto-detection
print("=== Example 1: Auto-detection ===\n")

observer = Watchtower.create_observer(
    trace_dir="./traces",
    enable_stdout=True,
)

print(f"Framework: {observer.get_framework()}")
print(f"Run ID: {observer.run_id}")

# Example 2: Explicit Anthropic observer
print("\n=== Example 2: Anthropic Observer ===\n")

anthropic_observer = create_for_anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

print(f"Framework: {anthropic_observer.get_framework()}")
print(f"Model: {anthropic_observer.model}")

# Example 3: Explicit OpenAI observer
print("\n=== Example 3: OpenAI Observer ===\n")

openai_observer = create_for_openai(api_key=os.getenv("OPENAI_API_KEY"), model="gpt-4o")

print(f"Framework: {openai_observer.get_framework()}")
print(f"Model: {openai_observer.model}")

# Example 4: Making an observed LLM call
print("\n=== Example 4: Making an Observed LLM Call ===\n")

api_key = os.getenv("ANTHROPIC_API_KEY")
if not api_key:
    print("⚠️  Warning: ANTHROPIC_API_KEY not set")
    print("Set it with: export ANTHROPIC_API_KEY=your-key\n")
else:
    observer = create_for_anthropic(api_key=api_key)

    try:
        response = observer.observe_llm_call([
            {"role": "user", "content": "Hello! Can you help me?"}
        ])

        print(f"Response: {response.content[0].text}")
        print(f"Tokens: {response.usage.input_tokens} input, {response.usage.output_tokens} output")
    except Exception as e:
        print(f"Error: {e}")

# Example 5: Configuration options
print("\n=== Example 5: Configuration Options ===\n")

config_observer = create_for_anthropic(
    api_key=os.getenv("ANTHROPIC_API_KEY"),
    model="claude-sonnet-4-20250514",
    trace_dir="./custom_traces",
    enable_file=True,
    enable_stdout=False,
)

print("Configuration:")
print(f"  Trace Directory: {config_observer.trace_dir}")
print(f"  Enable File: {config_observer.enable_file}")
print(f"  Enable Stdout: {config_observer.enable_stdout}")

# Example 6: Observing tool calls (requires google-adk)
print("\n=== Example 6: Observing Tool Calls ===\n")

try:
    from watchtower.sdk import create_for_google_adk

    google_adk_plugin = create_for_google_adk(
        trace_dir="./traces",
        enable_stdout=True,
    )

    # Tool calls are automatically traced when using Google ADK
    print("Tool calls will be traced automatically when using Google ADK agents")
    print("Run ID:", google_adk_plugin.run_id)
except ImportError:
    print("Google ADK not installed — skipping. Install with: pip install watchtower-adk[adk]")

print("\n=== Summary ===")
print("Watchtower supports multiple observation patterns:")
print("  1. Auto-detection (detects installed framework)")
print("  2. Explicit framework selection")
print("  3. Configuration options (trace_dir, enable_file, enable_stdout)")
print("  4. Automatic LLM call tracing")
print("  5. Automatic tool call tracing (Google ADK)")
print("\nFor more examples, see:")
print("  - anthropic_basic.py (Anthropic Claude)")
print("  - openai_basic.py (OpenAI GPT)")
print("  - simple_agent.py (Google ADK single agent)")
print("  - multi_agent_*.py (Google ADK multi-agent patterns)")
