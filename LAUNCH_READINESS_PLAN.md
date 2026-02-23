# Watchtower CLI - Launch Readiness Plan

## Executive Summary

This document provides a comprehensive plan to address all identified issues and prepare the Watchtower CLI project for production launch. The plan is organized into 10 major categories with specific, actionable tasks.

**Current Status**: ~75% Ready for Launch
**Target Launch Date**: TBD
**Estimated Effort**: 5-7 weeks (2-3 developers)

---

## Priority Matrix

| Priority | Category | Estimated Effort | Launch Blocker |
|----------|-----------|------------------|----------------|
| 🔴 P0 | Critical Blocking Issues | 3-5 days | YES |
| 🔴 P0 | CI/CD Pipeline | 4-6 days | YES |
| 🟡 P1 | Documentation & Multi-Agent | 8-10 days | NO |
| 🟡 P1 | Testing Coverage | 7-10 days | NO |
| 🟢 P2 | Code Quality | 5-7 days | NO |
| 🟢 P2 | Security Hardening | 3-4 days | NO |
| 🟢 P2 | Package Configuration | 2-3 days | NO |
| 🟢 P2 | UI/UX & Multi-Agent UI | 7-9 days | NO |
| 🔵 P3 | Deployment Readiness | 3-4 days | NO |

---

## 🔴 P0 - Critical Blocking Issues (Must Fix Before Launch)

### Issue #1: NotImplementedError for LangChain and AutoGen

**Location**: `watchtower/sdk.py` lines 100, 106, 117

**Problem**:
```python
elif detected_framework == AgentFramework.LANGCHAIN:
    raise NotImplementedError(
        "LangChain adapter is not yet implemented. "
        "See the implementation plan for details."
    )
```

**Impact**: Documentation claims framework support that doesn't exist, misleading users

**Solution Options**:
1. **Option A (Recommended)**: Remove framework support from documentation and type definitions until implemented
2. **Option B**: Implement basic adapters with clear "Beta" status
3. **Option C**: Create stub adapters that log warnings but don't crash

**Recommended Action**: Option A - Remove unsupported framework claims

**Steps**:
1. Remove `LANGCHAIN` and `AUTOGEN` from `AgentFramework` enum in `watchtower/core/interface.py`
2. Remove framework detection logic in `watchtower/sdk.py`
3. Update `README.md` to remove LangChain/AutoGen mentions
4. Update `docs/MULTI_FRAMEWORK_SUPPORT.md` to reflect current support
5. Add "Future Frameworks" section to roadmap

**Estimated Time**: 2-3 hours

---

### Issue #2: Dual README Files

**Location**: Root directory - `README.md` and `README_NEW.md`

**Problem**:
- Two README files with different content create confusion
- `README.md` has mixed old/new documentation
- Users don't know which one to follow

**Impact**: Poor first impression, potential user confusion

**Solution**: Consolidate into single `README.md`

**Steps**:
1. Compare both READMEs to identify:
   - Unique content in README.md
   - Unique content in README_NEW.md
   - Conflicting information
2. Merge content following structure:
   - Quick Start (from both)
   - Installation (from both, consolidate)
   - Features (from README_NEW.md, better organized)
   - Framework Support (from README.md, more detailed)
   - Documentation Links (from both, deduplicate)
3. Keep `README_NEW.md` as reference for PR review
4. Delete `README_NEW.md` after merge verified
5. Update all internal links to point to consolidated README

**Estimated Time**: 4-6 hours

---

### Issue #3: Broken Documentation Links

**Problem**:
- `docs/SDK.md` line 330: `[examples/README.md](examples/README.md)` - FILE MISSING
- Multiple references to `examples/simple_agent.py` - FILE MISSING
- References to `examples/basic_usage.py` - FILE MISSING
- References to `examples/live_streaming.py` - FILE MISSING

**Impact**: Users following examples will hit 404 errors

**Solution**: Create all referenced example files

**Estimated Time**: 6-8 hours

---

### Issue #4: Extensive ESLint Rule Disabling

**Location**: `packages/cli/package.json` lines 83-145

**Problem**:
- 45+ ESLint rules disabled
- Suggests underlying code quality issues
- Reduces effectiveness of linting

**Impact**: Potential bugs, inconsistent code quality

**Solution**:
1. Analyze each disabled rule:
   - Determine if rule should be enabled (most)
   - Identify rules that are incompatible with project style (few)
   - Document reasons for any remaining disabled rules
2. Gradually re-enable rules:
   - Start with high-impact rules (unused vars, no-undef, etc.)
   - Fix resulting issues
   - Continue with medium-impact rules
3. Target: Reduce to <10 disabled rules maximum

**Steps**:
1. Create branch for ESLint cleanup
2. Enable rules in batches:
   - Batch 1: Critical (unused-vars, no-unused-expressions, no-sequences)
   - Batch 2: High (eqeqeq, curly, semi)
   - Batch 3: Medium (quotes, indent, comma-dangle)
   - Batch 4: Low (prefer-const, no-var)
3. For each batch:
   - Enable rule
   - Run `pnpm lint`
   - Fix all errors
   - Commit
4. Document remaining disabled rules in `.eslintrc.js` comments

**Estimated Time**: 1-2 days

---

### Issue #5: Python Import Order Violations

**Locations**: Multiple files with `# noqa: E402` comments

**Problem**:
- Import order violations indicate code structure issues
- Violates PEP 8 style guide
- Masks potential circular dependency issues

**Solution**:
1. Identify all files with `# noqa: E402`
2. Refactor to fix import order:
   - Move imports to top of file
   - Use lazy imports only where truly necessary
   - Restructure modules to break circular dependencies
