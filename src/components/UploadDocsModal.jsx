import { useState } from 'react';
import { X, Upload } from 'lucide-react';
import { db, storage } from '../lib/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

export function UploadDocsModal({ isOpen, onClose, caseId, onUploaded }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0); // 0-100 total progress

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
      setProgress(0);

      const totalBytes = files.reduce((acc, f) => acc + (f.size || 0), 0) || 1;
      const perFileTransferred = new Map(); // key: path string, value: bytesTransferred

      const tasks = files.map((f) => {
        return new Promise(async (resolve, reject) => {
          try {
            const path = `cases/${caseId}/${Date.now()}_${f.name}`;
            const r = ref(storage, path);
            const metadata = { contentType: f.type || 'application/octet-stream' };
            const task = uploadBytesResumable(r, f, metadata);

            task.on('state_changed',
              (snap) => {
                // Track bytesTransferred per file and compute overall
                perFileTransferred.set(path, snap.bytesTransferred || 0);
                let sum = 0;
                perFileTransferred.forEach((v) => { sum += v; });
                const pct = Math.max(0, Math.min(100, Math.round((sum / totalBytes) * 100)));
                setProgress(pct);
              },
              (err) => reject(err),
              async () => {
                try {
                  const url = await getDownloadURL(task.snapshot.ref);
                  resolve({
                    name: f.name,
                    size: f.size,
                    type: f.type || 'application/octet-stream',
                    url,
                    uploaded_at: new Date().toISOString(),
                  });
                } catch (e) {
                  reject(e);
                }
              }
            );
          } catch (e) {
            reject(e);
          }
        });
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
      setProgress(0);
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
              {loading ? `Uploading... ${progress}%` : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UploadDocsModal;


