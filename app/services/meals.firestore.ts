import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Meal } from "../types/meal.types";

export async function fetchMealsForUser(userId: string): Promise<Meal[]> {
  if (!userId) return [];

  try {
    const q = query(
      collection(db, "meals"),
      where("userId", "==", userId)
    );

    const snap = await getDocs(q);

    console.log("📦 Firestore meals fetched:", snap.size);

    return snap.docs.map((doc) => ({
      ...(doc.data() as Meal),
      id: doc.id,
    }));
  } catch (err) {
    console.error("❌ Firestore fetch failed:", err);
    return [];
  }
}

export async function saveMealToFirestore(meal: Meal) {
  try {
    await addDoc(collection(db, "meals"), meal);
    console.log("🔥 Meal saved to Firestore");
  } catch (error) {
    console.error("❌ Firestore write failed:", error);
    throw error;
  }
}
