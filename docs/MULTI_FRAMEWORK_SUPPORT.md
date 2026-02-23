# Multi-Framework Support

Watchtower now supports multiple AI agent frameworks beyond Google ADK.

## Supported Frameworks

### 1. Google ADK ✅
**Status:** Full support, production ready

The original Watchtower plugin for Google ADK agents.

**Installation:**
```bash
pip install watchtower-adk
```

**Usage:**
```python
from google.adk.agents import Agent
from watchtower import AgentTracePlugin

agent = Agent(name="my_agent", ...)
plugin = AgentTracePlugin()
runner = InMemoryRunner(agent=agent, plugins=[plugin])
result = runner.run()
```

### 2. Anthropic Claude ✅
**Status:** Full support, production ready

Observability for Anthropic Claude API calls and agents.

**Installation:**
```bash
pip install watchtower-adk
pip install anthropic  # Framework dependency
```

**Usage:**
```python
from watchtower.sdk import create_for_anthropic

observer = create_for_anthropic(
    api_key="your-api-key",
    model="claude-sonnet-4-20250514",
)

# Call Claude API with observability
response = observer.observe_llm_call([
    {"role": "user", "content": "Hello!"}
])
```

**Example:**
```bash
# Set API key
export ANTHROPIC_API_KEY="your-api-key"

# Run example
python examples/anthropic_basic.py
```

### 3. OpenAI GPT ✅
**Status:** Full support, production ready

Observability for OpenAI GPT API calls and agents.

**Installation:**
```bash
pip install watchtower-adk
pip install openai  # Framework dependency
```

**Usage:**
```python
from watchtower.sdk import create_for_openai

observer = create_for_openai(
    api_key="your-api-key",
    model="gpt-4o",
)

# Call OpenAI API with observability
response = observer.observe_llm_call([
    {"role": "user", "content": "Hello!"}
])
```

**Example:**
```bash
# Set API key
export OPENAI_API_KEY="your-api-key"

# Run example
python examples/openai_basic.py
```

### 4. LangChain 🚧
**Status:** Coming soon

Support for LangChain agents and chains is planned for future releases.

### 5. AutoGen 🚧
**Status:** Coming soon

Support for Microsoft AutoGen multi-agent conversations is planned for future releases.

---

## Unified API

The `Watchtower` SDK provides a unified interface for all frameworks:

```python
from watchtower.sdk import Watchtower

# Auto-detect framework
observer = Watchtower.create_observer()

# Or specify framework explicitly
from watchtower.sdk import create_for_anthropic, create_for_openai

observer = create_for_anthropic(api_key="key")
# or
observer = create_for_openai(api_key="key")
```

---

## Framework Detection

Watchtower automatically detects which framework is being used:

1. Checks installed packages
2. Priority: Google ADK > Anthropic > OpenAI > LangChain > AutoGen
3. Creates appropriate observer instance

**Auto-detection example:**
```python
from watchtower.sdk import Watchtower

# Automatically detects available framework
observer = Watchtower.create_observer(
    trace_dir="./traces",
    enable_stdout=True,
)
```

---

## Trace File Format

All frameworks produce trace files in a unified JSONL format with a `framework` field:

```jsonl
{"type":"run.start","framework":"anthropic","run_id":"abc123",...}
{"type":"llm.response","framework":"anthropic","model":"claude-sonnet-4-20250514",...}
{"type":"tool.start","framework":"openai","tool_name":"search","...}
```

The CLI (`watchtower` command) can view traces from any framework.

---

## Backward Compatibility

Existing Google ADK setups require no changes:

```python
# This still works exactly as before
from watchtower import AgentTracePlugin

plugin = AgentTracePlugin()
```

---

## Migration Guide

### From Google ADK Only

No changes needed! Your existing Google ADK code works as-is.

### Adding Anthropic or OpenAI

1. Install the framework SDK:
   ```bash
   pip install anthropic  # for Anthropic
   pip install openai     # for OpenAI
   ```

2. Import and create observer:
   ```python
   from watchtower.sdk import create_for_anthropic  # or create_for_openai

   observer = create_for_anthropic(api_key="your-key")
   ```

3. Replace direct API calls with observer methods:
   ```python
   # Instead of:
   response = client.messages.create(...)

   # Use:
   response = observer.observe_llm_call(...)
   ```

---

## Comparison

| Feature | Google ADK | Anthropic | OpenAI |
|----------|-------------|-----------|--------|
| LLM Request/Response | ✅ | ✅ | ✅ |
| Tool Calls | ✅ | ✅ | ✅ |
| Token Tracking | ✅ | ✅ | ✅ |
| Multi-Agent | ✅ | ⚠️  Limited | ⚠️  Limited |
| Streaming | ✅ | ✅ | ✅ |
| Trace Files | ✅ | ✅ | ✅ |
| CLI Viewing | ✅ | ✅ | ✅ |

---

## Future Roadmap

- [ ] LangChain adapter (Q2 2026)
- [ ] AutoGen adapter (Q3 2026)
- [ ] Framework-specific CLI features
- [ ] Advanced tool call visualizations
- [ ] Comparative analytics across frameworks
