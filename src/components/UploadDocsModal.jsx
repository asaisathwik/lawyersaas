import { useState } from 'react';
import { X, Upload } from 'lucide-react';
import { db, storage } from '../lib/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export function UploadDocsModal({ isOpen, onClose, caseId, onUploaded }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleUpload = async (e) => {
    e.preventDefault();
    setError('');
    if (!caseId) return;
    if (!db || !storage) {
      setError('Storage is not configured. Please check Firebase env variables.');
      return;
    }
    if (!files || files.length === 0) {
      setError('Please choose at least one file to upload.');
      return;
    }
    try {
      setLoading(true);
      const tasks = files.map(async (f) => {
        const path = `cases/${caseId}/${Date.now()}_${f.name}`;
        const r = ref(storage, path);
        const metadata = { contentType: f.type || 'application/octet-stream' };
        await uploadBytes(r, f, metadata);
        const url = await getDownloadURL(r);
        return {
          name: f.name,
          size: f.size,
          type: f.type || 'application/octet-stream',
          url,
          uploaded_at: new Date().toISOString(),
        };
      });
      const results = await Promise.allSettled(tasks);
      const uploaded = results.filter(x => x.status === 'fulfilled').map(x => x.value);
      const failures = results.filter(x => x.status === 'rejected').map(x => x.reason?.message || 'Upload failed');
      if (uploaded.length) {
        await updateDoc(doc(db, 'cases', caseId), {
          documents: arrayUnion(...uploaded),
          updated_at: new Date().toISOString(),
        });
      }
      if (!uploaded.length && failures.length) {
        setError(`Failed to upload: ${failures.join('; ')}`);
        return;
      }
      setFiles([]);
      onUploaded && onUploaded();
      onClose && onClose();
    } catch (err) {
      setError(err?.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-900">Add Documents</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleUpload} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Choose files
            </label>
            <input
              type="file"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
              className="block w-full text-sm text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.txt"
            />
            {files?.length > 0 && (
              <p className="mt-2 text-xs text-slate-600">{files.length} file(s) selected</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              {loading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UploadDocsModal;