3. Remove `# noqa: E402` comments

**Affected Files**:
- `watchtower/plugin.py`
- `watchtower/writers/file_writer.py`
- `watchtower/adapters/__init__.py`

**Estimated Time**: 4-6 hours

---

## 🔴 P0 - CI/CD Pipeline Issues (Must Fix Before Launch)

### Issue #1: Missing Test Coverage Reporting

**Problem**:
- No coverage configuration
- Tests run but coverage not measured
- Cannot identify untested code

**Solution**: Add coverage reporting

**Steps**:
1. Create `pyproject.toml` coverage section:
   ```toml
   [tool.coverage.run]
   source = ["watchtower"]
   omit = ["tests/*", "*/__init__.py"]

   [tool.coverage.report]
   exclude_lines = [
       "pragma: no cover",
       "def __repr__",
       "raise AssertionError",
       "raise NotImplementedError",
   ]
   ```

2. Update `.github/workflows/test.yml`:
   ```yaml
   - name: Run tests with coverage
     run: |
       pip install coverage[toml]
       coverage run -m pytest tests/
       coverage report
       coverage xml
   - name: Upload coverage to Codecov
     uses: codecov/codecov-action@v3
   ```

3. Add coverage target badge to README

**Estimated Time**: 2-3 hours

---

### Issue #2: Missing Security Scanning

**Problem**:
- No automated security scanning
- Vulnerabilities in dependencies go undetected

**Solution**: Add security scanning workflow

**Steps**:
1. Create `.github/workflows/security.yml`:
   ```yaml
   name: Security
   on: [push, pull_request, schedule]

   jobs:
     dependency-audit:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - name: Run pip-audit
           run: |
             pip install pip-audit
             pip-audit --desc --strict

     npm-audit:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - name: Setup Node.js
           uses: actions/setup-node@v4
           with:
             node-version: '20'
         - name: Install dependencies
           run: pnpm install
         - name: Run npm audit
           run: pnpm audit --audit-level=moderate

     code-scanning:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: github/codeql-action/analyze@v2
   ```

2. Add `safety` to Python dev dependencies
3. Configure Dependabot in `.github/dependabot.yml`

**Estimated Time**: 3-4 hours

---

### Issue #3: Missing Windows Testing in Main CI

**Problem**:
- Main test.yml only tests Ubuntu and macOS
- Windows compatibility issues not caught in PRs
- Only nightly-stress includes Windows

**Solution**: Add Windows to main test matrix

**Steps**:
1. Update `.github/workflows/test.yml`:
   ```yaml
   strategy:
     fail-fast: false
     matrix:
       os: [ubuntu-latest, macos-latest, windows-latest]
       node-version: ['18', '20', '22']
   ```

2. Fix any Windows-specific issues that arise:
   - Path separators
   - File permissions
   - Shell commands

**Estimated Time**: 4-6 hours (including fixing issues)

---

### Issue #4: Missing Dependency Caching

**Problem**:
- No caching for pnpm or pip dependencies
- CI builds slower than necessary
- Increased CI costs

**Solution**: Add dependency caching

**Steps**:
1. Update `.github/workflows/test.yml`:
   ```yaml
   - name: Get pnpm store directory
     id: pnpm-cache
     shell: bash
     run: |
       echo "STORE_PATH=$(pnpm store path)" >> $GITHUB_OUTPUT

   - name: Setup pnpm cache
     uses: actions/cache@v4
     with:
       path: ${{ steps.pnpm-cache.outputs.STORE_PATH }}
       key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
       restore-keys: |
         ${{ runner.os }}-pnpm-store-

   - name: Setup pip cache
     uses: actions/cache@v4
     with:
       path: ~/.cache/pip
       key: ${{ runner.os }}-pip-${{ hashFiles('**/requirements.txt') }}
   ```

**Estimated Time**: 1-2 hours

---

### Issue #5: Inconsistent Build Commands

**Problem**:
- `test.yml` uses `pnpm build`
- `nightly-stress.yml` uses `pnpm build:cli`

**Impact**: Inconsistent behavior, potential build failures

**Solution**: Standardize build commands

**Steps**:
1. Verify `package.json` scripts:
   - Ensure both `build` and `build:cli` exist
   - Make `build` the canonical command
   - Update `build:cli` to call `build` if needed
2. Update all workflows to use `pnpm build`
3. Document build command convention in CONTRIBUTING.md

**Estimated Time**: 1 hour

---

### Issue #6: Missing Python Linting in CI

**Problem**:
- Python tests run but no linting
- Code style inconsistencies slip through

**Solution**: Add Python linting steps

**Steps**:
1. Update `.github/workflows/test.yml`:
   ```yaml
   - name: Lint with ruff
     run: ruff check watchtower/ tests/ --output-format=github

   - name: Format check with black
     run: black --check watchtower/ tests/

   - name: Import order check with isort
     run: isort --check-only watchtower/ tests/
   ```

2. Add `isort` to dev dependencies
3. Create `pyproject.toml` linting configuration:
   ```toml
   [tool.isort]
   profile = "black"
   line_length = 100
   ```

**Estimated Time**: 1-2 hours

---

### Issue #7: Missing Test Artifacts

**Problem**:
- Test runs produce no artifacts
- Difficult to debug CI failures

**Solution**: Add artifact upload

**Steps**:
1. Update `.github/workflows/test.yml`:
   ```yaml
   - name: Upload test results
     if: always()
     uses: actions/upload-artifact@v4
     with:
       name: test-results-${{ matrix.os }}-${{ matrix.node-version }}
       path: |
         .pytest_cache/
         coverage.xml
       retention-days: 7
   ```

