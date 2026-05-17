import { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { 
  onAuthStateChanged, 
  signInWithPopup,
  GoogleAuthProvider, 
  signOut 
} from 'firebase/auth';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { store } from '../lib/store';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

// ─── Google SVG Icon ──────────────────────────────────────────────────────────
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" style={{ marginRight: 12, display: 'inline-block', verticalAlign: 'middle' }}>
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.5 24c0-1.61-.15-3.16-.42-4.69H24v8.89h12.66c-.55 2.87-2.17 5.31-4.61 6.94l7.18 5.57c4.19-3.86 6.61-9.54 6.61-16.71z"/>
    <path fill="#FBBC05" d="M10.54 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.98-6.19z"/>
    <path fill="#34A853" d="M24 38.5c-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48c6.48 0 11.93-2.13 15.89-5.81l-7.28-5.65c-2.11 1.4-4.81 2.46-8.61 2.46z"/>
  </svg>
);

// ─── Sparkle SVG Icon ─────────────────────────────────────────────────────────
const CelestialSparkle = ({ size = 24, color = "var(--accent)" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ color }}>
    <path d="M12 2 L14 9.5 L21.5 11.5 L14 13.5 L12 21 L10 13.5 L2.5 11.5 L10 9.5 Z" fill="currentColor" />
  </svg>
);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authModal, setAuthModal] = useState({ isOpen: false, mode: 'login' });

  const openLoginModal = () => setAuthModal({ isOpen: true, mode: 'login' });
  const openLogoutModal = () => setAuthModal({ isOpen: true, mode: 'logout' });
  const closeAuthModal = () => setAuthModal({ isOpen: false, mode: 'login' });

  // Handle Firebase Sign-in
  const triggerGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      if (result && result.user) {
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
          }
        }
      }
      closeAuthModal();
      return result?.user;
    } catch (error) {
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        console.log("Login popup closed by user.");
        return null;
      }
      console.error("Auth Error:", error);
      alert(`Login failed: ${error.message} (${error.code})`);
      throw error;
    }
  };

  // Handle Firebase Sign-out
  const triggerFirebaseLogout = async () => {
    store.clear();
    store.setUser(null);
    await signOut(auth);
    closeAuthModal();
  };

  useEffect(() => {
    let unsubs = [];

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Configure Local Store Context
      store.setUser(user?.uid || null);
      store.clearLegacy();

      if (user) {
        try {
          // FIX: Force token refresh before attaching Firestore listeners.
          // Without this, onSnapshot fires before the Firestore auth token
          // is ready → permission-denied errors even though rules are correct.
          await user.getIdToken(/* forceRefresh */ true);

          setCurrentUser(user);

          // Pull Library Data
          const libRef = doc(db, 'users', user.uid, 'data', 'library');
          unsubs.push(onSnapshot(libRef, (snap) => {
            if (snap.exists()) {
              store.setJSON('ephi_library', snap.data());
            }
          }, (err) => {
            if (err.code !== 'permission-denied') {
              console.error("Library sync error:", err);
            }
          }));

          // Pull Settings
          const userRef = doc(db, 'users', user.uid);
          unsubs.push(onSnapshot(userRef, (snap) => {
            if (snap.exists() && snap.data()?.settings?.persona) {
              store.set('ephi_persona', snap.data().settings.persona);
            }
          }, (err) => {
            if (err.code !== 'permission-denied') {
              console.error("Settings sync error:", err);
            }
          }));
        } catch (e) {
          console.error("Sync error:", e);
          setCurrentUser(user);
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

  const value = { 
    currentUser, 
    loginWithGoogle: openLoginModal, 
    logout: openLogoutModal 
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
      {authModal.isOpen && (
        <AuthModal 
          mode={authModal.mode} 
          onClose={closeAuthModal} 
          onLogin={triggerGoogleLogin} 
          onLogout={triggerFirebaseLogout} 
        />
      )}
    </AuthContext.Provider>
  );
}

// ─── High-Fidelity Celestial Auth Modal ───────────────────────────────────────
function AuthModal({ mode, onClose, onLogin, onLogout }) {
  const isLogin = mode === 'login';

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(5, 5, 8, 0.85)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 99999,
      animation: 'ephi-fade-in 0.25s ease-out'
    }}>
      {/* Dynamic Keyframes injected globally */}
      <style>{`
        @keyframes ephi-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes ephi-slide-up {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes ephi-pulse-glow {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(201, 160, 220, 0.2); }
          70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(201, 160, 220, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(201, 160, 220, 0); }
        }
      `}</style>

      {/* Modal Card */}
      <div style={{
        background: 'linear-gradient(145deg, #101018, #07070b)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '24px',
        padding: '3rem 2.25rem',
        width: '90%',
        maxWidth: '430px',
        boxShadow: '0 24px 64px rgba(0, 0, 0, 0.9), inset 0 1px 1px rgba(255, 255, 255, 0.05)',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        animation: 'ephi-slide-up 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* Close trigger button */}
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: '1rem',
            cursor: 'pointer',
            padding: '4px',
            opacity: 0.7,
            transition: 'opacity 0.2s ease'
          }}
          onMouseEnter={(e) => e.target.style.opacity = 1}
          onMouseLeave={(e) => e.target.style.opacity = 0.7}
        >
          ✕
        </button>

        {/* Outer Circular Icon Header */}
        <div style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.02)',
          border: isLogin ? '1px solid rgba(201, 160, 220, 0.3)' : '1px solid rgba(235, 94, 85, 0.3)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          margin: '0 auto 1.75rem',
          animation: 'ephi-pulse-glow 2.5s infinite ease-in-out'
        }}>
          <CelestialSparkle 
            size={22} 
            color={isLogin ? 'var(--accent)' : 'var(--tense)'} 
          />
        </div>

        {/* Header Text */}
        <h2 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '1.75rem',
          fontWeight: 500,
          color: '#fff',
          margin: '0 0 0.25rem',
          letterSpacing: '0.02em'
        }}>
          {isLogin ? 'Ephi Observatory' : 'Seal the Grimoire?'}
        </h2>
        <p style={{
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '0.15em',
          color: 'var(--accent)',
          margin: '0 0 1.5rem',
          fontWeight: 600
        }}>
          {isLogin ? 'Align with the stars' : 'Disconnect session'}
        </p>

        {/* Narrative Description */}
        <p style={{
          fontSize: '0.85rem',
          lineHeight: 1.6,
          color: 'var(--text-secondary)',
          margin: '0 0 2.25rem',
          padding: '0 8px'
        }}>
          {isLogin 
            ? 'Access the full Astrological engine. Sign in to synchronize your birth charts across devices, store unlimited readings, unlock premium Jyotish/Vedic Dasha matrices, and backup reference materials securely.' 
            : 'Your active cloud synchronization will pause. Your locally configured natal and transit charts remain fully intact on this device, but you will need to re-authenticate to utilize the AI Oracle.'}
        </p>

        {/* Actions Container */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {isLogin ? (
            <button 
              onClick={onLogin}
              className="btn"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#fff',
                fontWeight: 600,
                fontSize: '0.85rem',
                padding: '12px 24px',
                borderRadius: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.25s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#fff';
                e.currentTarget.style.color = '#000';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.color = '#fff';
              }}
            >
              <GoogleIcon />
              Continue with Google
            </button>
          ) : (
            <>
              <button 
                onClick={onClose}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '12px 24px',
                  borderRadius: '12px',
                  fontWeight: 600,
                  fontSize: '0.85rem'
                }}
              >
                Stay Connected
              </button>
              
              <button 
                onClick={onLogout}
                className="btn btn-ghost"
                style={{
                  width: '100%',
                  padding: '12px 24px',
                  borderRadius: '12px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  border: '1px solid rgba(235, 94, 85, 0.2)',
                  color: 'var(--tense)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(235, 94, 85, 0.08)';
                  e.currentTarget.style.borderColor = 'rgba(235, 94, 85, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = 'rgba(235, 94, 85, 0.2)';
                }}
              >
                Disconnect Session
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
