import { doc, getDoc, setDoc } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "./firebase";

export type AvatarData = {
  userId: string;
  presetId: string | null;
  photoBase64: string | null;
};

const cacheKey = (userId: string) => `avatar_cache_${userId}`;

async function readCache(userId: string): Promise<AvatarData | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(userId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function writeCache(data: AvatarData): Promise<void> {
  try {
    await AsyncStorage.setItem(cacheKey(data.userId), JSON.stringify(data));
  } catch {}
}

export async function getCachedAvatarData(userId: string): Promise<AvatarData | null> {
  return readCache(userId);
}

export async function getAvatarData(userId: string): Promise<AvatarData> {
  const snap = await getDoc(doc(db, "user_preferences", userId));
  if (snap.exists()) {
    const d = snap.data();
    const data: AvatarData = { userId, presetId: d.presetId ?? null, photoBase64: d.photoBase64 ?? null };
    writeCache(data);
    return data;
  }
  const empty: AvatarData = { userId, presetId: null, photoBase64: null };
  writeCache(empty);
  return empty;
}

export async function setAvatarPreset(userId: string, presetId: string): Promise<void> {
  await setDoc(doc(db, "user_preferences", userId), { presetId, photoBase64: null }, { merge: true });
  writeCache({ userId, presetId, photoBase64: null });
}

export async function setAvatarPhoto(userId: string, photoBase64: string): Promise<void> {
  await setDoc(doc(db, "user_preferences", userId), { presetId: null, photoBase64 }, { merge: true });
  writeCache({ userId, presetId: null, photoBase64 });
}