**Estimated Time**: 1 hour

---

### Issue #8: Missing Node.js 22 Testing

**Problem**:
- Only testing Node.js 18 and 20
- Node.js 22 is latest LTS (released Nov 2024)

**Solution**: Add Node.js 22 to matrix

**Steps**:
1. Update `.github/workflows/test.yml`:
   ```yaml
   node-version: ['18', '20', '22']
   ```

2. Test for compatibility issues
3. Update `package.json` engines field to include Node.js 22

**Estimated Time**: 2-3 hours

---

## 🟡 P1 - Documentation & Multi-Agent Support (Should Fix Before Launch)

### Issue #1: Create Missing Example Files (Including Multi-Agent)

**Files to Create**:

#### `examples/README.md`
```markdown
# Watchtower Examples

This directory contains example code demonstrating Watchtower's features.

## Examples

### Anthropic Claude
- `anthropic_basic.py` - Basic Anthropic API usage with observability

### OpenAI GPT
- `openai_basic.py` - Basic OpenAI API usage with observability

### Google ADK
- `simple_agent.py` - Simple ADK agent with Watchtower plugin

## Running Examples

1. Install dependencies:
   ```bash
   pip install watchtower-adk anthropic openai
   ```

2. Set API keys:
   ```bash
   export ANTHROPIC_API_KEY=your-key
   export OPENAI_API_KEY=your-key
   ```

3. Run example:
   ```bash
   python examples/anthropic_basic.py
   ```

## Viewing Traces

After running examples, view traces with the CLI:
```bash
watchtower show last
```

Or tail live:
```bash
watchtower tail python examples/anthropic_basic.py
```
```

#### `examples/simple_agent.py`
```python
"""
Simple Google ADK agent with Watchtower observability.
"""

from google.adk.agents import Agent
from google.adk.runners import InMemoryRunner
from watchtower import AgentTracePlugin


def search_web(query: str) -> str:
    """Mock web search tool."""
    return f"Search results for: {query}"


# Create agent
agent = Agent(
    name="simple_agent",
    model="gemini-2.0-flash",
    instruction="You are a helpful assistant that can search the web.",
    tools=[search_web],
)

# Add Watchtower plugin
plugin = AgentTracePlugin()

# Run agent
runner = InMemoryRunner(agent=agent, plugins=[plugin])
result = runner.run(user_message="What's the weather today?")

print(result)
```

#### `examples/basic_usage.py`
```python
"""
Basic Watchtower usage patterns.
"""

from watchtower.sdk import Watchtower, create_for_anthropic, create_for_openai

# Auto-detection
observer = Watchtower.create_observer(
    trace_dir="./traces",
    enable_stdout=True,
)

# Explicit Anthropic observer
anthropic = create_for_anthropic(api_key="your-key")

# Explicit OpenAI observer
openai = create_for_openai(api_key="your-key")

print(f"Framework: {observer.get_framework()}")
print(f"Run ID: {observer.run_id}")
```

#### `examples/live_streaming.py`
```python
"""
Live streaming with Watchtower CLI.
"""

from watchtower.sdk import create_for_anthropic

# Create observer with stdout enabled
observer = create_for_anthropic(api_key="your-key")

# The CLI will set WATCHTOWER_LIVE=1 when tailing
# This enables real-time event streaming

# Run your agent
response = observer.observe_llm_call([
    {"role": "user", "content": "Hello!"}
])

print(response)
```

#### `examples/multi_agent_basic.py`
```python
"""
Basic multi-agent scenario using Google ADK.

Demonstrates parent-child agent hierarchy with Watchtower tracing.
"""

from google.adk.agents import Agent
from google.adk.agents.sequential import SequentialAgent
from google.adk.runners import InMemoryRunner
from watchtower import AgentTracePlugin


def search_web(query: str) -> str:
    """Mock web search tool."""
    return f"Search results for: {query}"


def summarize(text: str) -> str:
    """Mock summarization tool."""
    return f"Summary: {text[:100]}..."


# Create specialized agents
researcher = Agent(
    name="researcher",
    model="gemini-2.0-flash",
    instruction="You are a research specialist. Gather information on the topic.",
    tools=[search_web],
)

writer = Agent(
    name="writer",
    model="gemini-2.0-flash",
    instruction="You are a content writer. Create engaging content based on research.",
    tools=[summarize],
)

reviewer = Agent(
    name="reviewer",
    model="gemini-2.0-flash",
    instruction="You are an editor. Review and improve content.",
)

# Create sequential workflow
multi_agent = SequentialAgent(
    name="content_workflow",
    sub_agents=[researcher, writer, reviewer],
    shared_state={"topic": "", "draft": "", "final": ""},
)

# Add Watchtower plugin
plugin = AgentTracePlugin()

# Run multi-agent workflow
runner = InMemoryRunner(agent=multi_agent, plugins=[plugin])
result = runner.run(user_message="Create a blog post about AI observability")

print(result)
```

