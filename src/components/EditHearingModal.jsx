import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

export function EditHearingModal({ isOpen, onClose, hearingId, onHearingUpdated }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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
      const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
      dt.setDate(dt.getDate() - 1);
      if (notifyTimeStr) {
        const [hh, mm] = notifyTimeStr.split(':').map((v) => parseInt(v, 10));
        if (!Number.isNaN(hh) && !Number.isNaN(mm)) {
          dt.setHours(hh, mm, 0, 0);
        } else {
          dt.setHours(18, 0, 0, 0);
        }
      } else {
        dt.setHours(18, 0, 0, 0);
      }
      return dt.getTime();
    } catch {
      return null;
    }
  }

  useEffect(() => {
    const load = async () => {
      if (!isOpen || !hearingId) return;
      setError('');
    try {
      const snap = await getDoc(doc(db, 'hearings', hearingId));
      if (snap.exists()) {
        const data = snap.data();
        setFormData({
          hearing_date: data.hearing_date || '',
          notes: data.notes || '',
          next_stage: data.next_stage || '',
          notify_time: data.notification_time || data.notify_time || '',
        });
      }
      } catch (e) {
        setError('Failed to load hearing.');
      }
    };
    load();
  }, [isOpen, hearingId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const reminderTs = computeReminderTs(formData.hearing_date, formData.notify_time);
      await updateDoc(doc(db, 'hearings', hearingId), {
        hearing_date: formData.hearing_date || '',
        notes: formData.notes || '',
        next_stage: formData.next_stage || '',
        notification_time: formData.notify_time || '',
        reminder_scheduled_ts: reminderTs || null,
        reminder_sent: false,
      });
      onHearingUpdated && onHearingUpdated();
      onClose && onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update hearing');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="border-b border-slate-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-900">Edit Hearing</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Hearing Date
            </label>
            <input
              type="date"
              value={formData.hearing_date}
              onChange={(e) => setFormData({ ...formData, hearing_date: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition"
              rows={4}
              placeholder="Update notes..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
            </div>
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
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditHearingModal;


