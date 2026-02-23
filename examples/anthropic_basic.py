#!/usr/bin/env python3
"""
Example: Using Watchtower with Anthropic Claude.

This example demonstrates how to add observability to Anthropic
Claude API calls using the Watchtower SDK.
"""

import os

# Import Watchtower SDK
from watchtower.sdk import create_for_anthropic

# Get API key from environment
api_key = os.environ.get("ANTHROPIC_API_KEY")
if not api_key:
    print("Please set ANTHROPIC_API_KEY environment variable")
    exit(1)

# Create observer for Anthropic
observer = create_for_anthropic(
    api_key=api_key,
    model="claude-sonnet-4-20250514",
    trace_dir="./traces",
    enable_stdout=True,
)

print(f"Watchtower run ID: {observer.run_id}")
print("Starting conversation with Claude...")

# Simple conversation loop
messages = []

while True:
    # Get user input
    user_input = input("\nYou: ").strip()
    if user_input.lower() in ['exit', 'quit']:
        break

    # Add user message
    messages.append({"role": "user", "content": user_input})

    try:
        # Call Claude API with observability
        response = observer.observe_llm_call(messages)

        # Extract assistant response
        assistant_message = response.content[0]

        # Display response
        print(f"Claude: {assistant_message.text}")

        # Add assistant message to history
        messages.append({
            "role": "assistant",
            "content": assistant_message.text,
        })

        # Show usage information
        if response.usage:
            print(f"\n[Usage: {response.usage.input_tokens} input + {response.usage.output_tokens} output = {response.usage.input_tokens + response.usage.output_tokens} total tokens]")

    except Exception as e:
        print(f"\nError: {e}")
        break

print("\nConversation ended. Check ./traces for the trace file.")
