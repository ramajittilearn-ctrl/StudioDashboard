import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  getDocFromServer
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { AppState } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// CRITICAL: The app will break without specifying firestoreDatabaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const ADMIN_EMAILS = ['p.ramajitti@gmail.com', 'ramajitti.job@gmail.com'];
export const ADMIN_EMAIL = 'p.ramajitti@gmail.com';

export function isUserAdmin(user: User | null): boolean {
  if (!user || !user.email) return false;
  return ADMIN_EMAILS.some(em => em.toLowerCase() === user.email?.toLowerCase());
}

export async function loginWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function logoutFirebase(): Promise<void> {
  await signOut(auth);
}

export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'app_state', 'connection_test'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline, check configuration.');
    }
    return false;
  }
}

const STATE_DOC_PATH = 'app_state/current';

/**
 * Save complete application state to Firestore in project myapartment-5903f
 */
export async function saveStateToFirestore(state: AppState): Promise<void> {
  try {
    const docRef = doc(db, 'app_state', 'current');
    await setDoc(docRef, {
      ...state,
      lastUpdated: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, STATE_DOC_PATH);
  }
}

/**
 * Load complete application state from Firestore
 */
export async function loadStateFromFirestore(): Promise<AppState | null> {
  try {
    const docRef = doc(db, 'app_state', 'current');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as AppState;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, STATE_DOC_PATH);
    return null;
  }
}

/**
 * Subscribe to real-time state changes from Firestore
 */
export function subscribeToFirestoreState(
  onData: (state: AppState) => void,
  onError?: (error: Error) => void
): () => void {
  const docRef = doc(db, 'app_state', 'current');
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data() as AppState;
        if (data && Array.isArray(data.rooms) && data.rooms.length === 15) {
          onData(data);
        }
      }
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, STATE_DOC_PATH);
    }
  );
}
