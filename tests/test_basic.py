"""Basic tests for watchtower SDK."""

import json
import tempfile
from pathlib import Path
import pytest

from watchtower.models.events import EventType, RunStartEvent
from watchtower.writers.file_writer import FileWriter
from watchtower.writers.stdout_writer import StdoutWriter
from watchtower.collector import EventCollector
from watchtower.utils.sanitization import sanitize_args


def test_event_creation():
    """Test creating event instances."""
    event = RunStartEvent(
        run_id="test123",
        invocation_id="inv_001",
        agent_name="test_agent",
    )

    assert event.type == EventType.RUN_START.value
    assert event.run_id == "test123"
    assert event.agent_name == "test_agent"

    # Test serialization
    event_dict = event.to_dict()
    assert isinstance(event_dict, dict)
    assert event_dict["type"] == EventType.RUN_START.value


def test_file_writer():
    """Test file writer functionality."""
    with tempfile.TemporaryDirectory() as tmpdir:
        writer = FileWriter(trace_dir=tmpdir, buffer_size=2)

        # Write some events
        event1 = {
            "type": "run.start",
            "run_id": "test123",
            "timestamp": 1234567890.0,
        }
        event2 = {
            "type": "llm.request",
            "run_id": "test123",
            "timestamp": 1234567891.0,
        }

        writer.write(event1)
        writer.write(event2)  # Should trigger flush at buffer size
        writer.flush()

        # Verify file was created
        trace_path = writer.get_trace_path()
        assert trace_path is not None
        assert trace_path.exists()

        # Verify content
        with open(trace_path, "r") as f:
            lines = f.readlines()
            assert len(lines) == 2

            # Parse and verify first event
            parsed_event1 = json.loads(lines[0])
            assert parsed_event1["type"] == "run.start"
            assert parsed_event1["run_id"] == "test123"


def test_stdout_writer():
    """Test stdout writer functionality."""
    import io

    # Create a string buffer to capture output
    output = io.StringIO()
    writer = StdoutWriter(stream=output)

    # Write an event
    event = {
        "type": "tool.start",
        "run_id": "test123",
        "tool_name": "search",
        "timestamp": 1234567890.0,
    }

    writer.write(event)
    writer.flush()

    # Get output and parse
    output_str = output.getvalue()
    lines = output_str.strip().split("\n")
    assert len(lines) == 1

    # Parse JSON-RPC message
    message = json.loads(lines[0])
    assert message["jsonrpc"] == "2.0"
    assert message["method"] == "tool.start"
    assert message["params"]["run_id"] == "test123"


def test_event_collector():
    """Test event collector statistics."""
    collector = EventCollector()

    # Track some events
    collector.track_llm_call(tokens=100)
    collector.track_llm_call(tokens=150)
    collector.track_tool_call("search_web")
    collector.track_tool_call("write_file")
    collector.track_tool_call("search_web")  # Duplicate
    collector.track_error()

    # Get summary
    summary = collector.get_summary()

    assert summary["llm_calls"] == 2
    assert summary["tool_calls"] == 3
    assert summary["total_tokens"] == 250
    assert summary["errors"] == 1
    assert set(summary["tools_used"]) == {"search_web", "write_file"}

    # Test reset
    collector.reset()
    summary_after_reset = collector.get_summary()
    assert summary_after_reset["llm_calls"] == 0
    assert summary_after_reset["tool_calls"] == 0


def test_sanitize_args():
    """Test argument sanitization."""
    args = {
        "query": "search term",
        "api_key": "secret_key_123",
        "password": "my_password",
        "username": "john_doe",
        "nested": {
            "token": "bearer_token",
            "data": "public_data",
        },
    }

    sanitized = sanitize_args(args)

    # Check sensitive fields are redacted
    assert sanitized["api_key"] == "[REDACTED]"
    assert sanitized["password"] == "[REDACTED]"
    assert sanitized["nested"]["token"] == "[REDACTED]"

    # Check non-sensitive fields remain
    assert sanitized["query"] == "search term"
    assert sanitized["username"] == "john_doe"
    assert sanitized["nested"]["data"] == "public_data"


def test_create_event():
    """Test event creation via collector."""
    collector = EventCollector()

    event = collector.create_event(
        type="llm.request",
        run_id="test123",
        model="gemini-2.0-flash",
        message_count=3,
    )

    assert event["type"] == "llm.request"
    assert event["run_id"] == "test123"
    assert event["model"] == "gemini-2.0-flash"
    assert event["message_count"] == 3


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
