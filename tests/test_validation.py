"""
Tests for validation utilities.
"""

import os
import tempfile
from watchtower.utils.validation import (
    validate_run_id,
    sanitize_run_id,
    validate_trace_dir,
    validate_python_version,
    validate_environment_variables,
)


def test_validate_run_id_valid_cases():
    """Test valid run IDs."""
    assert validate_run_id('abc123')
    assert validate_run_id('test-run_42')
    assert validate_run_id('Run_123')
    assert validate_run_id('a')
    assert validate_run_id('a' * 32)  # Max length


def test_validate_run_id_invalid_cases():
    """Test invalid run IDs."""
    assert not validate_run_id('run; rm -rf /')
    assert not validate_run_id('../../etc/passwd')
    assert not validate_run_id('test$(whoami)')
    assert not validate_run_id('test `command`')
    assert not validate_run_id('')  # Empty
    assert not validate_run_id('a' * 33)  # Too long
    assert not validate_run_id('test/run')  # Contains slash
    assert not validate_run_id('test.run')  # Contains dot


def test_sanitize_run_id_removes_invalid_chars():
    """Test sanitization removes invalid characters."""
    assert sanitize_run_id('test;run') == 'testrun'
    assert sanitize_run_id('test/run') == 'testrun'
    assert sanitize_run_id('test run') == 'testrun'
    assert sanitize_run_id('test`run`') == 'testrun'


def test_sanitize_run_id_preserves_valid_ids():
    """Test sanitization preserves already valid IDs."""
    assert sanitize_run_id('valid_123') == 'valid_123'
    assert sanitize_run_id('abc123') == 'abc123'
    assert sanitize_run_id('test-run_42') == 'test-run_42'


def test_sanitize_run_id_truncates_long_ids():
    """Test sanitization truncates to max length."""
    long_id = 'a' * 50
    sanitized = sanitize_run_id(long_id)
    assert sanitized is not None
    assert len(sanitized) == 32  # Max length


def test_sanitize_run_id_returns_none_for_empty():
    """Test sanitization returns None for empty result."""
    assert sanitize_run_id(';;;') is None
    assert sanitize_run_id('...') is None


def test_validate_trace_dir_within_base():
    """Test valid trace directory within base."""
    with tempfile.TemporaryDirectory() as tmpdir:
        base_dir = os.path.join(tmpdir, 'base')
        os.makedirs(base_dir)
        trace_dir = os.path.join(base_dir, 'traces')
        os.makedirs(trace_dir)

        assert validate_trace_dir(trace_dir, base_dir)


def test_validate_trace_dir_deep_nesting():
    """Test deeply nested trace directory is valid."""
    with tempfile.TemporaryDirectory() as tmpdir:
        base_dir = os.path.join(tmpdir, 'base')
        os.makedirs(base_dir)
        trace_dir = os.path.join(base_dir, 'level1', 'level2', 'level3')
        os.makedirs(trace_dir)

        assert validate_trace_dir(trace_dir, base_dir)


def test_validate_trace_dir_directory_traversal():
    """Test directory traversal is blocked."""
    with tempfile.TemporaryDirectory() as tmpdir:
        base_dir = os.path.join(tmpdir, 'base')
        os.makedirs(base_dir)
        trace_dir = os.path.join(base_dir, '..', 'etc')

        assert not validate_trace_dir(trace_dir, base_dir)


def test_validate_trace_dir_symlink_attack():
    """Test symlink escape is blocked."""
    with tempfile.TemporaryDirectory() as tmpdir:
        base_dir = os.path.join(tmpdir, 'base')
        os.makedirs(base_dir)

        # Create a symlink pointing outside base
        outside_dir = os.path.join(tmpdir, 'outside')
        os.makedirs(outside_dir)
        trace_dir = os.path.join(base_dir, 'symlink')
        os.symlink(outside_dir, trace_dir)

        assert not validate_trace_dir(trace_dir, base_dir)


