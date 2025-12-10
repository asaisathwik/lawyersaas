import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Navbar } from '../components/Navbar';
import { AddHearingModal } from '../components/AddHearingModal';
import { EditHearingModal } from '../components/EditHearingModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import {
  ArrowLeft,
  Phone,
  FileText,
  Building,
  Calendar,
  Plus,
  Loader2,
  Clock,
  CheckCircle,
  X
} from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc, deleteDoc, collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';

export function CaseDetails() {
  const router = useRouter();
  const { id } = router.query || {};
  const [caseData, setCaseData] = useState(null);
  const [hearings, setHearings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [hearingToEdit, setHearingToEdit] = useState(null);
  const [hearingToDelete, setHearingToDelete] = useState(null);

  const fetchCaseDetails = async () => {
    if (!id) return;

    try {
      const caseRef = doc(db, 'cases', id);
      const caseSnap = await getDoc(caseRef);
      setCaseData(caseSnap.exists() ? { id: caseSnap.id, ...caseSnap.data() } : null);

      const hearingsQ = query(
        collection(db, 'hearings'),
        where('case_id', '==', id),
        orderBy('hearing_date', 'desc')
      );
      const hearingsSnap = await getDocs(hearingsQ);
      const list = hearingsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setHearings(list || []);
    } catch (error) {
      console.error('Error fetching case details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseCase = async () => {
    if (!id) return;
    setIsClosing(true);

    try {
      const caseRef = doc(db, 'cases', id);
      await updateDoc(caseRef, {
        case_status: caseData?.case_status === 'closed' ? 'open' : 'closed',
        updated_at: new Date().toISOString(),
      });
      await fetchCaseDetails();
    } catch (error) {
      console.error('Error updating case status:', error);
    } finally {
      setIsClosing(false);
    }
  };

  const confirmToggleCase = async () => {
    setConfirmLoading(true);
    await handleCloseCase();
    setConfirmLoading(false);
    setConfirmOpen(false);
  };

  const handleDeleteHearing = async () => {
    if (!hearingToDelete) return;
    try {
      await deleteDoc(doc(db, 'hearings', hearingToDelete));
      await syncNextHearingDate();
      await fetchCaseDetails();
    } catch (e) {
      console.error('Error deleting hearing:', e);
    } finally {
      setHearingToDelete(null);
    }
  };

  const syncNextHearingDate = async () => {
    if (!id) return;
    try {
      const q = query(
        collection(db, 'hearings'),
        where('case_id', '==', id),
        orderBy('hearing_date', 'desc'),
        limit(1)
      );
      const snap = await getDocs(q);
      const next = snap.docs.length ? snap.docs[0].data().hearing_date || null : null;
      await updateDoc(doc(db, 'cases', id), {
        next_hearing_date: next,
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.error('Error syncing next hearing date:', e);
    }
  };

  useEffect(() => {
    fetchCaseDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-slate-900" />
        </div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-slate-600">Case not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 mb-6 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>

        <div className={`bg-white rounded-2xl shadow-sm border p-8 mb-6 ${caseData.case_status === 'closed' ? 'border-slate-300 bg-slate-50' : 'border-slate-200'}`}>
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <h1 className={`text-3xl font-bold ${caseData.case_status === 'closed' ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                  {caseData.client_name}
                </h1>
                {caseData.case_status === 'closed' && (
                  <CheckCircle className="w-8 h-8 text-green-600" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-slate-100 text-slate-700 text-sm font-medium rounded-full">
                  {caseData.case_type}
                </span>
                {caseData.case_status === 'closed' && (
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                    Closed
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => setConfirmOpen(true)}
              disabled={isClosing}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition ${
                caseData.case_status === 'closed'
                  ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  : 'bg-red-100 text-red-700 hover:bg-red-200'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {caseData.case_status === 'closed' ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Reopen</span>
                </>
              ) : (
                <>
                  <X className="w-4 h-4" />
                  <span>Close Case</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="flex items-start space-x-3">
              <Phone className="w-5 h-5 text-slate-400 mt-0.5" />
              <div>
                <p className="text-sm text-slate-500 mb-1">Phone Number</p>
                <p className="text-slate-900 font-medium">{caseData.client_phone}</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <FileText className="w-5 h-5 text-slate-400 mt-0.5" />
              <div>
                <p className="text-sm text-slate-500 mb-1">Case Number</p>
                <p className="text-slate-900 font-medium">{caseData.case_number}</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Building className="w-5 h-5 text-slate-400 mt-0.5" />
              <div>
                <p className="text-sm text-slate-500 mb-1">Court Name</p>
                <p className="text-slate-900 font-medium">{caseData.court_name}</p>
              </div>
            </div>

            {caseData.first_party && (
              <div className="flex items-start space-x-3">
                <FileText className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-500 mb-1">First Party</p>
                  <p className="text-slate-900 font-medium">{caseData.first_party}</p>
                </div>
              </div>
            )}

            {caseData.second_party && (
              <div className="flex items-start space-x-3">
                <FileText className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-500 mb-1">Second Party</p>
                  <p className="text-slate-900 font-medium">{caseData.second_party}</p>
                </div>
              </div>
            )}

            {caseData.referring_advocate && (
              <div className="flex items-start space-x-3">
                <FileText className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-500 mb-1">Referring Advocate</p>
                  <p className="text-slate-900 font-medium">{caseData.referring_advocate}</p>
                </div>
              </div>
            )}

            {caseData.incharge_advocate && (
              <div className="flex items-start space-x-3">
                <FileText className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-500 mb-1">Incharge Advocate</p>
                  <p className="text-slate-900 font-medium">{caseData.incharge_advocate}</p>
                </div>
              </div>
            )}

            {caseData.other_side_advocate && (
              <div className="flex items-start space-x-3">
                <FileText className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-500 mb-1">Other Side Advocate</p>
                  <p className="text-slate-900 font-medium">{caseData.other_side_advocate}</p>
                </div>
              </div>
            )}

            {caseData.appearing_for && (
              <div className="flex items-start space-x-3">
                <FileText className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-500 mb-1">Appearing For</p>
                  <p className="text-slate-900 font-medium">{caseData.appearing_for}</p>
                </div>
              </div>
            )}

            {caseData.stamp_no && (
              <div className="flex items-start space-x-3">
                <FileText className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-500 mb-1">Stamp No</p>
                  <p className="text-slate-900 font-medium">{caseData.stamp_no}</p>
                </div>
              </div>
            )}

            {caseData.counsel_advocate && (
              <div className="flex items-start space-x-3">
                <FileText className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-500 mb-1">Counsel Advocate</p>
                  <p className="text-slate-900 font-medium">{caseData.counsel_advocate}</p>
                </div>
              </div>
            )}

            {caseData.file_no && (
              <div className="flex items-start space-x-3">
                <FileText className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-500 mb-1">File No</p>
                  <p className="text-slate-900 font-medium">{caseData.file_no}</p>
                </div>
              </div>
            )}

            <div className="flex items-start space-x-3">
              <Calendar className="w-5 h-5 text-slate-400 mt-0.5" />
              <div>
                <p className="text-sm text-slate-500 mb-1">Next Hearing</p>
                <p className="text-slate-900 font-medium">
                  {caseData.next_hearing_date
                    ? new Date(caseData.next_hearing_date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })
                    : 'Not scheduled'}
                </p>
              </div>
            </div>

            {caseData.next_stage && (
              <div className="flex items-start space-x-3">
                <Calendar className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-500 mb-1">Next Stage</p>
                  <p className="text-slate-900 font-medium">{caseData.next_stage}</p>
                </div>
              </div>
            )}
          </div>

          {caseData.notes && (
            <div className="border-t border-slate-200 pt-6">
              <p className="text-sm text-slate-500 mb-2">Notes</p>
              <p className="text-slate-700 whitespace-pre-wrap">{caseData.notes}</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Hearing History</h2>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Next Hearing</span>
            </button>
          </div>

          {hearings.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">No hearings recorded yet</p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="mt-4 text-slate-900 font-medium hover:underline"
              >
                Add the first hearing
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {hearings.map((hearing) => (
                <div
                  key={hearing.id}
                  className="border border-slate-200 rounded-lg p-5 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-5 h-5 text-slate-400" />
                      <span className="font-semibold text-slate-900">
                        {new Date(hearing.hearing_date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="px-3 py-1.5 text-slate-700 border border-slate-300 rounded-md text-sm hover:bg-slate-50 transition"
                        onClick={() => setHearingToEdit(hearing.id)}
                      >
                        Edit
                      </button>
                      <button
                        className="px-3 py-1.5 text-red-700 border border-red-200 bg-red-50 rounded-md text-sm hover:bg-red-100 transition"
                        onClick={() => setHearingToDelete(hearing.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  {hearing.notes && (
                    <p className="text-slate-700 whitespace-pre-wrap">{hearing.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AddHearingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        caseId={id}
        onHearingAdded={async () => {
          await syncNextHearingDate();
          await fetchCaseDetails();
        }}
      />

      <EditHearingModal
        isOpen={!!hearingToEdit}
        onClose={() => setHearingToEdit(null)}
        hearingId={hearingToEdit}
        onHearingUpdated={async () => {
          await syncNextHearingDate();
          await fetchCaseDetails();
        }}
      />

      <ConfirmDialog
        isOpen={confirmOpen}
        title={caseData.case_status === 'closed' ? 'Reopen case?' : 'Close case?'}
        description={
          caseData.case_status === 'closed'
            ? 'This case will be marked as open.'
            : 'This case will be marked as closed.'
        }
        confirmText={caseData.case_status === 'closed' ? 'Reopen' : 'Close Case'}
        cancelText="Cancel"
        onConfirm={confirmToggleCase}
        onCancel={() => setConfirmOpen(false)}
        loading={confirmLoading}
      />

      <ConfirmDialog
        isOpen={!!hearingToDelete}
        title="Delete hearing?"
        description="This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteHearing}
        onCancel={() => setHearingToDelete(null)}
        loading={false}
      />
    </div>
  );
}


