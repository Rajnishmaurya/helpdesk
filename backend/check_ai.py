"""
check_ai.py - one-off smoke test: sends the two demo tickets to the REAL model in .env
and prints what comes back. Uses the same ai_service code the API uses.

Run from the backend/ folder:   python check_ai.py
Needs: backend/.env filled in, and app/config.py (from Person B) in place.
Not part of the pytest suite, because it calls the real API and uses your free quota.
"""
from app.config import settings
from app.services.ai_service import (AIInvalidOutputError, AITimeoutError,
                                     AIUnavailableError, analyse_ticket)

# The two tickets the assessment's Scenario 01 and Scenario 02 describe
DEMO_TICKETS = [
    ("Scenario 01", "Wireless keyboard not typing",
     "My wireless keyboard stopped responding this morning. The mouse still works."),
    ("Scenario 02", "Shared drive down for the whole Finance department",
     "Since 9 am nobody in Finance can open the shared drive. Month-end reports are blocked."),
]

print(f"Model: {settings.OPENROUTER_MODEL}\nEndpoint: {settings.OPENROUTER_BASE_URL}\n")   # never print the key

for label, title, description in DEMO_TICKETS:
    try:
        result = analyse_ticket(0, title, description)   # 0 = not a real ticket, only used in log lines
        print(f"{label}: {result.category} / {result.priority}")
        print(f"  Reason: {result.priority_reason}")
        for step in result.troubleshooting_steps:
            print(f"  - {step}")
    # Each failure type points to a different fix
    except AIUnavailableError:
        print(f"{label}: UNAVAILABLE - check OPENROUTER_API_KEY, OPENROUTER_MODEL, or wait if rate limited (429)")
    except AITimeoutError:
        print(f"{label}: TIMEOUT - raise AI_TIMEOUT_SECONDS in .env or try a faster model")
    except AIInvalidOutputError:
        print(f"{label}: INVALID OUTPUT - this model ignores the JSON format; try another free model")
    print()
