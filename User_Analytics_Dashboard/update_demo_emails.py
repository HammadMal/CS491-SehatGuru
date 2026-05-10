import random
from pathlib import Path

import firebase_admin
from firebase_admin import credentials, firestore


APP_ROOT = Path(__file__).resolve().parent.parent
CREDS_PATH = APP_ROOT / "backend" / "firebase-credentials.json"
SEED_BATCH = "analytics_demo_2026_05_11"


def init_firestore():
    if not CREDS_PATH.exists():
        raise FileNotFoundError(f"Firebase credentials not found: {CREDS_PATH}")

    if not firebase_admin._apps:
        cred = credentials.Certificate(str(CREDS_PATH))
        firebase_admin.initialize_app(cred)

    return firestore.client()


def gmail_from_user(user_data: dict, fallback_index: int) -> str:
    full_name = str(user_data.get("full_name") or f"demo user {fallback_index}").lower()
    parts = [part for part in full_name.replace("-", " ").split() if part.isalpha()]
    first = parts[0] if parts else "demo"
    last = parts[-1] if len(parts) > 1 else "user"
    return f"{first}.{last}{random.randint(1000, 9999)}@gmail.com"


def main():
    db = init_firestore()

    users = list(
        db.collection("users")
        .where("seed_batch", "==", SEED_BATCH)
        .where("synthetic", "==", True)
        .stream()
    )

    if not users:
        print(f"No synthetic users found for seed_batch={SEED_BATCH}")
        return

    email_by_uid = {}
    batch = db.batch()

    for index, doc in enumerate(users, start=1):
        user_data = doc.to_dict()
        new_email = gmail_from_user(user_data, index)
        email_by_uid[doc.id] = new_email
        batch.update(doc.reference, {"email": new_email})

    feedback_docs = list(
        db.collection("feedback_submissions")
        .where("seed_batch", "==", SEED_BATCH)
        .where("synthetic", "==", True)
        .stream()
    )

    updated_feedback = 0
    for doc in feedback_docs:
        data = doc.to_dict()
        uid = data.get("userId")
        if uid in email_by_uid:
            batch.update(doc.reference, {"userEmail": email_by_uid[uid]})
            updated_feedback += 1

    batch.commit()

    print(f"Updated users={len(email_by_uid)}, feedback_submissions={updated_feedback}")
    print(f"seed_batch={SEED_BATCH}")


if __name__ == "__main__":
    main()
