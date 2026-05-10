import argparse
import random
import string
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4

import firebase_admin
from firebase_admin import credentials, firestore


APP_ROOT = Path(__file__).resolve().parent.parent
CREDS_PATH = APP_ROOT / "backend" / "firebase-credentials.json"

SEED_BATCH = "analytics_demo_2026_05_11"

FIRST_NAMES = [
    "Ayesha", "Bilal", "Hira", "Saad", "Maham",
    "Usman", "Zainab", "Danish", "Sana", "Hamza",
]
LAST_NAMES = [
    "Khan", "Ahmed", "Malik", "Raza", "Sheikh",
    "Ali", "Hussain", "Farooq", "Qureshi", "Javed",
]

HEALTH_GOALS = [
    ["lose-weight"],
    ["maintain-weight"],
    ["gain-weight"],
    ["build-muscle"],
    ["improve-health"],
    ["manage-condition"],
    ["lose-weight", "improve-health"],
    ["build-muscle", "maintain-weight"],
]

ACTIVITY_LEVELS = [
    "sedentary",
    "lightly-active",
    "moderately-active",
    "very-active",
]

FOODS = [
    ("Chicken Biryani", "Lunch", 300, 510, 24, 72, 16, "camera"),
    ("Dal Chawal", "Lunch", 350, 460, 18, 78, 7, "manual"),
    ("Anda Paratha", "Breakfast", 220, 390, 16, 42, 18, "manual"),
    ("Chicken Karahi", "Dinner", 280, 430, 35, 12, 27, "camera"),
    ("Chana Chaat", "Snack", 180, 240, 10, 40, 5, "manual"),
    ("Saag with Roti", "Dinner", 300, 360, 14, 52, 11, "manual"),
    ("Dahi Baray", "Snack", 200, 290, 12, 38, 9, "camera"),
    ("White Chicken Pulao", "Lunch", 320, 480, 26, 66, 13, "camera"),
    ("Paratha", "Breakfast", 120, 310, 7, 35, 16, "manual"),
    ("Haleem", "Dinner", 300, 420, 25, 48, 14, "manual"),
]

FEEDBACK_SECTIONS = [
    (
        "chatbot",
        "Chatbot Feedback",
        [
            ("chatbot_accuracy", "How trustworthy did the nutrition advice provided by the chatbot feel to you?"),
            ("chatbot_safety", "How safe and appropriate were the chatbot recommendations?"),
            ("chatbot_relevance", "How relevant was the chatbot response to your question?"),
            ("chatbot_completeness", "How completely did the chatbot address all aspects of your query?"),
            ("chatbot_clarity", "How clear and understandable was the chatbot response?"),
        ],
    ),
    (
        "camera",
        "Camera Feedback",
        [
            ("camera_detection_accuracy", "How accurately did the camera feature identify your meal?"),
            ("camera_speed", "How satisfied were you with how quickly the camera feature returned a result?"),
            ("camera_ease_of_use", "How easy was it to capture and submit a meal photo?"),
            ("camera_result_usefulness", "How useful were the details shown after the camera detected your meal?"),
            ("camera_trust", "How confident are you that the detected meal matches what you actually ate?"),
        ],
    ),
    (
        "meal_logging",
        "Meal Logging Feedback",
        [
            ("logging_speed", "How easy was it to log a meal in the app?"),
            ("logging_editing", "How easy was it to review or manage your logged meals afterward?"),
            ("logging_trust", "How accurate do you believe the nutrition values of your logged meals are?"),
        ],
    ),
    (
        "meal_planning",
        "Meal Planning Feedback",
        [
            ("planning_personalization", "How personalized did the meal plan feel for your goals and preferences?"),
            ("planning_practicality", "How practical and feasible in your daily routine were the meal plan suggestions?"),
            ("planning_helpfulness", "How helpful was the meal planning feature overall?"),
        ],
    ),
    (
        "usability",
        "Overall Usability",
        [
            ("usability_navigation", "How easy was it to navigate around the app?"),
            ("usability_design", "How clear and intuitive was the app interface?"),
            ("usability_overall", "Overall, how satisfied are you with SehatGuru?"),
            ("usability_retention", "How likely are you to continue using SehatGuru regularly?"),
        ],
    ),
]

