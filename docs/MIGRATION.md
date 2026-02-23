# Migration Guide

This guide helps you upgrade between versions of Watchtower.

## Version 0.1.0 Breaking Changes

**No breaking changes expected for initial release.**

All features are backwards compatible.

## Upgrading

### Step 1: Update Python SDK

```bash
# Upgrade to latest version
pip install --upgrade watchtower-adk

# Verify installation
pip show watchtower-adk
python -c "import watchtower; print(watchtower.__version__)"
```

### Step 2: Update TypeScript CLI

```bash
# Upgrade to latest version
npm update -g @watchtower/cli

# Or using pnpm
pnpm update -g @watchtower/cli

# Verify installation
watchtower --version
```

### Step 3: Update Configuration Files

Watchtower will automatically migrate your configuration when you first run the new version.

**No manual migration needed for v0.1.0**

Configuration files are compatible:
- `~/.watchtower/cli.yaml` - CLI configuration
- `~/.watchtower/config.yaml` - SDK configuration

## Checking Your Installation

After upgrading, verify your setup:

```bash
# Check Python SDK
python -c "from watchtower import AgentTracePlugin; print('OK')"

# Check CLI
watchtower --version
watchtower show --help

# Check trace directory
ls -la ~/.watchtower/traces
```

## Future Versions

When future versions are released, this section will document:

### Breaking Changes
- Deprecated features
- Changed APIs
- Configuration file format changes
- Behavior changes

### Migration Steps
- Required code changes
- Configuration updates
- Data migration (if any)

### Rollback Plan
- How to downgrade if needed
- Data preservation during rollback

## Development Migration

If you're developing Watchtower and updating to a new version:

### Update Dependencies

```bash
# Python dependencies
pip install -e ".[dev]"

# Node dependencies
pnpm install
```

### Update Code

Check for deprecated APIs:

```python
# ✅ Still supported
from watchtower import AgentTracePlugin

# ❌ Deprecated (if any)
# from watchtower import OldAPI
```

### Update Tests

Ensure tests pass with new version:

```bash
# Python tests
pytest tests/

# CLI tests
pnpm --filter @watchtower/cli test
```

### Update Documentation

Update relevant documentation files with new features and changes.

## Rollback

If you need to rollback to a previous version:

```bash
# Uninstall current version
pip uninstall watchtower-adk
npm uninstall -g @watchtower/cli

# Install specific version
pip install watchtower-adk==0.0.0
npm install -g @watchtower/cli@0.0.0
```

## Getting Help

If you encounter issues during migration:

1. **Check Troubleshooting Guide**:
   - [Troubleshooting](./TROUBLESHOOTING.md)
   - Common issues and solutions

2. **Review Examples**:
   - [Examples](../examples/)
   - Updated examples show proper usage

3. **Check GitHub Issues**:
   - https://github.com/Watchtower-Labs/watchtower-cli/issues
   - Search for migration issues

4. **Create a New Issue**:
   - Include your current and target versions
   - Describe the issue you're experiencing
   - Include error messages and stack traces
   - Provide minimal reproduction steps

5. **Verify Configuration**:
   - Check your CLI and SDK configuration files
   - Ensure no conflicting settings

## Version Compatibility

### Python SDK

| Feature | v0.1.0 | Notes |
|----------|--------|-------|
| Google ADK support | ✅ | Full support including multi-agent |
| Anthropic support | ✅ | Single-agent focus |
| OpenAI support | ✅ | Single-agent focus |
| Trace format | ✅ | Stable JSONL format |
| Event types | ✅ | All core events supported |
| Multi-agent | ✅ | Google ADK full support |

### TypeScript CLI

| Feature | v0.1.0 | Notes |
|----------|--------|-------|
| All commands | ✅ | show, tail, list, config, clean |
| Terminal UI | ✅ | Ink-based React UI |
| Themes | ✅ | dark, light, minimal |
| Keyboard navigation | ✅ | Vim-style and arrow keys |
| Search | ✅ | Full-text search |
| Export | ✅ | JSON export format |
| Multi-agent view | 📋 Planned for v0.2.0 |

## Known Limitations

### v0.1.0

1. **Anthropic/OpenAI multi-agent**: Limited single-agent focus only
   - Manual orchestration required for multi-agent
   - No automatic `agent.transfer` events

2. **Windows support**: New in v0.1.0
   - May have edge cases on Windows
   - Report issues if found

3. **Node.js versions**: Tested on 18, 20, 22
   - Other versions may work but not tested

## Best Practices

1. **Test after upgrading**
   - Run your agents with new version
   - Verify traces appear correctly
   - Check CLI displays traces properly

2. **Backup configuration**
   - Save working config before upgrade
   - Easy rollback if issues occur

3. **Gradual rollout**
   - Test in development first
   - Then production/staging
   - Finally production

4. **Monitor for issues**
   - Watch logs for errors or warnings
   - Check performance after upgrade

5. **Keep dependencies updated**
   - Regular updates improve security and compatibility

## Resources

- [Release Notes](https://github.com/Watchtower-Labs/watchtower-cli/releases)
- [Documentation](https://github.com/Watchtower-Labs/watchtower-cli#readme)
- [Issues](https://github.com/Watchtower-Labs/watchtower-cli/issues)
- [Discussions](https://github.com/Watchtower-Labs/watchtower-cli/discussions)
