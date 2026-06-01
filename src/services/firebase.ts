import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  updateProfile,
  type Auth,
  type User
} from 'firebase/auth';
import { doc, getFirestore, serverTimestamp, setDoc, type Firestore } from 'firebase/firestore';
import type { MemberStatus } from '../storage';

type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

const firebaseConfig: FirebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? ''
};

export const isFirebaseConfigured = Object.values(firebaseConfig).every(Boolean);

export const firebaseApp: FirebaseApp | null = isFirebaseConfigured
  ? getApps()[0] ?? initializeApp(firebaseConfig)
  : null;

export const db: Firestore | null = firebaseApp ? getFirestore(firebaseApp) : null;
export const auth: Auth | null = firebaseApp ? getAuth(firebaseApp) : null;

export async function signInMemberAnonymously(nickname: string): Promise<User | null> {
  if (!auth || !db) return null;

  const credential = auth.currentUser
    ? { user: auth.currentUser }
    : await signInAnonymously(auth);
  const cleanNickname = nickname.trim() || '친구';

  if (credential.user.displayName !== cleanNickname) {
    await updateProfile(credential.user, { displayName: cleanNickname });
  }

  await saveMemberProfileToFirestore(credential.user.uid, cleanNickname);
  return credential.user;
}

export async function saveMemberProfileToFirestore(userId: string, nickname: string) {
  if (!db) return;

  await setDoc(
    doc(db, 'members', userId),
    {
      userId,
      nickname: nickname.trim() || '친구',
      loginProvider: 'anonymous',
      lastSeenAt: serverTimestamp()
    },
    { merge: true }
  );
}

export async function saveMemberStatusToFirestore(status: MemberStatus) {
  if (!db) return;

  await setDoc(
    doc(db, 'members', status.userId),
    {
      userId: status.userId,
      nickname: status.nickname,
      currentPlaceId: status.placeId,
      currentPlaceName: status.placeName,
      status: status.status,
      loginProvider: 'anonymous',
      arrivedAt: status.arrivedAt,
      leftAt: status.leftAt,
      lastUpdatedAt: status.lastUpdatedAt,
      serverUpdatedAt: serverTimestamp()
    },
    { merge: true }
  );

  // TODO: When Firebase mode is enabled, split arrival/leave events into
  // arrivals documents so history can be queried without exposing live GPS.
  if (status.placeId) {
    await setDoc(
      doc(db, 'arrivals', `${status.userId}_${status.lastUpdatedAt}`),
      {
        userId: status.userId,
        nickname: status.nickname,
        placeId: status.placeId,
        placeName: status.placeName,
        status: status.status,
        arrivedAt: status.arrivedAt,
        leftAt: status.leftAt,
        createdAt: status.lastUpdatedAt,
        serverCreatedAt: serverTimestamp()
      },
      { merge: true }
    );
  }
}
