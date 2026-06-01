import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Firebase 콘솔에서 웹앱 생성 후 아래 값만 바꾸면 됩니다.
// MVP 테스트 전에는 App.tsx의 USE_FIREBASE를 false로 두면 로컬 모드로 동작합니다.
const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID'
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const db = getFirestore(app);