#### `examples/multi_agent_sequential.py`
```python
"""
Sequential multi-agent workflow using Google ADK.

Agents execute in a defined order, passing results to the next.
"""

from google.adk.agents import Agent
from google.adk.agents.sequential import SequentialAgent
from google.adk.runners import InMemoryRunner
from watchtower import AgentTracePlugin


def gather_requirements(project: str) -> str:
    """Gather project requirements."""
    return f"Requirements for {project}: ..."

def design_architecture(reqs: str) -> str:
    """Design system architecture."""
    return f"Architecture based on: {reqs}"

def implement_code(arch: str) -> str:
    """Implement the code."""
    return f"Code for: {arch}"

def test_code(code: str) -> str:
    """Test the implementation."""
    return f"Test results for: {code}"


# Create agents for each stage
requirements_agent = Agent(
    name="requirements_gatherer",
    model="gemini-2.0-flash",
    instruction="Gather requirements for the project.",
    tools=[gather_requirements],
)

architecture_agent = Agent(
    name="architect",
    model="gemini-2.0-flash",
    instruction="Design the system architecture based on requirements.",
    tools=[design_architecture],
)

implementation_agent = Agent(
    name="implementer",
    model="gemini-2.0-flash",
    instruction="Implement the code based on architecture.",
    tools=[implement_code],
)

testing_agent = Agent(
    name="tester",
    model="gemini-2.0-flash",
    instruction="Test the implementation and report results.",
    tools=[test_code],
)

# Sequential workflow
development_pipeline = SequentialAgent(
    name="dev_pipeline",
    sub_agents=[
        requirements_agent,
        architecture_agent,
        implementation_agent,
        testing_agent,
    ],
)

# Watchtower traces agent transfers automatically
plugin = AgentTracePlugin()

runner = InMemoryRunner(agent=development_pipeline, plugins=[plugin])
result = runner.run(user_message="Build a REST API for task management")

print(result)
```

#### `examples/multi_agent_parallel.py`
```python
"""
Parallel multi-agent workflow using Google ADK.

Multiple agents work simultaneously on independent tasks.
"""

from google.adk.agents import Agent
from google.adk.agents.parallel import ParallelAgent
from google.adk.runners import InMemoryRunner
from watchtower import AgentTracePlugin


def search_news(query: str) -> str:
    """Search news articles."""
    return f"News results for: {query}"

def search_papers(query: str) -> str:
    """Search academic papers."""
    return f"Papers for: {query}"

def search_social(query: str) -> str:
    """Search social media."""
    return f"Social posts for: {query}"


# Create parallel research agents
news_researcher = Agent(
    name="news_researcher",
    model="gemini-2.0-flash",
    instruction="Search for recent news articles on the topic.",
    tools=[search_news],
)

academic_researcher = Agent(
    name="academic_researcher",
    model="gemini-2.0-flash",
    instruction="Search for academic papers and research.",
    tools=[search_papers],
)

social_researcher = Agent(
    name="social_researcher",
    model="gemini-2.0-flash",
    instruction="Search social media for discussions and opinions.",
    tools=[search_social],
)

# Parallel workflow - all agents run simultaneously
parallel_research = ParallelAgent(
    name="research_team",
    sub_agents=[news_researcher, academic_researcher, social_researcher],
    aggregatation_instruction="Synthesize findings from all research sources.",
)

# Watchtower traces all parallel agent activity
plugin = AgentTracePlugin()

runner = InMemoryRunner(agent=parallel_research, plugins=[plugin])
result = runner.run(user_message="Research the latest developments in AI observability")

print(result)
```

#### `examples/multi_agent_loop.py`
```python
"""
Loop-based multi-agent workflow using Google ADK.

Agent runs iteratively with feedback until convergence.
"""

from google.adk.agents import Agent
from google.adk.agents.loop import LoopAgent
from google.adk.runners import InMemoryRunner
from watchtower import AgentTracePlugin


def evaluate_code(code: str) -> str:
    """Evaluate code quality."""
    return f"Code evaluation: {len(code)} lines, complexity: medium"

def improve_code(code: str, feedback: str) -> str:
    """Improve code based on feedback."""
    return f"Improved code based on: {feedback}"


# Code reviewer agent
reviewer = Agent(
    name="code_reviewer",
    model="gemini-2.0-flash",
    instruction="Review the code and provide specific improvement feedback.",
    tools=[evaluate_code],
)

# Code improver agent
improver = Agent(
    name="code_improver",
    model="gemini-2.0-flash",
    instruction="Improve the code based on reviewer feedback.",
    tools=[improve_code],
)

# Loop workflow - iteratively improve until quality threshold
code_refinement_loop = LoopAgent(
    name="refinement_loop",
    sub_agents=[reviewer, improver],
    max_iterations=3,
    convergence_criteria="code_quality >= 8",
    initial_state={"code": "", "code_quality": 0, "feedback": []},
)

# Watchtower traces each iteration of the loop
plugin = AgentTracePlugin()

runner = InMemoryRunner(agent=code_refinement_loop, plugins=[plugin])
result = runner.run(user_message="Implement and refine a function to calculate fibonacci numbers")

print(result)
```

**Estimated Time**: 12-16 hours (8 original + 4-8 for multi-agent examples)

---

### Issue #2: Update Framework Status and Multi-Agent Capabilities

**Problem**: Documentation claims LangChain and AutoGen support that doesn't exist, and multi-agent capabilities are unclear

**Solution**: Update all documentation to reflect actual support with clear multi-agent information

**Files to Update**:

1. **`README.md`** - Add dedicated multi-agent section
   ```markdown
   ## Multi-Agent Support

   Watchtower provides comprehensive observability for multi-agent systems:

   ### Google ADK (Full Support)
   - ✅ Sequential agents - Step-by-step workflows
   - ✅ Parallel agents - Concurrent task execution
   - ✅ Loop agents - Iterative optimization
   - ✅ Parent-child hierarchies - Orchestrator + specialist agents
   - ✅ Agent-to-Agent (A2A) communication tracing
   - ✅ Automatic agent transfer event capture (`agent.transfer`)

   ### Anthropic & OpenAI (Limited Support)
   - ⚠️ Single-agent focus - Trace individual agent runs
   - ⚠️ Manual multi-agent - Build orchestration yourself
   - ⚠️ No automatic transfer events - Track agents separately

   ### Examples
   - `examples/multi_agent_basic.py` - Parent-child hierarchy
   - `examples/multi_agent_sequential.py` - Sequential workflow
   - `examples/multi_agent_parallel.py` - Parallel execution
   - `examples/multi_agent_loop.py` - Iterative optimization
   ```

