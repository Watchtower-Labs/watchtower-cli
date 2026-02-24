# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- GitHub Actions CI/CD workflow for automated testing
- Issue templates for bug reports and feature requests
- Pull request template
- Code of Conduct (Contributor Covenant 2.1)
- Security policy with vulnerability reporting guidelines
- Comprehensive testing documentation

## [0.1.0] - 2026-01-05

### Added

#### Python SDK (`watchtower-adk`)
- `AgentTracePlugin` for Google ADK integration
- 9 event types: `run.start`, `run.end`, `llm.request`, `llm.response`, `tool.start`, `tool.end`, `tool.error`, `state.change`, `agent.transfer`
- `FileWriter` for JSONL trace file output with buffering
- `StdoutWriter` for JSON-RPC 2.0 live streaming
- `EventCollector` for statistics aggregation
- Automatic argument sanitization for sensitive data
- Configuration via environment variables and YAML files
- Support for Python 3.9, 3.10, 3.11, 3.12

#### CLI (`@watchtower/cli`)
- `watchtower show [trace]` - View saved trace files with interactive navigation
- `watchtower tail <script>` - Live stream events from running agents
- `watchtower list` - Browse recent trace files
- `watchtower config` - Manage CLI configuration
- Vim-style keyboard navigation (j/k, g/G, u/d)
- Real-time statistics display
- Event detail expansion
- Configurable timestamp formats (relative, absolute, unix)
- Theme support (dark, light, minimal)

#### Documentation
- Comprehensive README with installation and usage instructions
- CLI reference documentation
- SDK integration guide
- Architecture documentation
- Contributing guidelines
- Testing guide

### Security
- Trace files stored with 0700 permissions (owner only)
- Automatic redaction of sensitive fields (api_key, password, token, secret)
- Local-only storage - no data sent externally
- No telemetry or phone-home functionality

[Unreleased]: https://github.com/Watchtower-Labs/watchtower-cli/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Watchtower-Labs/watchtower-cli/releases/tag/v0.1.0
