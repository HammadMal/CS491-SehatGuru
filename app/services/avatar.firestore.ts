import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

export type AvatarData = {
  userId: string;
  presetId: string | null;
  photoBase64: string | null;
};

export async function getAvatarData(userId: string): Promise<AvatarData> {
  const snap = await getDoc(doc(db, "user_preferences", userId));
  if (snap.exists()) {
    const d = snap.data();
    return { userId, presetId: d.presetId ?? null, photoBase64: d.photoBase64 ?? null };
  }
  return { userId, presetId: null, photoBase64: null };
}

export async function setAvatarPreset(userId: string, presetId: string): Promise<void> {
  await setDoc(doc(db, "user_preferences", userId), { presetId, photoBase64: null }, { merge: true });
}

export async function setAvatarPhoto(userId: string, photoBase64: string): Promise<void> {
  await setDoc(doc(db, "user_preferences", userId), { presetId: null, photoBase64 }, { merge: true });
}
