#!/usr/bin/env python3
"""Quick verification that SDK and CLI are properly set up."""

import sys

print("Verifying Watchtower setup...")
print("=" * 70)

# Check Python version
print(f"✓ Python version: {sys.version}")

# Check watchtower SDK
try:
    from watchtower import AgentTracePlugin
    print("✓ Watchtower SDK imported successfully")
except ImportError as e:
    print(f"✗ Watchtower SDK import failed: {e}")
    sys.exit(1)

# Check Google ADK
try:
    from google.adk.agents import Agent
    from google.adk.runners import InMemoryRunner
    print("✓ Google ADK imported successfully")
except ImportError as e:
    print(f"✗ Google ADK import failed: {e}")
    sys.exit(1)

# Check environment detection
import os
is_live = os.environ.get("AGENTTRACE_LIVE") == "1"
run_id = os.environ.get("AGENTTRACE_RUN_ID")

print(f"✓ Environment variables:")
print(f"  - AGENTTRACE_LIVE: {os.environ.get('AGENTTRACE_LIVE', 'not set')}")
print(f"  - AGENTTRACE_RUN_ID: {os.environ.get('AGENTTRACE_RUN_ID', 'not set')}")
print(f"  - Live mode detected: {is_live}")

# Test plugin creation
try:
    plugin = AgentTracePlugin(
        enable_stdout=is_live,
        run_id=run_id,
    )
    print("✓ AgentTracePlugin created successfully")
except Exception as e:
    print(f"✗ Plugin creation failed: {e}")
    sys.exit(1)

print("=" * 70)
print("All checks passed! Setup is ready.")
print()
print("Next steps:")
print("  1. Run the test agent: python test_agent.py")
print("  2. View trace: watchtower show last")
print("  3. Try live tail: watchtower tail python test_agent.py")
