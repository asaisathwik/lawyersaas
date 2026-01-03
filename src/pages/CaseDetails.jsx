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
import { auth, db } from '../lib/firebase';
import { doc, getDoc, updateDoc, deleteDoc, collection, getDocs, query, where, orderBy, limit, arrayUnion, arrayRemove } from 'firebase/firestore';
// no firebase storage here; upload handled via API using Cloudinary
 

export function CaseDetails() {
  const router = useRouter();
  const { id } = router.query || {};
  const [caseData, setCaseData] = useState(null);
  const [hearings, setHearings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQuickHearingOpen, setIsQuickHearingOpen] = useState(false);
  const [quickDate, setQuickDate] = useState('');
  const [quickStage, setQuickStage] = useState('');
  const [quickSaving, setQuickSaving] = useState(false);
  const [quickError, setQuickError] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [hearingToEdit, setHearingToEdit] = useState(null);
  const [hearingToDelete, setHearingToDelete] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [previewDoc, setPreviewDoc] = useState(null);
  const [deleteDocCandidate, setDeleteDocCandidate] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  

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

  const handleFileChange = (e) => {
    setUploadError('');
    setSelectedFile(e?.target?.files?.[0] || null);
  };

  const handleUploadDocument = async (e) => {
    e.preventDefault();
    setUploadError('');
    if (!id) {
      setUploadError('Case not found.');
      return;
    }
    if (!selectedFile) {
      setUploadError('Please select a file.');
      return;
    }
    setUploading(true);
    try {
      const token = await auth?.currentUser?.getIdToken?.();
      if (!token) {
        setUploadError('You are not signed in.');
        setUploading(false);
        return;
      }
      // Convert file to base64 via FileReader to avoid large arg spreads causing stack overflow
      const base64 = await new Promise((resolve, reject) => {
        try {
          const reader = new FileReader();
          reader.onload = () => {
            try {
              const result = reader.result || '';
              // reader.result is a data URL: "data:<mime>;base64,<payload>"
              if (typeof result === 'string') {
                const idx = result.indexOf(',');
                resolve(idx >= 0 ? result.slice(idx + 1) : '');
              } else {
                resolve('');
              }
            } catch (e) {
              reject(e);
            }
          };
          reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
          reader.readAsDataURL(selectedFile);
        } catch (e) {
          reject(e);
        }
      });
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          caseId: id,
          name: selectedFile.name,
          type: selectedFile.type || 'application/octet-stream',
          size: selectedFile.size || null,
          data: base64,
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        const message = payload?.error || `Upload failed (${res.status})`;
        setUploadError(message);
        setUploading(false);
        return;
      }
      setSelectedFile(null);
      setUploading(false);
      fetchCaseDetails().catch((e2) => console.error('Refresh documents failed:', e2));
    } catch (err) {
      setUploadError(err?.message || 'Failed to upload. Please try again.');
      console.error('Upload error:', err);
      setUploading(false);
    }
  };

  const buildDownloadUrl = (docItem) => {
    const url = docItem?.url || '';
    const name = docItem?.name || 'document';
    const type = docItem?.content_type || 'application/octet-stream';
    const q = new URLSearchParams({
      url,
      name,
      type,
    });
    return `/api/download?${q.toString()}`;
  };

  const triggerDownload = async (docItem) => {
    try {
      const href = buildDownloadUrl(docItem);
      const res = await fetch(href);
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = docItem?.name || 'document';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (e) {
      // Fallback: open in new tab if blob save fails
      try {
        window.open(docItem?.url || '#', '_blank', 'noopener,noreferrer');
      } catch {}
    }
  };

  const openPreview = (docItem) => {
    const type = (docItem?.content_type || '').toLowerCase();
    const isImage = type.startsWith('image');
    if (isImage) {
      setPreviewDoc(docItem);
    } else {
      triggerDownload(docItem);
    }
  };

  const closePreview = () => {
    setPreviewDoc(null);
  };

  const confirmDeleteDocument = (docItem) => {
    setDeleteDocCandidate(docItem);
  };

  const handleDeleteDocument = async () => {
    if (!deleteDocCandidate || !id) return;
    setDeleteLoading(true);
    try {
      const token = await auth?.currentUser?.getIdToken?.();
      if (!token) {
        setUploadError('You are not signed in.');
        setDeleteLoading(false);
        return;
      }
      const res = await fetch('/api/delete-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ caseId: id, document: deleteDocCandidate }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || `Delete failed (${res.status})`);
      }
      // Firestore already updated by API, but refetch to sync UI
      await fetchCaseDetails();
      setDeleteDocCandidate(null);
    } catch (e) {
      setUploadError(e?.message || 'Failed to delete document');
    } finally {
      setDeleteLoading(false);
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
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Next Hearing</span>
            </button>
          </div>
        </div>

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

            {caseData.cnr_number && (
              <div className="flex items-start space-x-3">
                <FileText className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-500 mb-1">CNR Number</p>
                  <p className="text-slate-900 font-medium">{caseData.cnr_number}</p>
                </div>
              </div>
            )}

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
                {caseData.next_hearing_date ? (
                  <p className="text-slate-900 font-medium">
                    {new Date(caseData.next_hearing_date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                ) : (
                  <div className="flex flex-col">
                    <p className="text-slate-900 font-medium">Not scheduled</p>
                    <button
                      type="button"
                      onClick={() => {
                        setQuickDate('');
                        setQuickStage('');
                        setQuickError('');
                        setIsQuickHearingOpen(true);
                      }}
                      className="self-start mt-2 px-2.5 py-1.5 text-slate-700 border border-slate-300 rounded-md text-xs hover:bg-slate-50 transition"
                    >
                      Add hearing details
                    </button>
                  </div>
                )}
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

            {caseData.first_hearing_date && (
              <div className="flex items-start space-x-3">
                <Calendar className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-500 mb-1">First Hearing</p>
                  <p className="text-slate-900 font-medium">
                    {new Date(caseData.first_hearing_date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
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

        
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Documents</h2>
          </div>
          <form onSubmit={handleUploadDocument} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
            <input
              type="file"
              onChange={handleFileChange}
              className="block w-full text-sm text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
            />
            <button
              type="submit"
              disabled={uploading}
              className="inline-flex items-center justify-center px-4 py-2 bg-slate-900 text-white rounded-md font-medium hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </span>
              ) : (
                'Upload'
              )}
            </button>
          </form>
          {uploadError && <p className="text-sm text-red-600 mb-4">{uploadError}</p>}

          {(caseData?.documents && caseData.documents.length > 0) ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {caseData.documents.map((docItem, idx) => {
                const type = (docItem.content_type || '').toLowerCase();
                const isImage = type.startsWith('image');
                const isPdf = type.includes('pdf') || /\.pdf$/i.test(docItem?.name || '');
                return (
                  <div key={`${docItem.url}-${idx}`} className="group relative border border-slate-200 rounded-lg overflow-hidden hover:shadow-md transition">
                    <button
                      type="button"
                      onClick={() => openPreview(docItem)}
                      className="block w-full text-left"
                    >
                      <div className="aspect-video bg-slate-50 flex items-center justify-center overflow-hidden">
                        {isImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={docItem.url} alt={docItem.name || 'document'} className="w-full h-full object-cover" />
                        ) : isPdf ? (
                          <div className="flex flex-col items-center justify-center text-slate-600">
                            <FileText className="w-10 h-10 mb-2" />
                            <span className="text-sm">PDF</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-slate-600">
                            <FileText className="w-10 h-10 mb-2" />
                            <span className="text-sm">Document</span>
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="text-slate-900 font-medium truncate">{docItem.name || 'Document'}</p>
                        <p className="text-xs text-slate-500">
                          {docItem.content_type || 'file'} {docItem.size ? `• ${(docItem.size / (1024 * 1024)).toFixed(2)} MB` : ''} {docItem.uploaded_at ? `• ${new Date(docItem.uploaded_at).toLocaleDateString('en-IN')}` : ''}
                        </p>
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              triggerDownload(docItem);
                            }}
                            className="inline-flex items-center px-2.5 py-1.5 text-slate-700 border border-slate-300 rounded-md text-xs hover:bg-slate-50 transition"
                          >
                            Download
                          </button>
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => confirmDeleteDocument(docItem)}
                      className="absolute top-2 right-2 rounded-full bg-white/90 border border-slate-200 p-1.5 text-slate-700 hover:bg-white shadow-sm"
                      aria-label="Delete document"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-slate-600">No documents uploaded yet.</p>
          )}

          {/* Preview modal */}
          {previewDoc && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={closePreview}>
              <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-slate-200 p-3">
                  <p className="font-medium text-slate-900 truncate pr-6">{previewDoc.name || 'Document'}</p>
                  <button className="p-1.5 rounded-md hover:bg-slate-100" onClick={closePreview} aria-label="Close preview">
                    <X className="w-5 h-5 text-slate-700" />
                  </button>
                </div>
                <div className="p-0">
                  {((previewDoc.content_type || '').toLowerCase().startsWith('image')) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewDoc.url} alt={previewDoc.name || 'document'} className="max-h-[80vh] w-auto mx-auto" />
                  ) : (
                    <div className="p-6">
                      <p className="text-slate-700 mb-3">Preview is available for images only.</p>
                      <a href={previewDoc.url} target="_blank" rel="noreferrer" className="px-3 py-2 text-slate-700 border border-slate-300 rounded-md text-sm hover:bg-slate-50 transition">
                        Open / Download
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Hearing History</h2>
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
                  {Array.isArray(hearing.documents) && hearing.documents.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {hearing.documents.map((docItem, idx) => (
                        <a
                          key={`${docItem.url || idx}`}
                          href={docItem.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 text-xs text-slate-700 bg-slate-50 hover:bg-slate-100 transition"
                        >
                          <FileText className="w-3 h-3" />
                          <span className="truncate max-w-[160px]">{docItem.name || 'Document'}</span>
                        </a>
                      ))}
                    </div>
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

      {/* Quick add two inputs modal */}
      {isQuickHearingOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200">
            <div className="sticky top-0 px-6 py-4 flex justify-between items-center rounded-t-2xl bg-white border-b border-slate-200 text-slate-900">
              <h3 className="text-lg font-semibold">Add Hearing Details</h3>
              <button
                onClick={() => setIsQuickHearingOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!id) return;
                setQuickError('');
                setQuickSaving(true);
                try {
                  await updateDoc(doc(db, 'cases', id), {
                    first_hearing_date: quickDate || '',
                    next_stage: quickStage || '',
                    next_hearing_date: quickDate || null,
                    updated_at: new Date().toISOString(),
                  });
                  setIsQuickHearingOpen(false);
                  await fetchCaseDetails();
                } catch (e2) {
                  setQuickError(e2 instanceof Error ? e2.message : 'Failed to save hearing details.');
                } finally {
                  setQuickSaving(false);
                }
              }}
              className="p-6 space-y-5"
            >
              {quickError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {quickError}
                </div>
              )}
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    First Hearing Date
                  </label>
                  <input
                    type="date"
                    value={quickDate}
                    onChange={(e) => setQuickDate(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    First Hearing Stage
                  </label>
                  <input
                    type="text"
                    value={quickStage}
                    onChange={(e) => setQuickStage(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition"
                    placeholder="Trial / Evidence / Arguments / ..."
                  />
                </div>
              </div>
              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsQuickHearingOpen(false)}
                  className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={quickSaving}
                  className="flex-1 px-6 py-3 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {quickSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
        isOpen={!!deleteDocCandidate}
        title="Delete document?"
        description="This file will be removed."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteDocument}
        onCancel={() => setDeleteDocCandidate(null)}
        loading={deleteLoading}
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


