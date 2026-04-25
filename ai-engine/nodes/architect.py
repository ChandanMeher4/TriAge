from __future__ import annotations

from textwrap import dedent

from graph.state import SentinelState
from llm.client import get_architect_llm, get_provider, is_real_only_mode

ARCHITECT_SYSTEM_PROMPT = dedent(
    """
    You are a QA architect for SentinelQA.
    You receive SOURCE CODE files from a web application repository and a target URL where the app is deployed.
    Your job: generate E2E test scenarios that verify the DEPLOYED WEBSITE works correctly.

    CRITICAL — WHAT TO TEST:
    - You must ONLY assert text that a REAL USER would see on screen when visiting the website.
    - Extract visible text from JSX/HTML elements: <h1>, <h2>, <p>, <span>, <button>, <a>, <Link>, <title>, etc.
    - Look for React Router / Next.js routes (e.g. "/team", "/history", "/about") and test each route.
    - Look for navigation links (<Link to="/team">, <NavLink>, <a href="/about">) to discover pages.

    CRITICAL — WHAT NEVER TO TEST:
    - NEVER assert filenames like "README.md", "App.jsx", "package.json", "Navbar.tsx"
    - NEVER assert folder names like "Client", "Server", "frontend", "src"  
    - NEVER assert git commit SHAs, email addresses, or GitHub usernames
    - NEVER assert import statements, variable names, or code syntax
    - NEVER assert "docker-compose.yml" or any config file name
    - These are SOURCE CODE artifacts, NOT visible website text!

    OUTPUT FORMAT:
    - Output only scenario headings (## Scenario: ...) and numbered steps
    - Each step must start with: Navigate, Assert, Click, Type, Wait, Select, or Hover
    - For Navigate: ALWAYS use the FULL URL (e.g. https://example.com/team), never relative paths
    - For Assert: use EXACT text strings from JSX/HTML content (e.g. "Meet Our Team", not "team")
    - For Click: use the exact button/link label text (e.g. Click "Sign Up")
    - Generate as many scenarios as the code supports — no minimum or maximum
    - Each route/page you find should get its own scenario

    Example:
    ## Scenario: Home page renders
    1. Navigate to https://example.com
    2. Assert page contains "Welcome to Our App"
    3. Click "Get Started"

    ## Scenario: Team page renders
    1. Navigate to https://example.com/team
    2. Assert page contains "Meet the Team"
    """
).strip()


def _validate_input(state: SentinelState) -> None:
    if not state.get("repo_url"):
        raise ValueError("state.repo_url is required")
    changed_files = state.get("changed_files")
    if changed_files is None:
        raise ValueError("state.changed_files is required (can be an empty list)")
    if not isinstance(changed_files, list):
        raise ValueError("state.changed_files must be a list[str]")


def _mock_test_plan(state: SentinelState) -> str:
    changed = state.get("changed_files", [])
    changed_text = ", ".join(changed[:5]) if changed else "None"
    target_url = (state.get("target_url") or "http://localhost:3000").rstrip("/")
    return dedent(
        f"""
        ## Architect Test Plan (Mock)

        Repository: {state.get('repo_url')}
        Changed Files: {changed_text}

        ## Scenario: Landing page loads
        1. Navigate to {target_url}
        2. Assert page contains "Welcome"

        ## Scenario: Page structure
        1. Navigate to {target_url}
        2. Take a snapshot of the page
        """
    ).strip()


def architect_node(state: SentinelState) -> dict[str, object]:
    _validate_input(state)

    if state.get("force_mock"):
        return {"test_plan": _mock_test_plan(state)}

    provider = get_provider()
    llm = get_architect_llm()
    if llm is None:
        if is_real_only_mode():
            raise RuntimeError(
                f"Architect requires a live LLM, but no API key is configured for provider '{provider}'"
            )
        return {"test_plan": _mock_test_plan(state)}

    target_url = (state.get("target_url") or "http://localhost:3000").rstrip("/")
    code_context = state.get("code_context", "")

    user_prompt = dedent(
        f"""
        Repository: {state['repo_url']}
        Target URL: {target_url}

        Below is the SOURCE CODE of the web application. 
        Read the JSX/HTML to find VISIBLE TEXT (headings, button labels, paragraphs) and ROUTES (pages/URLs).
        
        REMEMBER: File names, folder names, git SHAs, and email addresses are NOT visible on the website.
        Only text inside JSX tags like <h1>, <p>, <button>, <Link>, <a> is visible to users.

        Source Code:
        ```
        {code_context[:12000]}
        ```

        Generate E2E test scenarios for the deployed website at {target_url}.
        For each route/page you find in the code, create a Navigate + Assert scenario.
        Use FULL URLs (e.g. {target_url}/team) for all Navigate steps.
        """
    ).strip()

    try:
        response = llm.invoke(
            [
                {"role": "system", "content": ARCHITECT_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ]
        )
        content = response.content if isinstance(response.content, str) else str(response.content)
        return {"test_plan": content}
    except Exception as err:
        if is_real_only_mode():
            raise RuntimeError(
                f"Architect live LLM call failed for provider '{provider}': {err.__class__.__name__}"
            ) from err
        return {"test_plan": _mock_test_plan(state)}

