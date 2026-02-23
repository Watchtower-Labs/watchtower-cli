"""Tests for Google ADK observer adapter."""
import json
import pytest


def test_google_adk_observer_emits_run_start(tmp_path):
    """GoogleADKObserver should emit run.start on observe_run_start."""
    try:
        from watchtower.adapters.google_adk import GoogleADKObserver
    except ImportError:
        pytest.skip("google-adk not installed")

    observer = GoogleADKObserver(trace_dir=str(tmp_path))
    # GoogleADKObserver.observe_run_start takes a context dict
    context = {"agent_name": "test_agent", "run_id": "run123", "invocation_id": "inv456"}
    observer.observe_run_start(context)
    if observer.file_writer:
        observer.file_writer.flush()

    trace_files = list(tmp_path.glob("*.jsonl"))
    assert len(trace_files) >= 1
    events = [
        json.loads(line)
        for line in trace_files[0].read_text().strip().split("\n")
        if line.strip()
    ]
    run_starts = [e for e in events if e.get("type") == "run.start"]
    assert len(run_starts) >= 1


def test_google_adk_observer_emits_run_end(tmp_path):
    """GoogleADKObserver should emit run.end on observe_run_end."""
    try:
        from watchtower.adapters.google_adk import GoogleADKObserver
    except ImportError:
        pytest.skip("google-adk not installed")

    observer = GoogleADKObserver(trace_dir=str(tmp_path))
    start_context = {
        "agent_name": "test_agent",
        "run_id": "run123",
        "invocation_id": "inv456",
    }
    observer.observe_run_start(start_context)
    end_context = {"run_id": "run123", "output": "Done", "error": None}
    observer.observe_run_end(end_context)
    if observer.file_writer:
        observer.file_writer.flush()

    trace_files = list(tmp_path.glob("*.jsonl"))
    assert len(trace_files) >= 1
    events = [
        json.loads(line)
        for line in trace_files[0].read_text().strip().split("\n")
        if line.strip()
    ]
    run_ends = [e for e in events if e.get("type") == "run.end"]
    assert len(run_ends) >= 1


def test_google_adk_observer_init_no_crash(tmp_path):
    """GoogleADKObserver should initialize without errors."""
    try:
        from watchtower.adapters.google_adk import GoogleADKObserver
    except ImportError:
        pytest.skip("google-adk not installed")

    observer = GoogleADKObserver(trace_dir=str(tmp_path), enable_file=True)
    assert observer is not None
    assert observer.trace_dir is not None


def test_google_adk_observer_sanitize_flag(tmp_path):
    """GoogleADKObserver should accept sanitize=True/False flag."""
    try:
        from watchtower.adapters.google_adk import GoogleADKObserver
    except ImportError:
        pytest.skip("google-adk not installed")

    observer = GoogleADKObserver(trace_dir=str(tmp_path), sanitize=True)
    assert observer.sanitize is True

    observer_no_sanitize = GoogleADKObserver(trace_dir=str(tmp_path), sanitize=False)
    assert observer_no_sanitize.sanitize is False
