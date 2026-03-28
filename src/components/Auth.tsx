import React from 'react';
import { motion } from 'motion/react';
import { LogIn, Sparkles, ShieldCheck, UserPlus } from 'lucide-react';
import { auth, googleProvider, signInWithPopup, db, doc, getDoc, setDoc, serverTimestamp } from '../firebase';

interface AuthProps {
  onAuthSuccess: () => void;
}

export const Auth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Initialize profile in Firestore if it doesn't exist
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        await setDoc(docRef, {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || '',
          photoURL: user.photoURL || '',
          createdAt: serverTimestamp(),
        });
      }

      onAuthSuccess();
    } catch (error) {
      console.error("Auth error:", error);
      alert("Failed to sign in. Please try again.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="text-center space-y-8 max-w-md mx-auto"
    >
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-indigo-600 text-white shadow-xl shadow-indigo-200 mb-4">
        <ShieldCheck size={40} />
      </div>
      
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">
          Welcome Back
        </h1>
        <p className="text-lg text-slate-600 leading-relaxed">
          Sign in to save your progress, track your interview scores, and access advanced features.
        </p>
      </div>

      <div className="space-y-4 pt-4">
        <button
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-white border-2 border-slate-100 text-slate-700 font-semibold rounded-2xl hover:bg-slate-50 hover:border-slate-200 transition-all active:scale-95 shadow-sm"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" referrerPolicy="no-referrer" />
          <span>Continue with Google</span>
        </button>
        
        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#F8FAFC] px-2 text-slate-400 font-bold">Secure Access</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-white rounded-2xl border border-slate-100 text-left space-y-1">
            <div className="text-indigo-600"><Sparkles size={16} /></div>
            <h3 className="text-xs font-bold text-slate-900">AI Feedback</h3>
            <p className="text-[10px] text-slate-500">Personalized insights</p>
          </div>
          <div className="p-4 bg-white rounded-2xl border border-slate-100 text-left space-y-1">
            <div className="text-indigo-600"><LogIn size={16} /></div>
            <h3 className="text-xs font-bold text-slate-900">Progress Sync</h3>
            <p className="text-[10px] text-slate-500">Access anywhere</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
