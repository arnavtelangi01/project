import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { User as UserIcon, Save, ArrowLeft, Loader2, Camera, Mail } from 'lucide-react';
import { db, doc, getDoc, setDoc, updateDoc, serverTimestamp, User, auth } from '../firebase';
import { updateProfile } from 'firebase/auth';

interface ProfileProps {
  user: User;
  onBack: () => void;
}

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  createdAt?: any;
}

export function Profile({ user, onBack }: ProfileProps) {
  const [profile, setProfile] = useState<UserProfile>({
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || '',
    photoURL: user.photoURL || '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        } else {
          // Initialize profile in Firestore if it doesn't exist
          const initialProfile: UserProfile = {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || '',
            photoURL: user.photoURL || '',
            createdAt: serverTimestamp(),
          };
          await setDoc(docRef, initialProfile);
          setProfile(initialProfile);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        setMessage({ type: 'error', text: 'Failed to load profile.' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      // Update Firestore
      const docRef = doc(db, 'users', user.uid);
      await updateDoc(docRef, {
        displayName: profile.displayName,
        photoURL: profile.photoURL,
      });

      // Update Auth Profile
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: profile.displayName,
          photoURL: profile.photoURL,
        });
      }

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error) {
      console.error("Error updating profile:", error);
      setMessage({ type: 'error', text: 'Failed to update profile.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Loading your profile...</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-2xl mx-auto"
    >
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>
        <h1 className="text-2xl font-bold text-slate-900">User Profile</h1>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
        <div className="bg-indigo-600 h-32 relative">
          <div className="absolute -bottom-12 left-8">
            <div className="relative">
              {profile.photoURL ? (
                <img
                  src={profile.photoURL}
                  alt={profile.displayName}
                  className="w-24 h-24 rounded-2xl border-4 border-white object-cover shadow-lg"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl border-4 border-white bg-slate-100 flex items-center justify-center shadow-lg">
                  <UserIcon size={40} className="text-slate-400" />
                </div>
              )}
              <div className="absolute -bottom-2 -right-2 bg-white p-1.5 rounded-lg shadow-md border border-slate-100">
                <Camera size={16} className="text-indigo-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="pt-16 p-8">
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Display Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    value={profile.displayName}
                    onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    placeholder="Enter your name"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="email"
                    value={profile.email}
                    disabled
                    className="w-full pl-12 pr-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
                  />
                </div>
                <p className="text-[10px] text-slate-400">Email cannot be changed.</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Photo URL</label>
              <div className="relative">
                <Camera className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="url"
                  value={profile.photoURL}
                  onChange={(e) => setProfile({ ...profile, photoURL: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  placeholder="https://example.com/photo.jpg"
                />
              </div>
              <p className="text-[10px] text-slate-400">Provide a link to your profile picture.</p>
            </div>

            {message && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className={`p-4 rounded-xl text-sm font-medium ${
                  message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                }`}
              >
                {message.text}
              </motion.div>
            )}

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-100 active:scale-95"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </motion.div>
  );
}
