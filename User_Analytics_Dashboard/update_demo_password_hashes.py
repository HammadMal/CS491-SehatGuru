import random
import string
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


def bcrypt_like_hash() -> str:
    alphabet = string.ascii_letters + string.digits + "./"
    body = "".join(random.choice(alphabet) for _ in range(53))
    return "$2b$12$" + body


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

    batch = db.batch()
    for doc in users:
        batch.update(doc.reference, {"hashed_password": bcrypt_like_hash()})

    batch.commit()
    print(f"Updated hashed_password for synthetic users={len(users)}")
    print(f"seed_batch={SEED_BATCH}")


if __name__ == "__main__":
    main()
