import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import type { MealPlanItem } from "../types/meal.types";

const COLLECTION = "meal_plans";

export async function saveMealPlanToFirestore(items: MealPlanItem[]): Promise<void> {
  const saves = items.map((item) => addDoc(collection(db, COLLECTION), item));
  await Promise.all(saves);
}

export async function fetchTodaysMealPlan(userId: string): Promise<MealPlanItem[]> {
  if (!userId) return [];

  try {
    const q = query(
      collection(db, COLLECTION),
      where("userId", "==", userId)
    );

    const snap = await getDocs(q);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    return snap.docs
      .map((d) => ({ ...(d.data() as MealPlanItem), id: d.id }))
      .filter((item) => new Date(item.createdAt) >= todayStart);
  } catch (err) {
    console.error("❌ Firestore meal_plans fetch failed:", err);
    return [];
  }
}

export async function markMealPlanItemLogged(itemId: string): Promise<void> {
  try {
    await updateDoc(doc(db, COLLECTION, itemId), { logged: true });
  } catch (err) {
    console.error("❌ Failed to mark meal plan item as logged:", err);
    throw err;
  }
}

export async function deleteMealPlanFromFirestore(planId: string, userId: string): Promise<void> {
  if (!planId || !userId) throw new Error("planId and userId are required");
  try {
    const q = query(
      collection(db, COLLECTION),
      where("planId", "==", planId),
      where("userId", "==", userId)
    );
    const snap = await getDocs(q);
    await Promise.all(snap.docs.map((d) => deleteDoc(doc(db, COLLECTION, d.id))));
  } catch (err) {
    console.error("❌ Failed to delete meal plan:", err);
    throw err;
  }
}
