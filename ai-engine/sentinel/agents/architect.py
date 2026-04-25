from nodes.architect import architect_node


# Backward-compatible import path
__all__ = ["architect_node"]
from dotenv import load_dotenv
from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI

from sentinel.state import SentinelState

load_dotenv()


ARCHITECT_SYSTEM_PROMPT = dedent(
    """
    You are a QA Architect for SentinelQA. Given codebase context, generate a Markdown E2E test plan.
    
    CRITICAL: Your test plan will be parsed by an automated test runner that understands these actions:
    - Navigate to <url>          → opens the URL in a headless browser
    - Take a snapshot of the page → captures accessibility tree
    - Assert the page contains "<exact visible text>" → checks page content (use REAL text from the code)
    - Click the "<element text>" button/link → clicks an element
    - Type "<text>" into the <field name> field → types into an input
    - Wait for 2 seconds → pauses execution
    - Hover over the "<element>" → hovers
    
    RULES:
    1. Use numbered steps (1. 2. 3. etc)
    2. For assertions, use EXACT text that appears in the source code (e.g., page titles, headings, button labels)
    3. Start each test suite with a Navigate step using the full target_url
    4. Always take a snapshot after navigation
    5. Keep test suites focused — 3-6 steps each
    6. Use ## for test suite headers
    """
).strip()


def _mock_test_plan(state: SentinelState) -> str:
    changed = state.get("changed_files", [])
    changed_text = ", ".join(changed[:5]) if changed else "N/A"
    target_url = state.get('target_url', 'http://localhost:3000')
    return dedent(
        f"""
        ## Architect Test Plan (Mock)

        ### Context
        - Repo: {state.get('repo_url', 'unknown')}
        - Branch: {state.get('branch', 'main')}
        - Changed files: {changed_text}

        ## Test Suite 1: Landing Page Loads
        1. Navigate to {target_url}
        2. Take a snapshot of the page
        3. Assert the page contains "Autonomous Quality Engineering"
        4. Assert the page contains "Start Testing"

        ## Test Suite 2: Auth Page Accessible
        1. Navigate to {target_url}/auth
        2. Take a snapshot of the page
        3. Assert the page contains "Sign"

        ## Test Suite 3: Navigation Structure
        1. Navigate to {target_url}
        2. Take a snapshot of the page
        3. Assert the page contains "SentinelQA"
        4. Assert the page contains "How It Works"
        """
    ).strip()


def _build_architect_llm():
    provider = os.getenv("LLM_PROVIDER", "openai").strip().lower()

    if provider == "openai":
        openai_key = os.getenv("OPENAI_API_KEY", "").strip()
        if not openai_key:
            return None
        model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        return ChatOpenAI(model=model, temperature=0)

    if provider == "gemini":
        gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
        if not gemini_key:
            return None
        model = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
        return ChatGoogleGenerativeAI(model=model, google_api_key=gemini_key, temperature=0)

    if provider == "anthropic":
        anthropic_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
        if not anthropic_key:
            return None
        model = os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-20241022")
        return ChatAnthropic(model=model, temperature=0)

    return None


def architect_node(state: SentinelState) -> SentinelState:
    llm = _build_architect_llm()

    if llm is None:
        state["test_plan"] = _mock_test_plan(state)
        state["test_plan_approved"] = False
        return state

    target_url = state.get('target_url', 'http://localhost:3000')
    code_context = state.get('code_context', '')

    user_prompt = dedent(
        f"""
        Repository: {state.get('repo_url', 'unknown')}
        Branch: {state.get('branch', 'main')}
        Commit: {state.get('commit_sha', 'unknown')}
        Changed files: {state.get('changed_files', [])}
        Target URL: {target_url}

        Code Context:
        {code_context[:3000]}

        Generate a Markdown test plan. Use the target_url for all Navigate steps.
        For assertions, use exact text found in the code context above.
        """
    ).strip()

    response = llm.invoke(
        [
            {"role": "system", "content": ARCHITECT_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ]
    )

    state["test_plan"] = response.content if isinstance(response.content, str) else str(response.content)
    state["test_plan_approved"] = False
    return state