2. **`docs/MULTI_FRAMEWORK_SUPPORT.md`** - Update with multi-agent details
   - Add "Multi-Agent Support" column to framework table
   - Document Google ADK orchestration patterns
   - Explain A2A communication protocol
   - Add multi-agent examples section

3. **`watchtower/core/interface.py`** - Remove LangChain/AutoGen
   - Remove `LANGCHAIN` from `AgentFramework` enum
   - Remove `AUTOGEN` from `AgentFramework` enum
   - Keep enum focused on supported frameworks only

4. **`watchtower/sdk.py`** - Remove detection logic
   - Remove LangChain detection code
   - Remove AutoGen detection code
   - Update docstring to reflect supported frameworks

5. **Create `docs/MULTI_AGENT.md`** - Comprehensive multi-agent guide
   ```markdown
   # Multi-Agent Systems with Watchtower

   ## Overview
   Watchtower supports multi-agent observability through the `agent.transfer` event type.

   ## Google ADK Multi-Agent Patterns

   ### Sequential Agents
   Agents execute in a defined order, passing results to the next.

   Use case: Step-by-step workflows
   Example: Requirements → Architecture → Implementation → Testing

   ### Parallel Agents
   Multiple agents work simultaneously on independent tasks.

   Use case: Parallel data gathering
   Example: News research + Academic research + Social research

   ### Loop Agents
   Agent runs iteratively with feedback until convergence.

   Use case: Iterative improvement
   Example: Code review → Improvement → Review again

   ### Parent-Child Agents
   Hierarchical agent relationships with orchestrator pattern.

   Use case: Task delegation
   Example: Orchestrator delegates to Researcher, Writer, Editor

   ## Tracing Multi-Agent Workflows

   Watchtower automatically captures:
   - `agent.transfer` events when control moves between agents
   - Individual agent runs with `run.start`/`run.end`
   - Tool calls from each agent
   - LLM interactions per agent

   ## Viewing Multi-Agent Traces

   ### Timeline View
   Events grouped by agent with visual transfer indicators:
   ```
   ┌─ Researcher ─────┐
   │                   ▼
   │              Writer ◀──┘
   │                   ▼
   │              Reviewer ◀──┘
   ```

   ### Agent Panel
   View agent-specific metrics:
   - Total agent runs
   - Token usage per agent
   - Tool calls per agent
   - Average duration

   ### Filtering
   Filter events by agent name:
   ```
   watchtower show last --agent researcher
   ```

   ## Best Practices

   1. Use descriptive agent names for better traceability
   2. Add shared state keys to track cross-agent data
   3. Use `agent.transfer` events to identify bottlenecks
   4. Monitor token usage per agent for cost optimization
   ```

**Estimated Time**: 6-8 hours

---

### Issue #3: Add Troubleshooting and Migration Guides

**Create**: `docs/TROUBLESHOOTING.md`

**Content**:
```markdown
# Troubleshooting Watchtower

## Common Issues

### Traces not appearing

**Symptom**: Running agent produces no trace files

**Solutions**:
1. Verify plugin is added to runner:
   ```python
   runner = InMemoryRunner(agent=agent, plugins=[plugin])
   ```

2. Check trace directory:
   ```bash
   ls ~/.watchtower/traces
   ```

3. Verify environment variables:
   ```bash
   echo $WATCHTOWER_TRACE_DIR
   ```

### Live tail not streaming

**Symptom**: `watchtower tail` shows no events

**Solutions**:
1. Ensure PYTHONUNBUFFERED=1 is set (automatic with CLI)
2. Check script imports observer methods
3. Verify WATCHTOWER_LIVE=1 is set

### CLI not rendering properly

**Symptom**: Garbled output or missing colors

**Solutions**:
1. Check terminal supports ANSI colors
2. Try different theme:
   ```bash
   watchtower config set theme minimal
   ```

### Import errors

**Symptom**: ModuleNotFoundError when importing watchtower

**Solutions**:
1. Install in development mode:
   ```bash
   pip install -e ".[dev]"
   ```

2. Check Python version:
   ```bash
   python --version  # Should be 3.9+
   ```

### Permission errors

**Symptom**: PermissionError when writing traces

**Solutions**:
1. Check trace directory permissions:
   ```bash
   ls -ld ~/.watchtower/traces
   ```

2. Set correct permissions:
   ```bash
   chmod 700 ~/.watchtower/traces
   ```

### Multi-Agent Issues

**Symptom**: Agent transfers not appearing in traces

**Solutions**:
1. Verify using Google ADK framework (full multi-agent support)
2. Check that agents are properly configured in Sequential/Parallel/Loop
3. Verify agent names are unique for proper tracking

**Symptom**: Cannot distinguish between agents in timeline

**Solutions**:
1. Use descriptive agent names
2. Enable multi-agent timeline view: `watchtower show last --view multi-agent`
3. Filter by agent: `watchtower show last --agent agent_name`

## Getting Help

- GitHub Issues: https://github.com/Watchtower-Labs/watchtower-cli/issues
- Documentation: https://github.com/Watchtower-Labs/watchtower-cli/blob/main/docs/
- Multi-Agent Guide: https://github.com/Watchtower-Labs/watchtower-cli/blob/main/docs/MULTI_AGENT.md
```

