"""Tests for plugin startup behavior."""

from __future__ import annotations

from datetime import datetime, timedelta
from pathlib import Path

from watchtower.plugin import AgentTracePlugin


def test_plugin_cleans_dead_letter_on_start(tmp_path: Path) -> None:
    trace_dir = tmp_path / "traces"
    dead_letter_dir = trace_dir / "dead_letter"
    dead_letter_dir.mkdir(parents=True, exist_ok=True)

    old_dt = datetime.now() - timedelta(days=14)
    old_name = old_dt.strftime("dead_letter_%Y-%m-%d_%H-%M-%S.jsonl")
    old_file = dead_letter_dir / old_name
    old_file.write_text("failed event\n", encoding="utf-8")

    AgentTracePlugin(
        trace_dir=str(trace_dir),
        enable_file=True,
        enable_stdout=False,
        cleanup_dead_letter_on_start=True,
        dead_letter_retention_days=7,
    )

    assert not old_file.exists()
