import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseReady = Object.values(firebaseConfig).every(Boolean);

let app;
let auth;
let db;

if (firebaseReady) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

function requireFirebase() {
  if (!firebaseReady || !auth || !db) {
    throw new Error('Firebase 尚未設定。請先建立 .env 並填入 VITE_FIREBASE_* 設定。');
  }
}

export function listenAuth(callback) {
  if (!firebaseReady || !auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

export function signInWithGoogle() {
  requireFirebase();
  return signInWithPopup(auth, new GoogleAuthProvider());
}

export function signInWithEmail(email, password) {
  requireFirebase();
  return signInWithEmailAndPassword(auth, email, password);
}

export function registerWithEmail(email, password) {
  requireFirebase();
  return createUserWithEmailAndPassword(auth, email, password);
}

export function logout() {
  requireFirebase();
  return signOut(auth);
}

function datasetCollection(uid) {
  return collection(db, 'users', uid, 'datasets');
}

export async function listDatasets(uid) {
  requireFirebase();
  const snapshot = await getDocs(query(datasetCollection(uid), orderBy('updatedAt', 'desc')));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function saveDataset(uid, name, payload, datasetId = '') {
  requireFirebase();
  const data = {
    name: name?.trim() || `評估資料 ${new Date().toLocaleDateString('zh-TW')}`,
    payload,
    updatedAt: serverTimestamp(),
  };
  if (datasetId) {
    await setDoc(doc(db, 'users', uid, 'datasets', datasetId), data, { merge: true });
    return datasetId;
  }
  const created = await addDoc(datasetCollection(uid), { ...data, createdAt: serverTimestamp() });
  return created.id;
}

export async function loadDataset(uid, datasetId) {
  requireFirebase();
  const snapshot = await getDoc(doc(db, 'users', uid, 'datasets', datasetId));
  if (!snapshot.exists()) throw new Error('找不到指定資料集。');
  return { id: snapshot.id, ...snapshot.data() };
}

export function removeDataset(uid, datasetId) {
  requireFirebase();
  return deleteDoc(doc(db, 'users', uid, 'datasets', datasetId));
}