**Estimated Time**: 3-4 hours

---

**Create**: `docs/MIGRATION.md`

**Content**:
```markdown
# Migration Guide

## Upgrading from Previous Versions

### Version 0.1.0 Breaking Changes

None expected for initial release.

### Future Versions

This section will be updated with breaking changes for future versions.

## Migration Steps

1. Update to latest version:
   ```bash
   pip install --upgrade watchtower-adk
   npm update -g @watchtower/cli
   ```

2. Run migration tests (if provided)

3. Review breaking changes in this guide

4. Update code as needed

5. Verify traces still work correctly
```

**Estimated Time**: 1-2 hours

---

## 🟡 P1 - Testing Issues (Should Fix Before Launch)

### Issue #1: Increase Test Coverage

**Target**: >80% coverage for critical paths

**Current Gaps**:
1. Streaming parser edge cases
2. Rate limiter boundary conditions
3. Error handling paths
4. Security features (sanitization, validation)
5. Framework auto-detection

**Solution**: Add comprehensive tests

**Steps**:
1. Run coverage to identify gaps:
   ```bash
   coverage run -m pytest tests/
   coverage report --show-missing
   ```

2. Prioritize uncovered code:
   - Critical paths (parsing, writers)
   - Security functions
   - Error handling

3. Write tests for prioritized areas:
   - Unit tests for individual functions
   - Integration tests for workflows
   - Edge case tests

**Estimated Time**: 3-5 days

---

### Issue #2: Add Integration Tests

**Problem**: No end-to-end tests for complete workflows

**Solution**: Create integration test suite

**Test Scenarios**:
1. Complete agent run with trace generation
2. Live tailing workflow
3. CLI show command with real trace
4. Configuration persistence
5. Multi-framework traces

**Estimated Time**: 2-3 days

---

### Issue #3: Add Stress Tests

**Problem**: No performance testing for large traces

**Solution**: Enhance nightly-stress tests

**Test Scenarios**:
1. 10,000 event trace file
2. 100MB trace file
3. Rapid event generation (1000 events/sec)
4. Concurrent trace writing

**Estimated Time**: 2-3 days

---

## 🟢 P2 - Code Quality Issues

### Issue #1: Reduce ESLint Disabled Rules

**Target**: Reduce from 45+ to <10 disabled rules

**Approach**:
1. Analyze each disabled rule
2. Enable in batches
3. Fix resulting issues
4. Document remaining disables

**Estimated Time**: 1-2 days

---

### Issue #2: Fix Import Order

**Approach**:
1. Identify all `# noqa: E402` violations
2. Refactor to fix root cause (circular deps)
3. Move imports to top
4. Use lazy imports only where necessary

**Estimated Time**: 4-6 hours

---

### Issue #3: Add Type Annotations

**Target**: Full type coverage for all public APIs

**Approach**:
1. Run mypy with strict mode
2. Add type hints to all functions
3. Fix type errors
4. Add type stubs for external libs

**Estimated Time**: 2-3 days

---

### Issue #4: Add Pre-commit Hooks

**Create**: `.pre-commit-config.yaml`

```yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.5.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-toml

  - repo: https://github.com/psf/black
    rev: 24.1.1
    hooks:
      - id: black

  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.2.1
    hooks:
      - id: ruff
        args: [--fix]

  - repo: https://github.com/pre-commit/mirrors-prettier
    rev: v3.1.0
    hooks:
      - id: prettier
```

**Estimated Time**: 1-2 hours

---

## 🟢 P2 - Security Hardening

### Issue #1: Add File Permissions

**Location**: `watchtower/writers/file_writer.py`

**Solution**: Explicit permissions
```python
import os

# In FileWriter.__init__
os.makedirs(self.trace_dir, mode=0o700, exist_ok=True)

# In FileWriter.write_event
fd = os.open(file_path, os.O_WRONLY | os.O_CREAT, 0o600)
```

**Estimated Time**: 1-2 hours

---

### Issue #2: Review Debug Mode

**Location**: `watchtower/plugin.py`

**Solution**: Add warning for debug mode
```python
if os.getenv("WATCHTOWER_DEBUG"):
    logger.warning("Debug mode enabled - sensitive information may be logged")
```

**Estimated Time**: 1 hour

---

### Issue #3: Add Security Documentation

**Create**: `docs/SECURITY.md`

**Content**:
- Security model
- Threat analysis
- Security controls
- Vulnerability reporting
- Security best practices

**Estimated Time**: 2-3 hours

---

## 🟢 P2 - Package Configuration

### Issue #1: Standardize Package Manager

**Current Issue**: Mixed npm/pnpm usage

**Solution**: Consistently use pnpm

**Steps**:
1. Update all workflows to use pnpm
2. Update documentation to reference pnpm
3. Add npm compatibility note if needed

**Estimated Time**: 2-3 hours

---

### Issue #2: Add Version Bumping

**Solution**: Automated version management

**Tools**: semantic-release or standard-version

**Estimated Time**: 2-3 hours

---

## 🟢 P2 - UI/UX Improvements

### Issue #1: Multi-Agent UI Enhancements

**Problem**: Current UI has basic multi-agent support but lacks dedicated views

**Solution**: Enhance UI for multi-agent visualization

**Features to Add**:

1. **Multi-Agent Timeline View** (`packages/cli/src/components/MultiAgentTimeline.tsx`)
   - Visual representation of agent handoffs
   - Swimlane-style display showing parallel agent activity
   - Transfer arrows between agents
   - Agent state indicators (active, waiting, completed)

