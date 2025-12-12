import { useState } from 'react';
import { X } from 'lucide-react';
import { db } from '../lib/firebase';
import { addDoc, collection } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

export function AddCaseModal({ isOpen, onClose, onCaseAdded }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    client_name: '',
    client_phone: '',
    case_number: '',
    cnr_number: '',
    case_type: '',
    court_name: '',
    first_hearing_date: '',
    next_stage: '',
    notes: '',
    first_party: '',
    second_party: '',
    referring_advocate: '',
    incharge_advocate: '',
    other_side_advocate: '',
    appearing_for: '',
    stamp_no: '',
    counsel_advocate: '',
    file_no: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!user?.id) {
        setError('Please sign in to add a case.');
        setLoading(false);
        return;
      }

      await addDoc(collection(db, 'cases'), {
        user_id: user?.id || null,
        ...formData,
        next_hearing_date: formData.first_hearing_date || null,
        next_stage: formData.next_stage || '',
        case_status: 'open',
        notification_scheduled: false,
        next_notification_date: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      setFormData({
        client_name: '',
        client_phone: '',
        case_number: '',
        cnr_number: '',
        case_type: '',
        court_name: '',
        first_hearing_date: '',
        next_stage: '',
        notes: '',
        first_party: '',
        second_party: '',
        referring_advocate: '',
        incharge_advocate: '',
        other_side_advocate: '',
        appearing_for: '',
        stamp_no: '',
        counsel_advocate: '',
        file_no: '',
      });
      onCaseAdded && onCaseAdded();
      onClose && onClose();
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'code' in err && err.code === 'permission-denied'
          ? 'You do not have permission to add cases. Please sign in or check Firestore rules.'
          : err instanceof Error
            ? err.message
            : 'Failed to add case';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-900">Add New Case</h2>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Client Name *
              </label>
              <input
                type="text"
                required
                value={formData.client_name}
                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition"
                placeholder="John Doe"
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

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                CNR Number
              </label>
              <input
                type="text"
                value={formData.cnr_number}
                onChange={(e) => setFormData({ ...formData, cnr_number: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition"
                placeholder="e.g., MHXX01-000000-20XX"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                First Party
              </label>
              <input
                type="text"
                value={formData.first_party}
                onChange={(e) => setFormData({ ...formData, first_party: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition"
                placeholder="Plaintiff / Petitioner"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Second Party
              </label>
              <input
                type="text"
                value={formData.second_party}
                onChange={(e) => setFormData({ ...formData, second_party: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition"
                placeholder="Defendant / Respondent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Client Phone Number *
              </label>
              <input
                type="tel"
                required
                value={formData.client_phone}
                onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition"
                placeholder="+91 98765 43210"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Case Number *
              </label>
              <input
                type="text"
                required
                value={formData.case_number}
                onChange={(e) => setFormData({ ...formData, case_number: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition"
                placeholder="CS/123/2024"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Case Type *
              </label>
              <input
                type="text"
                required
                value={formData.case_type}
                onChange={(e) => setFormData({ ...formData, case_type: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition"
                placeholder="Civil, Criminal, Family, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Court Name *
              </label>
              <input
                type="text"
                required
                value={formData.court_name}
                onChange={(e) => setFormData({ ...formData, court_name: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition"
                placeholder="District Court"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Referring Advocate
              </label>
              <input
                type="text"
                value={formData.referring_advocate}
                onChange={(e) => setFormData({ ...formData, referring_advocate: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition"
                placeholder="Referring Advocate"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Incharge Advocate
              </label>
              <input
                type="text"
                value={formData.incharge_advocate}
                onChange={(e) => setFormData({ ...formData, incharge_advocate: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition"
                placeholder="Incharge Advocate"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Other Side Advocate
              </label>
              <input
                type="text"
                value={formData.other_side_advocate}
                onChange={(e) => setFormData({ ...formData, other_side_advocate: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition"
                placeholder="Opposing Counsel"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Appearing For
              </label>
              <input
                type="text"
                value={formData.appearing_for}
                onChange={(e) => setFormData({ ...formData, appearing_for: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition"
                placeholder="Client / First Party / Second Party"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Stamp No
              </label>
              <input
                type="text"
                value={formData.stamp_no}
                onChange={(e) => setFormData({ ...formData, stamp_no: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition"
                placeholder="Stamp number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Counsel Advocate
              </label>
              <input
                type="text"
                value={formData.counsel_advocate}
                onChange={(e) => setFormData({ ...formData, counsel_advocate: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition"
                placeholder="Counsel Advocate"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                File No
              </label>
              <input
                type="text"
                value={formData.file_no}
                onChange={(e) => setFormData({ ...formData, file_no: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition"
                placeholder="Internal file number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                First Hearing Date *
              </label>
              <input
                type="date"
                required
                value={formData.first_hearing_date}
                onChange={(e) => setFormData({ ...formData, first_hearing_date: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition"
              />
            </div>
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
              placeholder="Additional case details..."
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
              disabled={loading || !user?.id}
              className="flex-1 px-6 py-3 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Adding Case...' : user?.id ? 'Add Case' : 'Sign in to add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


