"""Advanced sanitization tests."""
from watchtower.utils.sanitization import sanitize_args


def test_openai_new_key_format_redacted():
    """New sk-proj-* OpenAI key format should be redacted."""
    data = {"api_key": "sk-proj-abcdef1234567890ABCDEF1234567890abcdef12"}
    result = sanitize_args(data)
    assert result["api_key"] == "[REDACTED]"


def test_openai_classic_key_format_redacted():
    """Classic sk-* OpenAI key format should still be redacted."""
    data = {"value": "sk-abcdefghijklmnopqrstuvwxyz123456"}
    result = sanitize_args(data)
    assert result["value"] == "[REDACTED]"


def test_url_query_string_credentials_redacted():
    """Credentials embedded in URL query strings should be redacted."""
    data = {"url": "https://api.example.com/data?api_key=secret123&user=bob"}
    result = sanitize_args(data)
    assert "secret123" not in str(result)


def test_nested_dict_deep_sanitization():
    """Deeply nested dicts should have sensitive values redacted."""
    data = {
        "config": {
            "level1": {
                "level2": {
                    "level3": {
                        "api_key": "sk-verysecretkey123456789"
                    }
                }
            }
        }
    }
    result = sanitize_args(data)
    assert result["config"]["level1"]["level2"]["level3"]["api_key"] == "[REDACTED]"


def test_list_sanitization():
    """Lists containing dicts should be sanitized recursively."""
    data = {
        "messages": [
            {"role": "user", "content": "hello"},
            {"role": "system", "api_key": "sk-secret123456789012345"},
        ]
    }
    result = sanitize_args(data)
    assert result["messages"][1]["api_key"] == "[REDACTED]"
    assert result["messages"][0]["content"] == "hello"
