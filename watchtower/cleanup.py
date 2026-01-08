"""Cleanup utilities for Watchtower trace files.

Implements retention policy enforcement for trace files.
"""

import re
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Tuple


# Trace file pattern: {date}_{run_id}.jsonl
TRACE_FILE_PATTERN = re.compile(r"^(\d{4}-\d{2}-\d{2})_([a-zA-Z0-9]+)\.jsonl$")


def get_trace_dir(trace_dir: str = "~/.watchtower/traces") -> Path:
    """Get the trace directory path, expanding user home.

    Args:
        trace_dir: Path to trace directory (may contain ~)

    Returns:
        Resolved Path object
    """
    return Path(trace_dir).expanduser()


def list_expired_traces(
    trace_dir: str = "~/.watchtower/traces",
    retention_days: int = 30,
) -> List[Tuple[Path, str, int]]:
    """List trace files that have exceeded the retention period.

    Args:
        trace_dir: Directory containing trace files
        retention_days: Number of days to retain traces

    Returns:
        List of tuples: (file_path, date_str, size_bytes)
    """
    dir_path = get_trace_dir(trace_dir)

    if not dir_path.exists():
        return []

    cutoff_date = datetime.now() - timedelta(days=retention_days)
    cutoff_str = cutoff_date.strftime("%Y-%m-%d")

    expired: List[Tuple[Path, str, int]] = []

    for entry in dir_path.iterdir():
        if not entry.is_file():
            continue

        match = TRACE_FILE_PATTERN.match(entry.name)
        if not match:
            continue

        date_str = match.group(1)

        # Compare date strings (works because YYYY-MM-DD sorts correctly)
        if date_str < cutoff_str:
            try:
                size = entry.stat().st_size
                expired.append((entry, date_str, size))
            except OSError:
                # File may have been deleted between listing and stat
                continue

    return expired


def cleanup_old_traces(
    trace_dir: str = "~/.watchtower/traces",
    retention_days: int = 30,
    dry_run: bool = False,
) -> Tuple[int, int]:
    """Delete trace files that have exceeded the retention period.

    Args:
        trace_dir: Directory containing trace files
        retention_days: Number of days to retain traces
        dry_run: If True, don't actually delete files

    Returns:
        Tuple of (deleted_count, bytes_freed)
    """
    expired = list_expired_traces(trace_dir, retention_days)

    if not expired:
        return (0, 0)

    deleted_count = 0
    bytes_freed = 0

    for file_path, _, size in expired:
        if dry_run:
            deleted_count += 1
            bytes_freed += size
        else:
            try:
                file_path.unlink()
                deleted_count += 1
                bytes_freed += size
            except OSError:
                # File may have been deleted or become inaccessible
                continue

    return (deleted_count, bytes_freed)


def cleanup_all_traces(
    trace_dir: str = "~/.watchtower/traces",
    dry_run: bool = False,
) -> Tuple[int, int]:
    """Delete all trace files (with confirmation expected from caller).

    Args:
        trace_dir: Directory containing trace files
        dry_run: If True, don't actually delete files

    Returns:
        Tuple of (deleted_count, bytes_freed)
    """
    dir_path = get_trace_dir(trace_dir)

    if not dir_path.exists():
        return (0, 0)

    deleted_count = 0
    bytes_freed = 0

    for entry in dir_path.iterdir():
        if not entry.is_file():
            continue

        match = TRACE_FILE_PATTERN.match(entry.name)
        if not match:
            continue

        try:
            size = entry.stat().st_size
            if not dry_run:
                entry.unlink()
            deleted_count += 1
            bytes_freed += size
        except OSError:
            continue

    return (deleted_count, bytes_freed)


def get_trace_stats(
    trace_dir: str = "~/.watchtower/traces",
) -> dict:
    """Get statistics about trace files.

    Args:
        trace_dir: Directory containing trace files

    Returns:
        Dictionary with stats: total_count, total_size, oldest_date, newest_date
    """
    dir_path = get_trace_dir(trace_dir)

    if not dir_path.exists():
        return {
            "total_count": 0,
            "total_size": 0,
            "oldest_date": None,
            "newest_date": None,
        }

    dates: List[str] = []
    total_size = 0
    total_count = 0

    for entry in dir_path.iterdir():
        if not entry.is_file():
            continue

        match = TRACE_FILE_PATTERN.match(entry.name)
        if not match:
            continue

        try:
            total_size += entry.stat().st_size
            total_count += 1
            dates.append(match.group(1))
        except OSError:
            continue

    return {
        "total_count": total_count,
        "total_size": total_size,
        "oldest_date": min(dates) if dates else None,
        "newest_date": max(dates) if dates else None,
    }


def format_bytes(size: int) -> str:
    """Format byte size in human-readable form.

    Args:
        size: Size in bytes

    Returns:
        Human-readable string (e.g., "1.5 MB")
    """
    if size < 1024:
        return f"{size} B"
    elif size < 1024 * 1024:
        return f"{size / 1024:.1f} KB"
    elif size < 1024 * 1024 * 1024:
        return f"{size / (1024 * 1024):.1f} MB"
    else:
        return f"{size / (1024 * 1024 * 1024):.1f} GB"
