"""Configuration management for watchtower SDK."""

import os
from dataclasses import dataclass
from typing import Optional
from pathlib import Path


@dataclass
class WatchtowerConfig:
    """Configuration for watchtower SDK.

    Configuration is loaded from (in priority order):
    1. Constructor arguments
    2. Environment variables
    3. Config file (~/.watchtower/config.yaml)
    4. Defaults
    """

    trace_dir: str = "~/.watchtower/traces"
    retention_days: int = 30
    buffer_size: int = 10
    sanitize_args: bool = True
    max_response_preview: int = 500
    enable_file: bool = True
    enable_stdout: bool = False

    @classmethod
    def from_environment(cls) -> "WatchtowerConfig":
        """Create configuration from environment variables.

        Environment variables:
            AGENTTRACE_DIR: Override trace directory
            AGENTTRACE_LIVE: Enable stdout streaming
            AGENTTRACE_DISABLE: Disable all tracing

        Returns:
            Configuration instance
        """
        # Check if tracing is disabled
        if os.environ.get("AGENTTRACE_DISABLE") == "1":
            return cls(enable_file=False, enable_stdout=False)

        # Load from environment
        trace_dir = os.environ.get("AGENTTRACE_DIR", "~/.watchtower/traces")
        enable_stdout = os.environ.get("AGENTTRACE_LIVE") == "1"

        return cls(
            trace_dir=trace_dir,
            enable_stdout=enable_stdout,
        )

    @classmethod
    def load_from_file(cls, config_path: Optional[str] = None) -> "WatchtowerConfig":
        """Load configuration from YAML file.

        Args:
            config_path: Path to config file (defaults to ~/.watchtower/config.yaml)

        Returns:
            Configuration instance
        """
        if config_path is None:
            config_path = str(Path("~/.watchtower/config.yaml").expanduser())

        config_file = Path(config_path).expanduser()

        if not config_file.exists():
            # No config file, use defaults
            return cls()

        try:
            import yaml

            with open(config_file, "r") as f:
                config_data = yaml.safe_load(f)

            return cls(**config_data)
        except ImportError:
            # YAML not available, use defaults
            return cls()
        except Exception as e:
            print(f"Warning: Failed to load config from {config_file}: {e}")
            return cls()