GENERAL_COMMENTS = [
    "The dashboard and meal logging are useful for keeping track of daily eating habits.",
    "Camera detection worked well for common Pakistani meals, but I sometimes had to choose from options.",
    "Meal plans felt practical and mostly matched food I already eat at home.",
    "The chatbot gave clear advice, especially when I asked about calories and portion sizes.",
    "Manual logging is helpful when camera detection is unsure. More food options would make it better.",
    "The app is easy to navigate and the calorie summary is simple to understand.",
    "I liked the Pakistani food focus. Some portion recommendations could be more specific.",
    "Feedback and meal planning features are useful, but loading time can be improved.",
    "The macro breakdown helped me understand what I was eating during the day.",
    "Overall the app feels helpful for routine nutrition tracking.",
]

IMPROVEMENT_COMMENTS = {
    "chatbot": [
        "Add more examples with local serving sizes.",
        "Make answers shorter when the question is simple.",
        "Include alternatives for common household ingredients.",
    ],
    "camera": [
        "Improve detection when lighting is low.",
        "Add more dishes to the image model.",
        "Show confidence in a simpler way.",
    ],
    "meal_logging": [
        "Let users duplicate a meal from yesterday.",
        "Make portion editing faster.",
        "Add more common homemade dishes.",
    ],
    "meal_planning": [
        "Keep meal plans simpler for weekdays.",
        "Avoid repeating similar dishes in one day.",
        "Add budget-friendly meal plan options.",
    ],
    "usability": [
        "Make analytics easier to find.",
        "Add clearer empty states for new users.",
        "Improve some button labels.",
    ],
}


def init_firestore():
    if not CREDS_PATH.exists():
        raise FileNotFoundError(f"Firebase credentials not found: {CREDS_PATH}")

    if not firebase_admin._apps:
        cred = credentials.Certificate(str(CREDS_PATH))
        firebase_admin.initialize_app(cred)

    return firestore.client()


def iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat()


def calculate_goals(age: int, gender: str, height_cm: float, weight_kg: float, activity_level: str, goals: list[str]):
    bmr = (10 * weight_kg) + (6.25 * height_cm) - (5 * age)
    bmr += 5 if gender == "male" else -161

    multipliers = {
        "sedentary": 1.2,
        "lightly-active": 1.375,
        "moderately-active": 1.55,
        "very-active": 1.725,
        "extra-active": 1.9,
    }
    tdee = bmr * multipliers.get(activity_level, 1.2)

    adjustment = 0
    if "lose-weight" in goals:
        adjustment = -min(500, int(0.20 * tdee))
    elif "gain-weight" in goals or "build-muscle" in goals:
        adjustment = min(400, int(0.15 * tdee))

    calories = int(tdee + adjustment)
    if "gain-weight" in goals or "build-muscle" in goals:
        carb_pct, protein_pct, fat_pct = 0.50, 0.25, 0.25
    else:
        carb_pct, protein_pct, fat_pct = 0.45, 0.30, 0.25

    return {
        "daily_calorie_goal": calories,
        "bmr": round(bmr, 1),
        "tdee": round(tdee, 1),
        "goal_adjustment": adjustment,
        "calculation_method": "mifflin-st-jeor-1990",
        "calorie_last_calculated_at": datetime.now(timezone.utc),
        "daily_carbs_goal": int((calories * carb_pct) / 4),
        "daily_protein_goal": int((calories * protein_pct) / 4),
        "daily_fat_goal": int((calories * fat_pct) / 9),
    }


def bcrypt_like_hash() -> str:
    alphabet = string.ascii_letters + string.digits + "./"
    body = "".join(random.choice(alphabet) for _ in range(53))
    return "$2b$12$" + body


def build_user(index: int):
    first = FIRST_NAMES[index]
    last = random.choice(LAST_NAMES)
    uid = f"demo_{SEED_BATCH}_{index + 1:02d}_{uuid4().hex[:8]}"
    created_at = datetime.now(timezone.utc) - timedelta(days=random.randint(3, 65))
    age = random.randint(19, 48)
    gender = random.choice(["male", "female"])
    height = random.randint(154, 185)
    weight = random.randint(52, 96)
    activity = random.choice(ACTIVITY_LEVELS)
    goals = random.choice(HEALTH_GOALS)

    profile = {
        "full_name": f"{first} {last}",
        "height": str(height),
        "height_unit": "cm",
        "weight": str(weight),
        "weight_unit": "kg",
        "age": str(age),
        "gender": gender,
    }

    dietary = {
        "vegetarian": random.random() < 0.18,
        "vegan": False,
        "gluten_free": random.random() < 0.08,
        "other": random.choice(["none", "none", "none", "low sugar", "less oily food"]),
    }

    meal_preferences = {
        "breakfast": True,
        "lunch": True,
        "dinner": True,
        "snacks": random.random() < 0.75,
    }

    return uid, {
        "email": f"{first.lower()}.{last.lower()}{random.randint(100, 999)}@gmail.com",
        "full_name": profile["full_name"],
        "email_verified": True,
        "hashed_password": bcrypt_like_hash(),
        "password_changed_at": created_at,
        "created_at": created_at,
        "updated_at": created_at + timedelta(days=random.randint(0, 3)),
        "last_login": datetime.now(timezone.utc) - timedelta(days=random.randint(0, 9)),
        "auth_provider": "email",
        "onboarding_completed": True,
        "profile_created_at": created_at + timedelta(minutes=random.randint(5, 90)),
        "basic_info": profile,
        "activity_level": activity,
        "health_goals": goals,
        "meal_preferences": meal_preferences,
        "dietary_preferences": dietary,
        "synthetic": True,
        "seed_batch": SEED_BATCH,
        **calculate_goals(age, gender, height, weight, activity, goals),
    }


