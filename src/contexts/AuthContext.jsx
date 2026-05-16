import { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { 
  onAuthStateChanged, 
  signInWithPopup,
  GoogleAuthProvider, 
  signOut 
} from 'firebase/auth';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sign in with Google (Popup flow)
  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      if (result && result.user) {
        // Ensure user document exists in Firestore
        const userRef = doc(db, 'users', result.user.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          try {
            await setDoc(userRef, {
              email: result.user.email,
              displayName: result.user.displayName,
              createdAt: new Date().toISOString(),
              settings: { persona: 'stoic', notifications: false }
            });
          } catch (fsError) {
            console.error("Firestore setup error:", fsError);
            alert("Login succeeded, but failed to save profile to database. Check Firestore Rules!");
          }
        }
      }
      return result?.user;
    } catch (error) {
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        // User just closed the popup, silently ignore.
        console.log("Login popup closed by user.");
        return null;
      }
      console.error("Auth Error:", error);
      alert(`Login failed: ${error.message} (${error.code})`);
      throw error;
    }
  };

  const logout = () => signOut(auth);

  useEffect(() => {
    let unsubs = [];

    // Subscribe to auth state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);

      if (user) {
        try {
          // Pull Library Data from Firestore → sync to localStorage
          const libRef = doc(db, 'users', user.uid, 'data', 'library');
          unsubs.push(onSnapshot(libRef, (snap) => {
            if (snap.exists()) {
              localStorage.setItem('ephi_library', JSON.stringify(snap.data()));
            }
          }, (err) => console.error("Library sync error:", err)));

          // Pull Settings/Persona
          const userRef = doc(db, 'users', user.uid);
          unsubs.push(onSnapshot(userRef, (snap) => {
            if (snap.exists() && snap.data()?.settings?.persona) {
              localStorage.setItem('ephi_persona', snap.data().settings.persona);
            }
          }, (err) => console.error("Settings sync error:", err)));
        } catch (e) {
          console.error("Sync error:", e);
        }
      } else {
        unsubs.forEach(unsub => unsub());
        unsubs = [];
      }

      setLoading(false);
    });

    return () => {
      unsubscribe();
      unsubs.forEach(unsub => unsub());
    };
  }, []);

  const value = { currentUser, loginWithGoogle, logout };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
