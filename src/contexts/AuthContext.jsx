import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      // SSR: no auth instance on server
      setLoading(false);
      return undefined;
    }
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({ id: firebaseUser.uid, email: firebaseUser.email || '' });
        // Ensure a users/{uid} doc with email exists for notifications
        try {
          if (db && firebaseUser.email) {
            const userRef = doc(db, 'users', firebaseUser.uid);
            // Merge preserves existing fields (like fcmTokens)
            setDoc(userRef, { email: firebaseUser.email }, { merge: true });
          }
        } catch {}
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signIn = async (email, password) => {
    try {
      if (!auth) throw new Error('Auth is not available on the server');
      const { user: firebaseUser } = await signInWithEmailAndPassword(auth, email, password);
      setUser({ id: firebaseUser.uid, email: firebaseUser.email || '' });
      return { error: null };
    } catch (err) {
      return { error: err };
    }
  };

  const signUp = async (email, password) => {
    try {
      if (!auth) throw new Error('Auth is not available on the server');
      const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password);
      setUser({ id: firebaseUser.uid, email: firebaseUser.email || '' });
      return { error: null };
    } catch (err) {
      return { error: err };
    }
  };

  const signOut = async () => {
    if (!auth) return;
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}


