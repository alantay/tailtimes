import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import { firebaseAuth } from './firebase';

export async function signInWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
}

export async function signUpWithEmail(email: string, password: string, name?: string) {
  const credentials = await createUserWithEmailAndPassword(firebaseAuth, email.trim(), password);

  if (name?.trim()) {
    await updateProfile(credentials.user, {
      displayName: name.trim(),
    });
  }

  return credentials;
}

export async function signOut() {
  await firebaseSignOut(firebaseAuth);
}

export function getCurrentUser(): User | null {
  return firebaseAuth.currentUser;
}

export async function getIdToken(forceRefresh = false) {
  const user = firebaseAuth.currentUser;
  return user ? user.getIdToken(forceRefresh) : null;
}

export function subscribeToAuthChanges(listener: (user: User | null) => void) {
  return onAuthStateChanged(firebaseAuth, listener);
}