2. **Agent Graph View** (`packages/cli/src/components/AgentGraph.tsx`)
   - Node-based visualization of agent relationships
   - Parent-child hierarchy display
   - Execution flow diagram
   - Interactive agent selection

3. **Agent Panel Enhancement** (`packages/cli/src/components/AgentPanel.tsx`)
   - Per-agent metrics (LLM calls, tokens, duration)
   - Agent comparison table
   - Transfer history per agent
   - Performance heat map

4. **Multi-Agent Filtering**
   - Filter by agent name (`--agent researcher`)
   - Filter by transfer events only (`--transfers-only`)
   - Filter by agent relationship (`--parent/--child`)
   - Combine filters (`--agent writer --transfers-only`)

**Implementation Steps**:
1. Create `MultiAgentTimeline.tsx` component
2. Create `AgentGraph.tsx` component
3. Enhance `AgentPanel.tsx` with multi-agent metrics
4. Add multi-agent filtering to `lib/filter.ts`
5. Update CLI commands with multi-agent flags
6. Add multi-agent view mode to `show.tsx`

**Estimated Time**: 3-4 days

---

### Issue #2: Accessibility Audit

---

## 🔵 P3 - Deployment Readiness

### Issue #1: Release Checklist

**Create**: `RELEASE_CHECKLIST.md`

**Content**:
- All tests passing
- Security scan clean
- Coverage >80%
- Documentation complete
- Examples working
- CHANGELOG updated
- Version tagged
- Release notes written

**Estimated Time**: 1-2 hours

---

### Issue #2: Automated Publishing

**Solution**: Configure automated releases

**Platforms**:
1. PyPI for Python SDK
2. npm for TypeScript CLI

**Estimated Time**: 2-3 hours

---

### Issue #3: Launch Content

**Content to Prepare**:
1. Announcement blog post
2. Demo scripts
3. Video walkthrough
4. Social media posts
5. Community forum posts

**Estimated Time**: 1-2 days

---

## Implementation Timeline

### Week 1: Critical Blocking (P0)
- Days 1-2: Fix NotImplementedError, dual README, broken links
- Days 3-4: Fix CI/CD issues (coverage, security, Windows, caching)
- Days 5: Fix build inconsistencies, add linting

### Week 2: Documentation & Testing (P1)
- Days 1-2: Create missing example files, update framework status
- Days 3-4: Create multi-agent examples, documentation, and UI enhancements
- Days 5: Add troubleshooting guide, migration guide

### Week 3: Code Quality (P2)
- Days 1-2: Reduce ESLint rules, fix import order
- Days 3-4: Add type annotations, pre-commit hooks
- Days 5: Security hardening
- Multi-agent UI enhancements (continue if needed)

### Week 4: Package & Deployment (P2-P3)
- Days 1-2: Package configuration, accessibility audit
- Days 3-4: Deployment readiness, automated publishing
- Days 5: Launch content preparation
- Complete multi-agent features (finish if needed)

### Week 4: Package & Deployment (P2-P3)
- Days 1-2: Package configuration, UI/UX audit
- Days 3-4: Deployment readiness, automated publishing
- Days 5: Launch content preparation

### Week 5-6: Buffer & Launch
- Days 1-5: Address any discovered issues, final testing
- Day 6: Launch!

---

## Risk Mitigation

### High-Risk Items

1. **Windows Compatibility**
   - Risk: New to testing, unknown issues
   - Mitigation: Start Windows testing early, fix issues incrementally

2. **Test Coverage Gaps**
   - Risk: Uncovered code contains bugs
   - Mitigation: Prioritize critical paths, add integration tests

3. **Framework Removal**
   - Risk: Users expect LangChain/AutoGen support
   - Mitigation: Clear communication, future roadmap

### Contingency Plans

1. If Windows testing reveals major issues:
   - Document known limitations
   - Add Windows-specific setup instructions
   - Target next release for full support

2. If ESLint fixes too difficult:
   - Prioritize high-impact rules
   - Document reasons for remaining disables
   - Create technical debt issue

3. If test coverage target not met:
   - Accept 70% for launch
   - Create post-launch task to reach 80%

---

## Success Criteria

### Launch Criteria (Must Have)
- ✅ All P0 issues resolved
- ✅ CI/CD pipeline green on main branch
- ✅ All tests passing
- ✅ Documentation complete with no broken links
- ✅ Examples working and tested
- ✅ Security scan clean
- ✅ Windows support verified

### Launch Criteria (Should Have)
- ✅ Test coverage >70%
- ✅ All P1 issues resolved
- ✅ Pre-commit hooks configured
- ✅ Accessibility audit complete

### Launch Criteria (Nice to Have)
- ✅ Test coverage >80%
- ✅ All P2 issues resolved
- ✅ Launch content prepared
- ✅ Demo scripts ready

---

## Post-Launch Tasks

1. Monitor GitHub issues and respond promptly
2. Gather user feedback and prioritize improvements
3. Fix bugs discovered in production
4. Plan v0.2.0 roadmap based on feedback
5. Continue work on LangChain/AutoGen adapters
6. Improve documentation based on common questions

---

## Multi-Agent Support Summary

### Current Status

Watchtower has **built-in infrastructure** to support multi-agent systems:

