import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

// ==========================================
// 1. FIREBASE CLOUD FUNCTIONS (Backend)
// ==========================================

// Firebase se data lane ka function
export const fetchFromFirebase = async (key: string) => {
  try {
    const docRef = doc(db, "bhatta_database", key);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().data;
    }
    return null;
  } catch (error) {
    console.error("Firebase Fetch Error:", error);
    return null;
  }
};

// Firebase par data save karne ka function
export const saveToFirebase = async (key: string, data: any) => {
  try {
    const docRef = doc(db, "bhatta_database", key);
    await setDoc(docRef, { data }, { merge: true });
    console.log(`Cloud backup successful for: ${key}`);
  } catch (error) {
    console.error("Firebase Save Error:", error);
  }
};

// ==========================================
// 2. HYBRID STORAGE FUNCTIONS (Frontend + Backend)
// ==========================================

// Data Save karna (Local + Cloud Backup)
export const saveLabourData = (key: string, data: any) => {
  if (typeof window !== "undefined") {
    // 1. Pehle local me save karo taaki UI turant update ho
    localStorage.setItem(key, JSON.stringify(data));
    
    // 2. Background mein Firebase par bhej do (Cloud Backup)
    saveToFirebase(key, data);
  }
};

// Data Get karna (Abhi Local se, baad me hum ise cloud se sync karenge)
export const getLabourData = (key: string) => {
  if (typeof window !== "undefined") {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  }
  return null;
};