#!/usr/bin/env python3
"""
Example: Using Watchtower with OpenAI GPT.

This example demonstrates how to add observability to OpenAI
GPT API calls using the Watchtower SDK.
"""

import os

# Import Watchtower SDK
from watchtower.sdk import create_for_openai

# Get API key from environment
api_key = os.environ.get("OPENAI_API_KEY")
if not api_key:
    print("Please set OPENAI_API_KEY environment variable")
    exit(1)

# Create observer for OpenAI
observer = create_for_openai(
    api_key=api_key,
    model="gpt-4o",
    trace_dir="./traces",
    enable_stdout=True,
)

print(f"Watchtower run ID: {observer.run_id}")
print("Starting conversation with GPT...")

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
        # Call GPT API with observability
        response = observer.observe_llm_call(messages)

        # Extract assistant response
        assistant_message = response.choices[0].message

        # Display response
        print(f"GPT: {assistant_message.content}")

        # Add assistant message to history
        messages.append({
            "role": "assistant",
            "content": assistant_message.content,
        })

        # Show usage information
        if response.usage:
            print(f"\n[Usage: {response.usage.prompt_tokens} input + {response.usage.completion_tokens} output = {response.usage.total_tokens} total tokens]")

    except Exception as e:
        print(f"\nError: {e}")
        break

print("\nConversation ended. Check ./traces for trace file.")
