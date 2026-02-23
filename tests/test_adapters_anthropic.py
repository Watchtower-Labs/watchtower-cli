"""Tests for Anthropic observer adapter."""
import json
import pytest
from unittest.mock import MagicMock, patch

anthropic = pytest.importorskip("anthropic", reason="anthropic package not installed")


def make_mock_anthropic_response(tool_use=False, input_tokens=10, output_tokens=20):
    """Build a mock Anthropic Message response."""
    response = MagicMock()
    response.id = "msg_test123"
    response.stop_reason = "tool_use" if tool_use else "end_turn"
    response.usage.input_tokens = input_tokens
    response.usage.output_tokens = output_tokens

    if tool_use:
        block = MagicMock()
        block.type = "tool_use"
        block.id = "toolu_abc"
        block.name = "search_web"
        block.input = {"query": "test search"}
        response.content = [block]
    else:
        block = MagicMock()
        block.type = "text"
        block.text = "Hello!"
        response.content = [block]

    # Support model_dump for sanitization
    response.model_dump.return_value = {
        "id": "msg_test123",
        "stop_reason": response.stop_reason,
        "usage": {"input_tokens": input_tokens, "output_tokens": output_tokens},
    }

    return response


def test_observe_llm_call_returns_response(tmp_path):
    """observe_llm_call should call the API and return the response."""
    from watchtower.adapters.anthropic import AnthropicObserver

    mock_response = make_mock_anthropic_response()

    with patch("anthropic.Anthropic") as MockClient:
        mock_client = MagicMock()
        MockClient.return_value = mock_client
        mock_client.messages.create.return_value = mock_response

        observer = AnthropicObserver(api_key="sk-test", trace_dir=str(tmp_path))
        result = observer.observe_llm_call([{"role": "user", "content": "Hello"}])

    assert result is mock_response
    mock_client.messages.create.assert_called_once()


def test_observe_llm_call_writes_trace_file(tmp_path):
    """observe_llm_call should write an LLM event to the trace file."""
    from watchtower.adapters.anthropic import AnthropicObserver

    mock_response = make_mock_anthropic_response()

    with patch("anthropic.Anthropic") as MockClient:
        mock_client = MagicMock()
        MockClient.return_value = mock_client
        mock_client.messages.create.return_value = mock_response

        observer = AnthropicObserver(api_key="sk-test", trace_dir=str(tmp_path))
        observer.observe_llm_call([{"role": "user", "content": "Hello"}])
        observer.flush()

    trace_files = list(tmp_path.glob("*.jsonl"))
    assert len(trace_files) >= 1, "Expected at least one trace file"


def test_token_counts_tracked(tmp_path):
    """Token counts should be extracted from the Anthropic response."""
    from watchtower.adapters.anthropic import AnthropicObserver

    mock_response = make_mock_anthropic_response(input_tokens=50, output_tokens=150)

    with patch("anthropic.Anthropic") as MockClient:
        mock_client = MagicMock()
        MockClient.return_value = mock_client
        mock_client.messages.create.return_value = mock_response

        observer = AnthropicObserver(api_key="sk-test", trace_dir=str(tmp_path))
        observer.observe_llm_call([{"role": "user", "content": "Count tokens"}])
        observer.flush()

    trace_files = list(tmp_path.glob("*.jsonl"))
    assert len(trace_files) >= 1
    events = [
        json.loads(line)
        for line in trace_files[0].read_text().strip().split("\n")
        if line.strip()
    ]
    llm_events = [e for e in events if "input_tokens" in e]
    assert len(llm_events) >= 1, "Expected an event with input_tokens"
    assert llm_events[0]["input_tokens"] == 50
    assert llm_events[0]["output_tokens"] == 150


def test_api_error_propagates(tmp_path):
    """API errors from Anthropic should propagate to the caller."""
    from watchtower.adapters.anthropic import AnthropicObserver

    with patch("anthropic.Anthropic") as MockClient:
        mock_client = MagicMock()
        MockClient.return_value = mock_client
        mock_client.messages.create.side_effect = RuntimeError("API down")

        observer = AnthropicObserver(api_key="sk-test", trace_dir=str(tmp_path))

        with pytest.raises(RuntimeError, match="API down"):
            observer.observe_llm_call([{"role": "user", "content": "Hello"}])


def test_run_start_emits_event(tmp_path):
    """observe_run_start should write a run.start event."""
    from watchtower.adapters.anthropic import AnthropicObserver

    observer = AnthropicObserver(api_key="sk-test", trace_dir=str(tmp_path))
    context = {"agent_name": "my-anthropic-agent"}
    observer.observe_run_start(context)
    observer.flush()

    trace_files = list(tmp_path.glob("*.jsonl"))
    assert len(trace_files) >= 1
    events = [
        json.loads(line)
        for line in trace_files[0].read_text().strip().split("\n")
        if line.strip()
    ]
    run_starts = [e for e in events if e.get("type") == "run.start"]
    assert len(run_starts) >= 1
    assert run_starts[0].get("agent_name") == "my-anthropic-agent"


def test_observe_llm_call_returns_none_when_response_is_none():
    """observe_llm_call should return None gracefully when response is None."""
    anthropic = pytest.importorskip("anthropic")
    from unittest.mock import MagicMock
    from watchtower.adapters.anthropic import AnthropicObserver

    observer = AnthropicObserver.__new__(AnthropicObserver)
    observer.client = MagicMock()
    observer.model = "claude-3-5-sonnet-20241022"
    observer.file_writer = MagicMock()
    observer.sanitize = False

    result = observer.observe_llm_call(request=[{"role": "user", "content": "hi"}], response=None)
    assert result is None
