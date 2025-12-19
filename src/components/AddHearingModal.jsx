import { useState } from 'react';
import { X } from 'lucide-react';
import { db } from '../lib/firebase';
import { addDoc, collection, updateDoc, doc } from 'firebase/firestore';

export function AddHearingModal({ isOpen, onClose, caseId, onHearingAdded }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    hearing_date: '',
    notes: '',
    next_stage: '',
    notify_time: '',
  });

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

      await addDoc(collection(db, 'hearings'), {
        case_id: caseId,
        ...formData,
        notification_time: formData.notify_time || '',
        created_at: new Date().toISOString(),
      });

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


