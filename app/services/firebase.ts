import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDtd316mzeF0Eu0esWS_n9wiygTeNadt3U",
  authDomain: "sehatguru-db.firebaseapp.com",
  projectId: "sehatguru-db",
  storageBucket: "sehatguru-db.firebasestorage.app",
  messagingSenderId: "888661811432",
  appId: "1:888661811432:android:a7c3d57cd3ad13b383295d",
};

const app = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApp();

export const db = getFirestore(app);
