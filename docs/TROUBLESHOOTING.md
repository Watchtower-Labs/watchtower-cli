# Troubleshooting Watchtower

This guide helps you resolve common issues when using Watchtower.

## Table of Contents

- [General Issues](#general-issues)
- [Installation Issues](#installation-issues)
- [Configuration Issues](#configuration-issues)
- [Multi-Agent Issues](#multi-agent-issues)
- [Framework-Specific Issues](#framework-specific-issues)
- [Performance Issues](#performance-issues)
- [CLI Issues](#cli-issues)

---

## General Issues

### Traces Not Appearing

**Symptom**: Running agent produces no trace files

**Solutions**:

1. **Verify plugin is added to runner**:
   ```python
   # ✅ Correct
   runner = InMemoryRunner(agent=agent, plugins=[plugin])

   # ❌ Missing plugin
   runner = InMemoryRunner(agent=agent)  # No plugins!
   ```

2. **Check trace directory exists**:
   ```bash
   ls ~/.watchtower/traces
   # Should show .jsonl files
   ```

3. **Verify environment variables**:
   ```bash
   echo $WATCHTOWER_TRACE_DIR
   echo $WATCHTOWER_LIVE
   echo $WATCHTOWER_RUN_ID
   ```

4. **Check plugin initialization**:
   ```python
   # Ensure plugin is created with correct settings
   plugin = AgentTracePlugin(
       trace_dir="~/.watchtower/traces",
       enable_file=True,
   enable_stdout=False,
   )
   ```

5. **Verify Watchtower is installed**:
   ```bash
   # Check Python SDK
   pip show watchtower-adk

   # Check CLI
   npm list -g @watchtower/cli
   ```

---

### Live Tailing Not Streaming Events

**Symptom**: `watchtower tail` shows no events or hangs

**Solutions**:

1. **Ensure PYTHONUNBUFFERED=1 is set**:
   ```bash
   # Watchtower sets this automatically
   # Verify if running script manually:
   export PYTHONUNBUFFERED=1
   ```

2. **Check script imports observer methods**:
   ```python
   # ✅ Correct - Uses Watchtower observer
   from watchtower.sdk import create_for_anthropic
   observer = create_for_anthropic(api_key="...")
   response = observer.observe_llm_call([...])

   # ❌ Incorrect - Direct API calls, not through observer
   import anthropic
   client = anthropic.Anthropic(api_key="...")
   # Watchtower won't see this!
   ```

3. **Verify WATCHTOWER_LIVE=1 is set**:
   ```bash
   # Watchtower sets this when using 'tail' command
   # Check if it's being set
   env | grep WATCHTOWER_LIVE
   ```

4. **Check for script errors**:
   ```bash
   # Look for Python errors in output
   # These might prevent events from being emitted
   ```

5. **Test with a simple script**:
   ```python
   # Create minimal test script
   from watchtower.sdk import create_for_anthropic

   obs = create_for_anthropic(api_key="test-key")
   obs.observe_llm_call([{"role": "user", "content": "test"}])
   ```

---

### CLI Not Rendering Properly

**Symptom**: Garbled output, missing colors, or layout issues

**Solutions**:

1. **Check terminal supports ANSI colors**:
   ```bash
   # Test terminal colors
   echo -e "\033[31mRed\033[0m"
   # Should show red text
   ```

2. **Try different theme**:
   ```bash
   # Switch to minimal theme
   watchtower config set theme minimal
   ```

3. **Check terminal size**:
   ```bash
   # Verify terminal dimensions
   # Small terminals may have display issues
   # Use larger terminal window
   ```

4. **Clear terminal history**:
   ```bash
   # Old output might interfere
   clear
   ```

5. **Check for UTF-8 encoding**:
   ```bash
   # Ensure proper encoding
   export LANG=en_US.UTF-8
   ```

---

## Installation Issues

### ModuleNotFoundError

**Symptom**: `ModuleNotFoundError: No module named 'watchtower'`

**Solutions**:

1. **Install in development mode**:
   ```bash
   # ✅ Correct
   pip install -e ".[dev]"

   # ❌ Incorrect
   pip install watchtower-adk
   # Only installs to system Python, not current env
   ```

2. **Check Python version**:
   ```bash
   python --version  # Should be 3.9+
   ```

3. **Activate virtual environment**:
   ```bash
   # Ensure venv is activated
   source venv/bin/activate
   ```

4. **Check Python path**:
   ```bash
   # Verify correct Python is being used
   which python
   python -c "import sys; print(sys.path)"
   ```

---

### Command Not Found

**Symptom**: `watchtower: command not found`

**Solutions**:

1. **Verify CLI installation**:
   ```bash
   # Check if installed
   which watchtower

   # If not found, install:
   npm install -g @watchtower/cli

   # Or use pnpm
   pnpm add -g @watchtower/cli
   ```

2. **Check PATH**:
   ```bash
   # Verify watchtower is in PATH
   echo $PATH

   # Add to PATH if needed (in ~/.bashrc or ~/.zshrc):
   export PATH="$PATH:$(pnpm root -g)/bin"
   ```

3. **Reinstall from source**:
   ```bash
   git clone https://github.com/Watchtower-Labs/watchtower-cli.git
   cd watchtower-cli
   pnpm install && pnpm build:cli
   cd packages/cli && pnpm link --global
   ```

---

## Configuration Issues

### Configuration Not Persisting

**Symptom**: Changes via `watchtower config` don't persist

**Solutions**:

1. **Check config file location**:
   ```bash
   # Should be at ~/.watchtower/cli.yaml
   ls -la ~/.watchtower/
   ```

2. **Check file permissions**:
   ```bash
   # Ensure directory is writable
   ls -ld ~/.watchtower

   # Fix if needed:
   chmod 700 ~/.watchtower
   ```

3. **Verify YAML syntax**:
   ```bash
   # Validate YAML format
   python -c "import yaml; yaml.safe_load(open('~/.watchtower/cli.yaml'))"
   ```

4. **Reset to defaults**:
   ```bash
   # Remove config file to reset
   rm ~/.watchtower/cli.yaml
   # Watchtower will recreate with defaults
   ```

---

## Multi-Agent Issues

### Agent Transfers Not Appearing

**Symptom**: `agent.transfer` events not in traces

**Solutions**:

1. **Verify using Google ADK framework**:
   ```python
   # ✅ Google ADK - Full multi-agent support
   from google.adk.agents import SequentialAgent

   # ❌ Anthropic/OpenAI - Limited support
   from anthropic import Anthropic
   # Agent transfers not supported
   ```

2. **Check Sequential/Parallel/Loop configuration**:
   ```python
   # Ensure agents are properly configured
   workflow = SequentialAgent(
       name="my_pipeline",
       sub_agents=[agent1, agent2, agent3],
   )

   # Check aggregator for ParallelAgent
   parallel = ParallelAgent(
       sub_agents=[...],
       aggregator=aggregator_agent,
   )
   ```

3. **Verify agent names are unique**:
   ```python
   # ✅ Good - Unique names
   agents = [
       Agent(name="researcher", ...),
       Agent(name="writer", ...),
       Agent(name="editor", ...),
   ]

   # ❌ Bad - Duplicate names
   agents = [
       Agent(name="agent1", ...),
       Agent(name="agent1", ...),  # Conflicts!
   ]
   ```

4. **Check plugin is added to runner**:
   ```python
   runner = InMemoryRunner(
       agent=multi_agent_workflow,
       plugins=[AgentTracePlugin()],  # Required!
   )
   ```

---

### Cannot Distinguish Between Agents

**Symptom**: Multiple agent runs look identical

**Solutions**:

1. **Use descriptive agent names**:
   ```python
   # ✅ Good - Clear and descriptive
   names = [
       "requirements_gatherer",
       "code_reviewer",
       "content_orchestrator",
   ]

   # ❌ Bad - Generic names
   names = [
       "agent1",
       "agent2",
       "helper",
   ]
   ```

2. **Enable agent panel view**:
   ```bash
   # View per-agent metrics
   watchtower show last --view agents
   ```

3. **Filter by agent name**:
   ```bash
   # View only specific agent
   watchtower show last --agent researcher
   ```

4. **Check agent IDs in trace events**:
   ```python
   # Each run should have unique agent_id
   # Check in trace file for agent_id field
   ```

---

### Parallel Execution Timing Issues

**Symptom**: Agents not running truly in parallel

**Solutions**:

1. **Verify ParallelAgent configuration**:
   ```python
   # Ensure aggregator is set correctly
   parallel = ParallelAgent(
       sub_agents=[...],
       aggregator=aggregator,  # Required for parallel!
   )
   ```

2. **Monitor timeline for concurrent activity**:
   ```bash
   # Look for overlapping timestamps
   watchtower show last
   # Parallel agents should have overlapping run.start/end times
   ```

3. **Check for unintended dependencies**:
   ```python
   # Review agent instructions for dependencies
   # Remove: "Wait for agent2 to finish"
   # Each agent should be independent
   ```

---

### Loop Not Converging

**Symptom**: Loop runs maximum iterations without convergence

**Solutions**:

1. **Check convergence criteria**:
   ```python
   # Ensure criteria is achievable
   loop = LoopAgent(
       convergence_criteria="code_quality >= 8",  # ✅ Good
       # NOT: "quality == 10"  # Too strict?
   )
   ```

2. **Review quality scoring logic**:
   ```python
   # Verify scoring is fair and achievable
   # Test with sample data before running
   ```

3. **Adjust max_iterations**:
   ```python
   # Increase if needed
   loop = LoopAgent(
       max_iterations=5,  # From 3
       ...
   )
   ```

4. **Add logging for debugging**:
   ```python
   import logging
   logger = logging.getLogger(__name__)

   loop = LoopAgent(
       sub_agents=[...],
       debug=True,  # Enable debug logging
   )
   ```

---

## Framework-Specific Issues

### Google ADK Issues

**Symptom**: Google ADK agent not being traced

**Solutions**:

1. **Verify Google ADK is installed**:
   ```bash
   pip install google-adk
   ```

2. **Check import compatibility**:
   ```python
   # Use correct imports
   from google.adk.agents import Agent
   from google.adk.runners import InMemoryRunner
   ```

3. **Verify plugin is ADK plugin**:
   ```python
   from watchtower import AgentTracePlugin  # ✅ Correct
   # NOT from watchtower.sdk import create_for_google_adk
   ```

### Anthropic Issues

**Symptom**: Anthropic observer not emitting events

**Solutions**:

1. **Check API key is set**:
   ```bash
   export ANTHROPIC_API_KEY=your-key
   ```

2. **Verify model is supported**:
   ```python
   # Check model name
   observer = create_for_anthropic(model="claude-sonnet-4-20250514")
   ```

3. **Test without observer first**:
   ```python
   # Verify API works directly
   import anthropic
   client = anthropic.Anthropic(api_key="...")
   response = client.messages.create(...)
   ```

### OpenAI Issues

**Symptom**: OpenAI observer not emitting events

**Solutions**:

1. **Check API key is set**:
   ```bash
   export OPENAI_API_KEY=your-key
   ```

2. **Verify model is supported**:
   ```python
   observer = create_for_openai(model="gpt-4o")
   ```

---

## Performance Issues

### Slow Trace Loading

**Symptom**: Large trace files take long time to load

**Solutions**:

1. **Use streaming parser** (automatic)**:
   ```bash
   # Watchtower uses streaming by default
   # Files are loaded page-by-page
   ```

2. **Adjust page size**:
   ```bash
   # Reduce page size for faster initial load
   watchtower config set showPageSize 100
   ```

3. **Filter events**:
   ```bash
   # Load only events you need
   watchtower show last --filter tool:search
   ```

### High Memory Usage

**Symptom**: CLI uses excessive memory

**Solutions**:

1. **Reduce max events**:
   ```bash
   # Limit loaded events
   watchtower config set maxEvents 500
   ```

2. **Close unused traces**:
   ```bash
   # Clean up old trace files
   watchtower clean --days 7
   ```

---

## CLI Issues

### Keyboard Navigation Not Working

**Symptom**: Arrow keys or keyboard shortcuts not responding

**Solutions**:

1. **Check terminal mode**:
   ```bash
   # Ensure not in raw mode
   # Some terminals disable key handling in raw mode
   ```

2. **Verify CLI has focus**:
   ```bash
   # Click in terminal window first
   # Try again
   ```

3. **Check key bindings**:
   ```bash
   # View current bindings
   watchtower config
   ```

4. **Use alternative navigation**:
   ```bash
   # Try vim keys if arrow keys fail
   # Use j/k for down/up
   ```

### Process Won't Terminate

**Symptom**: `watchtower tail` doesn't stop when expected

**Solutions**:

1. **Press 'q' key**:
   ```bash
   # Standard quit key
   ```

2. **Use Ctrl+C**:
   ```bash
   # Force terminate
   # May leave zombie process
   ```

3. **Kill process manually**:
   ```bash
   # Find and kill process
   ps aux | grep python | grep watchtower
   kill -9 <PID>
   ```

4. **Check for zombie processes**:
   ```bash
   # List all Python processes
   ps aux | grep python
   ```

---

## Getting More Help

If you're still experiencing issues:

1. **Check documentation**:
   - [Multi-Agent Guide](./MULTI_AGENT.md)
   - [SDK Guide](./SDK.md)
   - [CLI Guide](./CLI.md)
   - [Architecture](./ARCHITECTURE.md)

2. **Review examples**:
   - [examples/](../examples/)
   - Run examples to verify setup

3. **Check GitHub Issues**:
   - https://github.com/Watchtower-Labs/watchtower-cli/issues
   - Search for similar issues

4. **Create a new issue**:
   - Include your OS, Python/Node versions
   - Include error messages and stack traces
   - Include minimal reproduction steps
   - Include configuration settings

5. **Enable debug mode**:
   ```bash
   export WATCHTOWER_DEBUG=1
   # Provides verbose logging
   ```

---

## Quick Reference

### Useful Commands

```bash
# View recent trace
watchtower show last

# List all traces
watchtower list

# Clean old traces
watchtower clean --days 7

# View configuration
watchtower config

# Check trace directory
ls -la ~/.watchtower/traces

# Live tailing
watchtower tail python your_agent.py
```

### Environment Variables

```bash
# Enable debug logging
export WATCHTOWER_DEBUG=1

# Custom trace directory
export WATCHTOWER_TRACE_DIR=/custom/path

# Custom run ID
export WATCHTOWER_RUN_ID=my-custom-run

# Disable all tracing
export WATCHTOWER_DISABLE=1
```

### Files and Locations

```
~/.watchtower/
├── cli.yaml              # CLI configuration
├── config.yaml           # SDK configuration
└── traces/               # Trace files (*.jsonl)
```
