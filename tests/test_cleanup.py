"""Tests for trace and dead-letter cleanup utilities."""

from __future__ import annotations

from datetime import datetime, timedelta
from pathlib import Path

from watchtower.cleanup import (
    list_expired_traces,
    cleanup_dead_letter_files,
)


def _write(path: Path, content: str = "test\n") -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def test_list_expired_traces_accepts_hyphen_and_underscore_run_ids(tmp_path: Path) -> None:
    trace_dir = tmp_path / "traces"
    old_date = (datetime.now() - timedelta(days=40)).strftime("%Y-%m-%d")
    new_date = datetime.now().strftime("%Y-%m-%d")

    _write(trace_dir / f"{old_date}_abc-def_123.jsonl")
    _write(trace_dir / f"{new_date}_fresh-run_456.jsonl")
    _write(trace_dir / f"{old_date}_invalid.run.id.jsonl")

    expired = list_expired_traces(str(trace_dir), retention_days=30)
    expired_names = {item[0].name for item in expired}

    assert f"{old_date}_abc-def_123.jsonl" in expired_names
    assert f"{new_date}_fresh-run_456.jsonl" not in expired_names
    assert f"{old_date}_invalid.run.id.jsonl" not in expired_names


def test_cleanup_dead_letter_files_respects_retention(tmp_path: Path) -> None:
    trace_dir = tmp_path / "traces"
    dead_letter_dir = trace_dir / "dead_letter"

    old_dt = datetime.now() - timedelta(days=10)
    new_dt = datetime.now()

    old_name = old_dt.strftime("dead_letter_%Y-%m-%d_%H-%M-%S.jsonl")
    new_name = new_dt.strftime("dead_letter_%Y-%m-%d_%H-%M-%S.jsonl")

    _write(dead_letter_dir / old_name, "old\n")
    _write(dead_letter_dir / new_name, "new\n")

    deleted_count, bytes_freed = cleanup_dead_letter_files(
        str(trace_dir),
        retention_days=7,
        dry_run=False,
    )

    assert deleted_count == 1
    assert bytes_freed > 0
    assert not (dead_letter_dir / old_name).exists()
    assert (dead_letter_dir / new_name).exists()
