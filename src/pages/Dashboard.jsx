import { useState, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { CaseCard } from '../components/CaseCard';
import { AddCaseModal } from '../components/AddCaseModal';
import { EditCaseModal } from '../components/EditCaseModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Plus, Loader2, MoreHorizontal, Pencil, Eye, Trash2, Search } from 'lucide-react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, getDocs, query, where, orderBy, doc, updateDoc, deleteDoc, arrayUnion, setDoc } from 'firebase/firestore';
import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';

export function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCaseId, setEditingCaseId] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // () => Promise<void>
  const [confirmConfig, setConfirmConfig] = useState({ title: '', description: '', confirmText: 'Confirm' });
  const [openMenuId, setOpenMenuId] = useState(null);
  const [search, setSearch] = useState('');

  const fetchCases = async () => {
    if (!user?.id) {
      setCases([]);
      setLoading(false);
      return;
    }
    try {
      const q = query(
        collection(db, 'cases'),
        where('user_id', '==', user.id),
        orderBy('created_at', 'desc')
      );
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setCases(list);
    } catch (error) {
      console.error('Error fetching cases:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [user]);

  useEffect(() => {
    setOpenMenuId(null);
  }, [search]);

  const normalizedIncludes = (value, term) => {
    if (!term) return false;
    const v = (value || '').toString().toLowerCase();
    return v.includes(term);
  };

  const getFilteredCases = () => {
    const term = search.trim().toLowerCase();
    if (!term) return cases;
    return cases.filter((c) =>
      normalizedIncludes(c.case_number, term) ||
      normalizedIncludes(c.client_name, term) ||
      normalizedIncludes(c.client_phone, term) ||
      normalizedIncludes(c.case_type, term) ||
      normalizedIncludes(c.court_name, term) ||
      normalizedIncludes(c.first_party, term) ||
      normalizedIncludes(c.second_party, term) ||
      normalizedIncludes(c.next_stage, term)
    );
  };


  const promptToggleStatus = (caseItem) => {
    setConfirmConfig({
      title: caseItem.case_status === 'closed' ? 'Reopen case?' : 'Close case?',
      description: caseItem.case_status === 'closed'
        ? 'This case will be marked as open.'
        : 'This case will be marked as closed.',
      confirmText: caseItem.case_status === 'closed' ? 'Reopen' : 'Close Case',
    });
    setConfirmAction(() => async () => {
      try {
        await updateDoc(doc(db, 'cases', caseItem.id), {
          case_status: caseItem.case_status === 'closed' ? 'open' : 'closed',
          updated_at: new Date().toISOString(),
        });
        await fetchCases();
      } catch (e) {
        console.error('Error toggling case:', e);
      }
    });
    setConfirmOpen(true);
  };

  const promptDeleteCase = (caseItem) => {
    setConfirmConfig({
      title: 'Delete case?',
      description: 'This will permanently delete the case and its hearings.',
      confirmText: 'Delete',
    });
    setConfirmAction(() => async () => {
      try {
        // Delete related hearings
        const hearingsSnap = await getDocs(query(collection(db, 'hearings'), where('case_id', '==', caseItem.id)));
        await Promise.all(hearingsSnap.docs.map((d) => deleteDoc(doc(db, 'hearings', d.id))));
        // Delete case
        await deleteDoc(doc(db, 'cases', caseItem.id));
        await fetchCases();
      } catch (e) {
        console.error('Error deleting case:', e);
      }
    });
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (!confirmAction) return;
    setConfirmLoading(true);
    await confirmAction();
    setConfirmLoading(false);
    setConfirmOpen(false);
    setConfirmAction(null);
  };

  const startEditCase = (caseItem) => {
    setEditingCaseId(caseItem.id);
    setIsEditModalOpen(true);
  };



  useEffect(() => {
    let unsub = () => {};
    (async () => {
      try {
        const supported = await isSupported().catch(() => false);
        if (!supported) return;
        if (typeof window === 'undefined') return;
        const messaging = getMessaging();
        unsub = onMessage(messaging, (payload) => {
          const title = payload.notification?.title || 'Notification';
          const body = payload.notification?.body || '';
          alert(`${title}\n\n${body}`);
        });
      } catch {}
    })();
    return () => {
      try { unsub && unsub(); } catch {}
    };
  }, []);

  // Auto-subscribe to push after login (silent). Prompts once per user if needed.
  useEffect(() => {
    (async () => {
      try {
        if (!user?.id) return;
        if (typeof window === 'undefined') return;
        const supported = await isSupported().catch(() => false);
        if (!supported) return;

        const vapidKey = process.env.NEXT_PUBLIC_FCM_VAPID_KEY || '';
        if (!vapidKey) return;

        const permission = Notification?.permission;
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        const messaging = getMessaging();

        const saveToken = async (token) => {
          const storageKey = `fcm_token_${user.id}`;
          const prev = typeof localStorage !== 'undefined' ? localStorage.getItem(storageKey) : '';
          if (prev !== token) {
            const userRef = doc(collection(db, 'users'), user.id);
            await setDoc(userRef, { fcmTokens: arrayUnion(token), email: user.email }, { merge: true });
            try { localStorage.setItem(storageKey, token); } catch {}
          }
        };

        if (permission === 'granted') {
          const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
          if (token) await saveToken(token);
          return;
        }

        if (permission === 'default') {
          const promptedKey = `fcm_prompt_${user.id}`;
          const prompted = typeof localStorage !== 'undefined' ? localStorage.getItem(promptedKey) : '0';
          if (!prompted) {
            try { localStorage.setItem(promptedKey, '1'); } catch {}
            const result = await Notification.requestPermission();
            if (result === 'granted') {
              const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
              if (token) await saveToken(token);
            }
          }
        }
        // If denied -> do nothing
      } catch {}
    })();
  }, [user]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Your Cases</h1>
            <p className="text-slate-600">Manage and track all your legal cases</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-end">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search cases, clients, courts..."
                className="w-full sm:w-72 pl-9 pr-10 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition"
              />
              {search && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900"
                  onClick={() => setSearch('')}
                >
                  ×
                </button>
              )}
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center space-x-2 px-6 py-3 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition shadow-sm"
            >
              <Plus className="w-5 h-5" />
              <span>Add New Case</span>
            </button>
          </div>

        </div>
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <p className="text-sm text-slate-600 mb-1">Total Cases</p>
            <p className="text-3xl font-bold text-slate-900">{cases.length}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <p className="text-sm text-slate-600 mb-1">Active</p>
            <p className="text-3xl font-bold text-slate-900">{cases.filter((c) => c.case_status !== 'closed').length}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <p className="text-sm text-slate-600 mb-1">Closed</p>
            <p className="text-3xl font-bold text-slate-900">{cases.filter((c) => c.case_status === 'closed').length}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-slate-900" />
          </div>
        ) : cases.length === 0 ? (
          <div className="text-center py-20">
            <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No cases yet</h3>
            <p className="text-slate-600 mb-6">Get started by adding your first case</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center space-x-2 px-6 py-3 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition"
            >
              <Plus className="w-5 h-5" />
              <span>Add New Case</span>
            </button>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-visible">
            <div className="overflow-x-auto" onClick={() => setOpenMenuId(null)}>
              {search && getFilteredCases().length === 0 && (
                <div className="p-6 text-center text-slate-600">
                  No results for "<span className="font-medium">{search}</span>".
                </div>
              )}
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Case No</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Client</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Court</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Next Hearing</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Next Stage</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {getFilteredCases().map((c) => {
                    const next = c.next_hearing_date
                      ? new Date(c.next_hearing_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                      : '-';
                    const isClosed = c.case_status === 'closed';
                    return (
                      <tr
                        key={c.id}
                        className="hover:bg-slate-50 cursor-pointer"
                        onClick={() => router.push(`/case/${c.id}`)}
                      >
                        <td className="px-6 py-3 text-sm text-slate-900">{c.case_number || '-'}</td>
                        <td className="px-6 py-3 text-sm">
                          <div className="font-medium text-slate-900">{c.client_name}</div>
                          <div className="text-slate-600">{c.client_phone}</div>
                        </td>
                        <td className="px-6 py-3 text-sm text-slate-700">{c.case_type || '-'}</td>
                        <td className="px-6 py-3 text-sm text-slate-700">{c.court_name || '-'}</td>
                        <td className="px-6 py-3 text-sm text-slate-700">{next}</td>
                        <td className="px-6 py-3 text-sm text-slate-700">{c.next_stage || '-'}</td>
                        <td className="px-6 py-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${isClosed ? 'bg-slate-100 text-slate-700' : 'bg-green-100 text-green-700'}`}>
                            {isClosed ? 'Closed' : 'Active'}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right text-sm relative">
                          <button
                            className="inline-flex items-center justify-center w-9 h-9 rounded-lg hover:bg-slate-100 transition"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId((prev) => (prev === c.id ? null : c.id));
                            }}
                          >
                            <MoreHorizontal className="w-5 h-5 text-slate-600" />
                          </button>
                          {openMenuId === c.id && (
                            <div
                              className="absolute right-0 z-50 mt-2 w-40 bg-white border border-slate-200 rounded-lg shadow-lg"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                className="w-full flex items-center gap-2 px-3 py-2 text-left text-slate-700 hover:bg-slate-50"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  startEditCase(c);
                                }}
                              >
                                <Pencil className="w-4 h-4" /> Edit
                              </button>
                              <button
                                className="w-full flex items-center gap-2 px-3 py-2 text-left text-slate-700 hover:bg-slate-50"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  router.push(`/case/${c.id}`);
                                }}
                              >
                                <Eye className="w-4 h-4" /> View
                              </button>
                              <button
                                className="w-full flex items-center gap-2 px-3 py-2 text-left text-red-700 hover:bg-red-50"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  promptDeleteCase(c);
                                }}
                              >
                                <Trash2 className="w-4 h-4" /> Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <AddCaseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCaseAdded={fetchCases}
      />

      <EditCaseModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        caseId={editingCaseId}
        onCaseUpdated={fetchCases}
      />

      <ConfirmDialog
        isOpen={confirmOpen}
        title={confirmConfig.title}
        description={confirmConfig.description}
        confirmText={confirmConfig.confirmText}
        cancelText="Cancel"
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
        loading={confirmLoading}
      />
    </div>
  );
}


