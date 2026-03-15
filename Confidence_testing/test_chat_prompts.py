"""
Chat Prompt Test Runner — SehatGuru
====================================
Runs the 60 test prompts (30 nutritional advice + 30 meal plan) against the
/api/chat/message/with-history endpoint and reports:
  - Intent classification accuracy (did the LLM classify the right intent?)
  - Guard rail pass rate (did valid prompts pass through?)
  - Response presence (did we get a non-empty response?)
  - Validation pass rate (for nutritional advice responses)

Usage:
    python test_chat_prompts.py
    python test_chat_prompts.py --category nutritional_advice
    python test_chat_prompts.py --category meal_plan_generation
    python test_chat_prompts.py --url http://your-server:8000 --token YOUR_JWT

Requirements:
    pip install requests pandas tabulate

Authentication:
    Set the SEHATGURU_TOKEN environment variable with a valid JWT, or pass --token.
    Get a token by logging in via POST /api/auth/login.
"""

import requests
import json
import os
import argparse
import time
from pathlib import Path
from typing import Optional

try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False

try:
    from tabulate import tabulate
    TABULATE_AVAILABLE = True
except ImportError:
    TABULATE_AVAILABLE = False


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

DEFAULT_API_URL = "http://localhost:8000"
TEST_CASES_FILE = Path(__file__).parent / "chat_test_cases.json"
RESULTS_FILE = Path(__file__).parent / "chat_test_results.csv"