| Component | Status | Notes |
|-----------|--------|-------|
| **Data Model** | ✅ Ready | `TransferEvent` with `from_agent`, `to_agent`, `reason` |
| **Event Capture** | ✅ Working | `agent.transfer` events captured from Google ADK |
| **CLI Display** | ✅ Basic | Timeline shows agent transitions, filtering by agent |
| **Documentation** | ⚠️ Incomplete | Needs clear multi-agent capability documentation |
| **Examples** | ❌ Missing | No multi-agent demonstration code |
| **UI Enhancements** | 🚧 Planned | Dedicated multi-agent views for v0.2.0 |

### Multi-Agent Framework Support

| Framework | Multi-Agent Support | Status |
|-----------|-------------------|---------|
| **Google ADK** | ✅ Full | Production - Sequential, Parallel, Loop, Parent-Child patterns |
| **Anthropic Claude** | ⚠️ Limited | Production - Single agent focus, manual multi-agent possible |
| **OpenAI GPT** | ⚠️ Limited | Production - Single agent focus, manual multi-agent possible |
| **LangChain** | ❌ Not Supported | Planned for Q2 2026 |
| **AutoGen** | ❌ Not Supported | Planned for Q3 2026 |

### Google ADK Multi-Agent Patterns

#### 1. Sequential Agents
- **Purpose**: Step-by-step workflows
- **Use Case**: Requirements → Architecture → Implementation → Testing
- **Tracing**: Each agent's `run.start`/`run.end` + `agent.transfer` events

#### 2. Parallel Agents
- **Purpose**: Concurrent task execution
- **Use Case**: News research + Academic research + Social research
- **Tracing**: Parallel agent runs with timestamp overlaps

#### 3. Loop Agents
- **Purpose**: Iterative optimization
- **Use Case**: Code review → Improvement → Review again
- **Tracing**: Multiple iterations with same agents

#### 4. Parent-Child Agents
- **Purpose**: Hierarchical task delegation
- **Use Case**: Orchestrator delegates to Researcher, Writer, Editor
- **Tracing**: Parent orchestrates, child agents execute tasks

### Multi-Agent Examples to Create

| File | Purpose | Pattern |
|------|---------|----------|
| `examples/multi_agent_basic.py` | Parent-child hierarchy | Orchestrator + Specialist agents |
| `examples/multi_agent_sequential.py` | Sequential workflow | Development pipeline |
| `examples/multi_agent_parallel.py` | Parallel execution | Research team |
| `examples/multi_agent_loop.py` | Iterative optimization | Code refinement loop |

### Multi-Agent Documentation to Create

1. **`docs/MULTI_AGENT.md`** - Comprehensive multi-agent guide
   - Overview of multi-agent patterns
   - Google ADK orchestration examples
   - Tracing multi-agent workflows
   - Best practices and common pitfalls

2. **`README.md`** - Add multi-agent section
   - Clear framework capability comparison
   - Multi-agent example references
   - When to use each pattern

3. **`docs/TROUBLESHOOTING.md`** - Add multi-agent issues
   - Agent transfer not appearing
   - Cannot distinguish between agents
   - Parallel execution timing issues

### Multi-Agent UI Enhancements (Post-Launch)

| Feature | Component | Estimated Effort |
|---------|-----------|------------------|
| Multi-Agent Timeline View | `MultiAgentTimeline.tsx` | 1-2 days |
| Agent Graph Visualization | `AgentGraph.tsx` | 1-2 days |
| Enhanced Agent Panel | `AgentPanel.tsx` | 1 day |
| Multi-Agent Filtering | `lib/filter.ts` | 0.5 day |
| CLI Multi-Agent Flags | Commands | 0.5 day |
| **Total** | | **4-6 days** |

### Multi-Agent Testing Requirements

1. **Test agent.transfer events** are captured correctly
2. **Test parallel agent execution** timing accuracy
3. **Test loop agent iterations** are tracked separately
4. **Test parent-child agent hierarchies** state management
5. **Test multi-agent filtering** works correctly
6. **Test agent panel metrics** for multiple agents

### Launch Readiness for Multi-Agent

| Item | Status | Action Required |
|------|--------|----------------|
| Data model | ✅ Ready | None |
| Event capture | ✅ Working | None |
| Basic UI | ✅ Working | None |
| Documentation | ❌ Incomplete | Create docs/MULTI_AGENT.md |
| Examples | ❌ Missing | Create 4 multi-agent examples |
| README updates | ❌ Needed | Add multi-agent section |
| Advanced UI | 🚧 Planned | Post-launch feature |
| Testing | ⚠️ Partial | Add multi-agent test cases |

### Multi-Agent Launch Criteria

**Must Have for Launch**:
- ✅ Data model supports `agent.transfer` events
- ✅ CLI displays agent transitions
- ✅ Google ADK multi-agent examples created
- ✅ Documentation clarifies multi-agent support
- ✅ README distinguishes framework capabilities

**Should Have for Launch**:
- ⚠️ Comprehensive multi-agent guide created
- ⚠️ Troubleshooting guide includes multi-agent issues
- ⚠️ Multi-agent test coverage >70%

**Nice to Have (Post-Launch)**:
- 🚧 Dedicated multi-agent timeline view
- 🚧 Agent graph visualization
- 🚧 Enhanced agent panel with comparison
- 🚧 Multi-agent filtering options

---

## Conclusion

This plan provides a comprehensive path to launch readiness. The project is approximately 75% ready, with the main blockers being:

1. Removing unsupported framework claims
2. Fixing CI/CD gaps
3. Completing documentation
4. Increasing test coverage

With focused effort over 4-6 weeks, Watchtower CLI can be production-ready and provide significant value to the AI developer community.

---

**Document Version**: 1.0
**Last Updated**: 2025-02-22
**Maintainer**: Watchtower Team
