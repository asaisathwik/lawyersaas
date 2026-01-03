import { useState } from 'react';
import { X, FileText } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { addDoc, collection, updateDoc, doc } from 'firebase/firestore';

export function AddHearingModal({ isOpen, onClose, caseId, onHearingAdded }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [formData, setFormData] = useState({
    hearing_date: '',
    notes: '',
    next_stage: '',
    notify_time: '',
  });

  function computeReminderTs(hearingDateStr, notifyTimeStr) {
    if (!hearingDateStr) return null;
    try {
      const [y, m, d] = hearingDateStr.split('-').map((v) => parseInt(v, 10));
      if (!y || !m || !d) return null;
      // Use local time to align with user's expectation
      const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
      // Day before
      dt.setDate(dt.getDate() - 1);
      if (notifyTimeStr) {
        const [hh, mm] = notifyTimeStr.split(':').map((v) => parseInt(v, 10));
        if (!Number.isNaN(hh) && !Number.isNaN(mm)) {
          dt.setHours(hh, mm, 0, 0);
        } else {
          // Fallback: 6 PM
          dt.setHours(18, 0, 0, 0);
        }
      } else {
        // Default 6 PM local time
        dt.setHours(18, 0, 0, 0);
      }
      return dt.getTime();
    } catch {
      return null;
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!caseId) {
        setError('Missing case reference.');
        setLoading(false);
        return;
      }

      const reminderTs = computeReminderTs(formData.hearing_date, formData.notify_time);

      const hearingRef = await addDoc(collection(db, 'hearings'), {
        case_id: caseId,
        ...formData,
        notification_time: formData.notify_time || '',
        reminder_scheduled_ts: reminderTs || null,
        reminder_sent: false,
        created_at: new Date().toISOString(),
      });

      // Upload any selected files to case and attach copies to this hearing
      const hearingDocs = [];
      if (selectedFiles && selectedFiles.length > 0) {
        const token = await auth?.currentUser?.getIdToken?.();
        for (const file of selectedFiles) {
          // Convert file to base64 via FileReader
          // eslint-disable-next-line no-await-in-loop
          const base64 = await new Promise((resolve, reject) => {
            try {
              const reader = new FileReader();
              reader.onload = () => {
                try {
                  const result = reader.result || '';
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
              reader.readAsDataURL(file);
            } catch (e) {
              reject(e);
            }
          });
          // eslint-disable-next-line no-await-in-loop
          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: token ? `Bearer ${token}` : '',
            },
            body: JSON.stringify({
              caseId,
              name: file.name,
              type: file.type || 'application/octet-stream',
              size: file.size || null,
              data: base64,
            }),
          });
          if (res.ok) {
            // eslint-disable-next-line no-await-in-loop
            const payload = await res.json().catch(() => ({}));
            if (payload?.document) {
              hearingDocs.push(payload.document);
            }
          }
        }
        if (hearingDocs.length > 0) {
          await updateDoc(doc(db, 'hearings', hearingRef.id), {
            documents: hearingDocs,
            updated_at: new Date().toISOString(),
          });
        }
      }

      await updateDoc(doc(db, 'cases', caseId), {
        next_hearing_date: formData.hearing_date || null,
        next_stage: formData.next_stage || '',
        updated_at: new Date().toISOString(),
      });

      setFormData({
        hearing_date: '',
        notes: '',
        next_stage: '',
        notify_time: '',
      });
      setSelectedFiles([]);
      onHearingAdded && onHearingAdded();
      onClose && onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add hearing');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-[1px] flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
        <div className="sticky top-0 px-6 py-4 flex justify-between items-center rounded-t-2xl bg-white border-b border-slate-200 text-slate-900">
          <h2 className="text-lg font-semibold">Add Next Hearing</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Hearing Date *
              </label>
              <input
                type="date"
                required
                value={formData.hearing_date}
                onChange={(e) => setFormData({ ...formData, hearing_date: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Notification Time (optional)
              </label>
              <input
                type="time"
                value={formData.notify_time}
                onChange={(e) => setFormData({ ...formData, notify_time: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition"
              />
              <p className="mt-2 text-xs text-slate-500">
                If you don&apos;t set a time, you&apos;ll get a reminder the day before at 6:00 PM.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Judge Notes / Progress
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition"
              rows={4}
              placeholder="Notes about the hearing, judge remarks, progress, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Next Stage
            </label>
            <input
              type="text"
              value={formData.next_stage}
              onChange={(e) => setFormData({ ...formData, next_stage: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition"
              placeholder="Trial / Evidence / Arguments / ..."
            />
          </div>

          {/* Optional Documents */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Attach Documents (optional)
            </label>
            <input
              type="file"
              multiple
              onChange={(e) => {
                const files = Array.from(e?.target?.files || []);
                setSelectedFiles(files);
              }}
              className="block w-full text-sm text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
            />
            {selectedFiles && selectedFiles.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedFiles.map((f, idx) => (
                  <span key={`${f.name}-${idx}`} className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 text-xs text-slate-700 bg-slate-50">
                    <FileText className="w-3 h-3" />
                    <span className="truncate max-w-[160px]">{f.name}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Adding...' : 'Add Hearing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