# Will be overridden by --file argument if provided
_active_test_file: Path = TEST_CASES_FILE


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def load_test_data(category: Optional[str] = None) -> tuple:
    """Returns (test_cases, test_profile)."""
    with open(_active_test_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    test_profile = data.get("test_profile", {})

    # Collect all array-valued keys that are not test_profile
    all_categories = {k: v for k, v in data.items() if k != "test_profile" and isinstance(v, list)}

    if category and category in all_categories:
        cases = all_categories[category]
    elif category == "nutritional_advice":
        cases = data.get("nutritional_advice", [])
    elif category == "meal_plan_generation":
        cases = data.get("meal_plan_generation", [])
    elif category == "guard_rails":
        cases = data.get("guard_rails", [])
    elif category == "ambiguous_intent":
        cases = data.get("ambiguous_intent", [])
    else:
        # Concatenate all categories
        cases = []
        for v in all_categories.values():
            cases += v

    return cases, test_profile


def call_chat_api(
    api_url: str,
    token: str,
    prompt: str,
    user_context: Optional[dict] = None,
    preference_summary: Optional[str] = None,
    timeout: int = 60,
) -> dict:
    """Call /api/chat/message/with-history and return parsed response."""
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    body = {"message": prompt, "use_rag": True}
    if user_context:
        body["user_context"] = user_context
    if preference_summary is not None:
        body["user_memory_override"] = preference_summary

    response = requests.post(
        f"{api_url}/api/chat/message/with-history",
        headers=headers,
        json=body,
        timeout=timeout,
    )
    if response.status_code == 401:
        raise SystemExit("\nERROR: Token is invalid or expired. Get a fresh token from /api/auth/login or Swagger UI.\n")
    response.raise_for_status()
    return response.json()


def check_health(api_url: str) -> bool:
    try:
        r = requests.get(f"{api_url}/health", timeout=5)
        return r.status_code == 200
    except Exception:
        try:
            r = requests.get(f"{api_url}/docs", timeout=5)
            return r.status_code == 200
        except Exception:
            return False


# ---------------------------------------------------------------------------
# Main runner
# ---------------------------------------------------------------------------

def run_tests(api_url: str, token: str, category: Optional[str] = None) -> list:
    test_cases, test_profile = load_test_data(category)
    profile_ctx = test_profile.get("user_context", {})
    profile_summary = test_profile.get("preference_summary", "")
    results = []

    print(f"\nRunning {len(test_cases)} test cases...")
    print(f"Test profile  : age={profile_ctx.get('age')}, gender={profile_ctx.get('gender')}, "
          f"weight={profile_ctx.get('weight_kg')}kg, goals={profile_ctx.get('health_goals')}")
    print(f"Pref summary  : {profile_summary[:100]}{'...' if len(profile_summary) > 100 else ''}" if profile_summary else "Pref summary  : (none)")
    print("=" * 80)

    for i, tc in enumerate(test_cases, 1):
        tc_id = tc["id"]
        prompt = tc["prompt"]
        expected_intent = tc.get("expected_intent")
        tags = ", ".join(tc.get("tags", []))

        # Merge test_profile user_context with per-case overrides (case wins on conflict)
        user_context = {**profile_ctx, **tc.get("user_context", {})}

        print(f"[{i:02d}/{len(test_cases)}] {tc_id} — {prompt[:65]}{'...' if len(prompt) > 65 else ''}")

        # Guard rail and ambiguous cases have different expected fields
        expected_guard = tc.get("expected_guard_result")   # only on guard_rails cases
        is_guard_test = expected_guard is not None
        is_ambiguous = tc_id.startswith("AI-")

        result_row = {
            "ID": tc_id,
            "Category": expected_intent or ("guard_rails" if is_guard_test else "ambiguous_intent"),
            "Tags": tags,
            "Prompt": prompt,
            "Expected Intent": expected_intent or "N/A",
            "Actual Intent": "ERROR",
            "Intent Correct": False if expected_intent else None,
            "Expected Guard": expected_guard or "N/A",
            "Guard Result": "N/A",
            "Guard Check Correct": False if is_guard_test else None,
            "Response Length": 0,
            "Has Response": False,
            "Validation Passed": "N/A",
            "Response": "",
            "Error": "",
        }

        try:
            resp = call_chat_api(api_url, token, prompt, user_context, profile_summary)

            actual_intent = resp.get("intent", "")
            guard_result = resp.get("guard_result", "ok")
            response_text = resp.get("response", "")
            validation_passed = resp.get("validation_passed")

            intent_correct = (actual_intent == expected_intent) if expected_intent else None
            guard_check_correct = (guard_result == expected_guard) if is_guard_test else None
            has_response = bool(response_text and len(response_text.strip()) > 10)

            result_row.update({
                "Actual Intent": actual_intent or "(none — blocked)",
                "Intent Correct": intent_correct,
                "Guard Result": guard_result,
                "Guard Check Correct": guard_check_correct,
                "Response Length": len(response_text),
                "Has Response": has_response,
                "Validation Passed": str(validation_passed) if validation_passed is not None else "N/A",
                "Response": response_text,
            })

            intent_mark = ("✓" if intent_correct else "✗") if intent_correct is not None else "-"
            guard_mark = guard_result
            guard_correct_mark = ("✓" if guard_check_correct else "✗") if guard_check_correct is not None else ""
            print(f"        intent={intent_mark} ({actual_intent or 'none'}) | guard={guard_mark} {guard_correct_mark} | response={len(response_text)} chars")

        except requests.exceptions.HTTPError as e:
            result_row["Error"] = f"HTTP {e.response.status_code}: {e.response.text[:100]}"
            print(f"        ERROR: {result_row['Error']}")
        except Exception as e:
            result_row["Error"] = str(e)[:120]
            print(f"        ERROR: {result_row['Error']}")

        results.append(result_row)

        # Small delay to avoid hammering the API
        time.sleep(0.5)

    return results


# ---------------------------------------------------------------------------
# Reporting
# ---------------------------------------------------------------------------

def print_summary(results: list):
    total = len(results)
    errored = sum(1 for r in results if r["Error"])
    successful = total - errored

    intent_results = [r for r in results if r["Intent Correct"] is not None and not r["Error"]]
    guard_test_results = [r for r in results if r["Guard Check Correct"] is not None and not r["Error"]]
    has_response = sum(1 for r in results if r["Has Response"])

    intent_correct = sum(1 for r in intent_results if r["Intent Correct"])
    guard_correct = sum(1 for r in guard_test_results if r["Guard Check Correct"])

    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(f"Total test cases   : {total}")
    print(f"Successful calls   : {successful}")
    print(f"Errored calls      : {errored}")
    print()
    if intent_results:
        print(f"Intent accuracy    : {intent_correct}/{len(intent_results)} ({intent_correct/len(intent_results)*100:.1f}%)")
    if guard_test_results:
        print(f"Guard rail accuracy: {guard_correct}/{len(guard_test_results)} ({guard_correct/len(guard_test_results)*100:.1f}%)")
    print(f"Got response       : {has_response}/{successful} ({has_response/successful*100:.1f}%)" if successful else "N/A")

    # Break down by category
    categories = [
        ("Nutritional Advice",    "nutritional_advice"),
        ("Meal Plan Generation",  "meal_plan_generation"),
        ("Guard Rails",           "guard_rails"),
        ("Ambiguous Intent",      "ambiguous_intent"),
    ]
    for cat_name, cat_key in categories:
        cat_results = [r for r in results if r["Category"] == cat_key]
        if not cat_results:
            continue
        cat_ok = [r for r in cat_results if not r["Error"]]
        cat_intent = sum(1 for r in cat_ok if r["Intent Correct"])
        cat_guard = sum(1 for r in cat_ok if r["Guard Check Correct"])
        print(f"\n  {cat_name} ({len(cat_results)} cases):")
        if any(r["Intent Correct"] is not None for r in cat_ok):
            n = sum(1 for r in cat_ok if r["Intent Correct"] is not None)
            print(f"    Intent correct  : {cat_intent}/{n} ({cat_intent/n*100:.1f}%)" if n else "")
        if any(r["Guard Check Correct"] is not None for r in cat_ok):
            n = sum(1 for r in cat_ok if r["Guard Check Correct"] is not None)
            print(f"    Guard correct   : {cat_guard}/{n} ({cat_guard/n*100:.1f}%)" if n else "")

    # Failed cases
    failed_intent = [r for r in results if r["Intent Correct"] is False and not r["Error"]]
    if failed_intent:
        print(f"\nMISCLASSIFIED INTENTS ({len(failed_intent)}):")
        for r in failed_intent:
            print(f"  [{r['ID']}] expected={r['Expected Intent']} got={r['Actual Intent']}")
            print(f"       \"{r['Prompt'][:80]}\"")

    failed_guard = [r for r in results if r["Guard Check Correct"] is False and not r["Error"]]
    if failed_guard:
        print(f"\nFAILED GUARD RAIL CHECKS ({len(failed_guard)}):")
        for r in failed_guard:
            print(f"  [{r['ID']}] expected={r['Expected Guard']} got={r['Guard Result']}")
            print(f"       \"{r['Prompt'][:80]}\"")

    if errored:
        print(f"\nERRORED CASES ({errored}):")
        for r in results:
            if r["Error"]:
                print(f"  [{r['ID']}] {r['Error']}")


def save_results(results: list):
    if not PANDAS_AVAILABLE:
        # Fallback: write CSV manually
        if not results:
            return
        keys = list(results[0].keys())
        with open(RESULTS_FILE, "w", encoding="utf-8") as f:
            f.write(",".join(keys) + "\n")
            for r in results:
                row = [str(r.get(k, "")).replace(",", ";").replace("\n", " ") for k in keys]
                f.write(",".join(row) + "\n")
    else:
        df = pd.DataFrame(results)
        df.to_csv(RESULTS_FILE, index=False)

    print(f"\nResults saved to: {RESULTS_FILE}")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main():
    global _active_test_file, RESULTS_FILE

    parser = argparse.ArgumentParser(description="SehatGuru Chat Prompt Tester")
    parser.add_argument("--url", default=DEFAULT_API_URL, help="API base URL")
    parser.add_argument("--token", default=None, help="JWT Bearer token")
    parser.add_argument(
        "--category",
        default=None,
        help="Run only one category key from the JSON (default: all). E.g. nutritional_advice, meal_plan_generation, top20_questions",
    )
    parser.add_argument(
        "--file",
        default=None,
        help="Path to a test cases JSON file (default: chat_test_cases.json)",
    )
    args = parser.parse_args()

    # Override active test file and auto-derive results file name
    if args.file:
        _active_test_file = Path(args.file)
        RESULTS_FILE = _active_test_file.parent / (_active_test_file.stem + "_results.csv")

    api_url = args.url.rstrip("/")
    token = args.token or os.environ.get("SEHATGURU_TOKEN", "")

    if not token:
        print("ERROR: No auth token provided.")
        print("  Set SEHATGURU_TOKEN environment variable, or pass --token YOUR_JWT")
        print("  Get a token: POST /api/auth/login  { email, password }")
        return

    print("SehatGuru Chat Prompt Tester")
    print("=" * 80)
    print(f"API URL  : {api_url}")
    print(f"Category : {args.category or 'all'}")
    cases, _ = load_test_data(args.category)
    print(f"Cases    : {len(cases)}")

    if not check_health(api_url):
        print(f"\nWARNING: Could not reach {api_url} — proceeding anyway...")

    results = run_tests(api_url, token, args.category)
    print_summary(results)
    save_results(results)


if __name__ == "__main__":
    main()
