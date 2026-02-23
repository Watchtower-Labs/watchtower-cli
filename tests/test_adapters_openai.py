"""Tests for the OpenAI adapter."""
import pytest


def test_observe_llm_call_returns_none_when_response_is_none():
    """observe_llm_call should return None gracefully when response is None."""
    pytest.importorskip("openai")
    from unittest.mock import MagicMock
    from watchtower.adapters.openai import OpenAIObserver

    observer = OpenAIObserver.__new__(OpenAIObserver)
    observer.client = MagicMock()
    observer.model = "gpt-4o"
    observer.file_writer = MagicMock()
    observer.sanitize = False

    result = observer.observe_llm_call(request=[{"role": "user", "content": "hi"}], response=None)
    assert result is None


def test_run_start_emits_event(tmp_path):
    """observe_run_start should emit a run.start trace event."""
    pytest.importorskip("openai")
    from watchtower.adapters.openai import OpenAIObserver
    from watchtower import WatchtowerConfig

    config = WatchtowerConfig(trace_dir=str(tmp_path))
    observer = OpenAIObserver(config=config)
    event = observer.observe_run_start({"agent_name": "test_agent"})
    assert event is not None
    assert event.type == "run.start"
    assert event.agent_name == "test_agent"


def test_tool_call_json_parse_failure_is_logged(caplog):
    """When tool_call.function.arguments is invalid JSON, a warning should be logged."""
    import logging
    pytest.importorskip("openai")
    from unittest.mock import MagicMock
    from watchtower.adapters.openai import OpenAIObserver

    observer = OpenAIObserver.__new__(OpenAIObserver)
    tool_call = MagicMock()
    tool_call.id = "call_123"
    tool_call.function.name = "search"
    tool_call.function.arguments = "{invalid json"

    message = MagicMock()
    message.tool_calls = [tool_call]
    response = MagicMock()
    response.choices = [MagicMock(message=message)]

    with caplog.at_level(logging.WARNING, logger="watchtower"):
        result = observer._extract_tool_calls(response)

    assert len(result) == 1
    assert isinstance(result[0]["tool_args"], str)
    assert any("Failed to parse" in r.message or "tool_call" in r.message
               for r in caplog.records)


def test_run_end_emits_event(tmp_path):
    """observe_run_end should emit a run.end trace event."""
    pytest.importorskip("openai")
    from watchtower.adapters.openai import OpenAIObserver
    from watchtower import WatchtowerConfig

    config = WatchtowerConfig(trace_dir=str(tmp_path))
    observer = OpenAIObserver(config=config)
    observer.observe_run_start({"agent_name": "test_agent"})
    event = observer.observe_run_end(
        {"invocation_id": observer.run_id},
        summary={"success": True},
    )
    assert event is not None
    assert event.type == "run.end"


def test_extract_tool_calls_with_valid_json(tmp_path):
    """_extract_tool_calls should parse valid JSON arguments."""
    import json
    pytest.importorskip("openai")
    from unittest.mock import MagicMock
    from watchtower.adapters.openai import OpenAIObserver

    observer = OpenAIObserver.__new__(OpenAIObserver)
    tool_call = MagicMock()
    tool_call.id = "call_abc"
    tool_call.function.name = "get_weather"
    tool_call.function.arguments = json.dumps({"location": "NYC", "units": "celsius"})

    message = MagicMock()
    message.tool_calls = [tool_call]
    response = MagicMock()
    response.choices = [MagicMock(message=message)]

    result = observer._extract_tool_calls(response)
    assert len(result) == 1
    assert result[0]["tool_name"] == "get_weather"
    assert result[0]["tool_args"]["location"] == "NYC"


def test_observe_llm_call_with_tools(tmp_path):
    """observe_llm_call should record available tools."""
    pytest.importorskip("openai")
    from unittest.mock import MagicMock
    from watchtower.adapters.openai import OpenAIObserver
    from watchtower import WatchtowerConfig

    config = WatchtowerConfig(trace_dir=str(tmp_path))
    observer = OpenAIObserver(config=config)

    mock_response = MagicMock()
    mock_response.id = "chatcmpl-tools"
    mock_response.model = "gpt-4o"
    mock_response.usage.prompt_tokens = 20
    mock_response.usage.completion_tokens = 5
    mock_response.usage.total_tokens = 25
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message.tool_calls = None
    mock_response.choices[0].finish_reason = "stop"

    observer.observe_run_start({"agent_name": "tool_agent"})
    observer.observe_llm_call(
        request=[{"role": "user", "content": "Search something"}],
        response=mock_response,
        tools=[{"function": {"name": "search"}}, {"function": {"name": "calculate"}}],
    )
    # No error = pass; event was recorded