def test_validate_trace_dir_absolute_path_outside():
    """Test absolute path outside base is blocked."""
    with tempfile.TemporaryDirectory() as tmpdir:
        base_dir = os.path.join(tmpdir, 'base')
        os.makedirs(base_dir)
        trace_dir = os.path.join(tmpdir, 'outside')

        assert not validate_trace_dir(trace_dir, base_dir)


def test_validate_python_version_valid():
    """Test valid Python versions."""
    assert validate_python_version('python3')
    assert validate_python_version('python3.9')
    assert validate_python_version('python3.10')
    assert validate_python_version('python3.11')
    assert validate_python_version('python3.12')


def test_validate_python_version_invalid():
    """Test invalid Python versions."""
    assert not validate_python_version('python2.7')
    assert not validate_python_version('python')
    assert not validate_python_version('/bin/sh')
    assert not validate_python_version('python3.13')
    assert not validate_python_version('python3.8')
    assert not validate_python_version('python3; rm -rf /')


def test_validate_environment_variables_all_valid():
    """Test validation with all valid environment variables."""
    with tempfile.TemporaryDirectory() as tmpdir:
        base_dir = os.path.join(tmpdir, 'base')
        trace_dir = os.path.join(base_dir, 'traces')
        os.makedirs(trace_dir)

        os.environ['WATCHTOWER_RUN_ID'] = 'test-run-123'
        os.environ['WATCHTOWER_TRACE_DIR'] = trace_dir
        os.environ['WATCHTOWER_BASE_DIR'] = base_dir
        os.environ['WATCHTOWER_DEFAULT_PYTHON'] = 'python3.11'

        errors, is_valid = validate_environment_variables()

        assert is_valid
        assert len(errors) == 0

        # Cleanup
        del os.environ['WATCHTOWER_RUN_ID']
        del os.environ['WATCHTOWER_TRACE_DIR']
        del os.environ['WATCHTOWER_BASE_DIR']
        del os.environ['WATCHTOWER_DEFAULT_PYTHON']


def test_validate_environment_variables_invalid_run_id():
    """Test validation with invalid run ID."""
    os.environ['WATCHTOWER_RUN_ID'] = 'test; rm -rf /'

    errors, is_valid = validate_environment_variables()

    assert not is_valid
    assert len(errors) > 0
    assert any('Invalid WATCHTOWER_RUN_ID' in e for e in errors)

    # Cleanup
    del os.environ['WATCHTOWER_RUN_ID']


def test_validate_environment_variables_invalid_trace_dir():
    """Test validation with invalid trace directory."""
    with tempfile.TemporaryDirectory() as tmpdir:
        base_dir = os.path.join(tmpdir, 'base')
        os.makedirs(base_dir)

        # Create trace dir outside base
        trace_dir = os.path.join(tmpdir, 'outside')
        os.makedirs(trace_dir)

        os.environ['WATCHTOWER_TRACE_DIR'] = trace_dir
        os.environ['WATCHTOWER_BASE_DIR'] = base_dir

        errors, is_valid = validate_environment_variables()

        assert not is_valid
        assert len(errors) > 0
        assert any('Invalid WATCHTOWER_TRACE_DIR' in e for e in errors)

        # Cleanup
        del os.environ['WATCHTOWER_TRACE_DIR']
        del os.environ['WATCHTOWER_BASE_DIR']


def test_validate_environment_variables_invalid_python_version():
    """Test validation with invalid Python version."""
    os.environ['WATCHTOWER_DEFAULT_PYTHON'] = '/bin/sh'

    errors, is_valid = validate_environment_variables()

    assert not is_valid
    assert len(errors) > 0
    assert any('Invalid WATCHTOWER_DEFAULT_PYTHON' in e for e in errors)

    # Cleanup
    del os.environ['WATCHTOWER_DEFAULT_PYTHON']
