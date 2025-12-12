import { useEffect, useState } from 'react';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import EditProfileModal from '../components/EditProfileModal';

export function Profile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [profile, setProfile] = useState({
    name: '',
    mobile: '',
    email: '',
  });

  useEffect(() => {
    let active = true;
    (async () => {
      if (!user?.id || !db) {
        setLoading(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'users', user.id));
        if (!active) return;
        const data = snap.exists() ? snap.data() : {};
        setProfile({
          name: data?.name || '',
          mobile: data?.name ? (data?.mobile || '') : (data?.mobile || ''),
          email: data?.email || user?.email || '',
        });
      } catch (e) {
        setError('Unable to load your profile.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [user]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3rd font-bold text-slate-900">Your Profile</h1>
          {!loading && (
            <button
              onClick={() => setIsEditOpen(true)}
              className="px-4 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition"
            >
              Edit
            </button>
          )}
        </div>

        {loading ? (
          <div className="p-8 bg-white rounded-2xl border border-slate-200 shadow-sm text-slate-600">
            Loading…
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            {error ? (
              <div className="px-6 py-4 text-sm text-red-700 bg-red-50 border-b border-red-200">{error}</div>
            ) : null}
            <div className="divide-y divide-slate-200">
              <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center">
                <div className="w-48 text-slate  -600 font-medium">Full Name</div>
                <div className="flex-1 text-slate-900">{profile.name || '-'}</div>
              </div>
              <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center">
                <div className="w-48 text-slate-600 font-medium">Mobile Number</div>
                <div className="flex-1 text-slate-900">{profile.mobile || '-'}</div>
              </div>
              <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center">
                <div className="w-48 text-slate-600 font-medium">Email</div>
                <div className="flex-1 text-slate-900 break-all">{profile.email || '-'}</div>
              </div>
            </div>
            <div className="px-6 py-4 text-xs text-slate-500 border-t border-slate-200">
              The above details reflect what you provided during signup.
            </div>
          </div>
        )}

        <EditProfileModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          userId={user?.id}
          onUpdated={async () => {
            // refresh profile after update
            try {
              const snap = await getDoc(doc(db, 'users', user.id));
              const data = snap.exists() ? snap.data() : {};
              setProfile({
                name: data?.name || '',
                mobile: data?.mobile || '',
                email: data?.email || user?.email || '',
              });
            } catch {}
          }}
        />
      </div>
    </div>
  );
}