def build_meals(uid: str):
    meals = []
    for _ in range(random.randint(4, 8)):
        food_name, meal_type, grams, calories, protein, carbs, fat, source = random.choice(FOODS)
        created_at = datetime.now(timezone.utc) - timedelta(
            days=random.randint(0, 21),
            hours=random.randint(0, 18),
            minutes=random.randint(0, 59),
        )
        variation = random.uniform(0.88, 1.12)
        meals.append({
            "userId": uid,
            "foodName": food_name,
            "mealType": meal_type,
            "grams": int(grams * variation),
            "calories": round(calories * variation, 1),
            "protein": round(protein * variation, 1),
            "carbs": round(carbs * variation, 1),
            "fat": round(fat * variation, 1),
            "source": source,
            "createdAt": iso(created_at),
            "synthetic": True,
            "seed_batch": SEED_BATCH,
        })
    return meals


def rating(base: int = 4):
    value = random.choices([3, 4, 5], weights=[0.18, 0.52, 0.30])[0]
    if base == 3:
        value = random.choices([2, 3, 4, 5], weights=[0.08, 0.34, 0.42, 0.16])[0]
    return value


def build_feedback(uid: str, email: str):
    sections = []
    weaker_section = random.choice(["camera", "meal_planning", "usability", ""])

    for section_id, title, questions in FEEDBACK_SECTIONS:
        base = 3 if section_id == weaker_section else 4
        sections.append({
            "section_id": section_id,
            "title": title,
            "improvement_comment": random.choice(IMPROVEMENT_COMMENTS[section_id]),
            "answers": [
                {
                    "question_id": question_id,
                    "question": question,
                    "rating": rating(base),
                }
                for question_id, question in questions
            ],
        })

    submitted_at = datetime.now(timezone.utc) - timedelta(days=random.randint(0, 14))
    return {
        "userId": uid,
        "userEmail": email,
        "sections": sections,
        "comment": random.choice(GENERAL_COMMENTS),
        "submitted_at": iso(submitted_at),
        "synthetic": True,
        "seed_batch": SEED_BATCH,
    }


def seed(count: int, write: bool):
    db = init_firestore()
    users = []
    meal_count = 0
    feedback_count = 0

    batch = db.batch()

    for index in range(count):
        uid, user = build_user(index % len(FIRST_NAMES))
        users.append(uid)

        user_ref = db.collection("users").document(uid)
        if write:
            batch.set(user_ref, user)

        for meal in build_meals(uid):
            meal_ref = db.collection("meals").document()
            meal_count += 1
            if write:
                batch.set(meal_ref, meal)

        feedback = build_feedback(uid, user["email"])
        feedback_ref = db.collection("feedback_submissions").document()
        feedback_count += 1
        if write:
            batch.set(feedback_ref, feedback)

    if write:
        batch.commit()

    mode = "WROTE" if write else "DRY RUN"
    print(f"{mode}: users={len(users)}, meals={meal_count}, feedback_submissions={feedback_count}")
    print(f"seed_batch={SEED_BATCH}")
    if not write:
        print("No Firestore documents were changed. Re-run with --write to insert demo data.")


def main():
    parser = argparse.ArgumentParser(description="Seed synthetic demo analytics data for SehatGuru.")
    parser.add_argument("--count", type=int, default=10, help="Number of synthetic users to create.")
    parser.add_argument("--write", action="store_true", help="Write documents to Firestore.")
    args = parser.parse_args()

    if args.count < 1:
        raise SystemExit("--count must be at least 1")
    if args.count > 100:
        raise SystemExit("--count is capped at 100 to avoid accidental large writes")

    seed(args.count, args.write)


if __name__ == "__main__":
    main()
