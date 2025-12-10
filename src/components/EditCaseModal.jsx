import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export function EditCaseModal({ isOpen, onClose, caseId, onCaseUpdated }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    client_name: '',
    client_phone: '',
    case_number: '',
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

  useEffect(() => {
    const load = async () => {
      if (!isOpen || !caseId) return;
      setError('');
      try {
        const snap = await getDoc(doc(db, 'cases', caseId));
        if (snap.exists()) {
          const d = snap.data();
          setFormData({
            client_name: d.client_name || '',
            client_phone: d.client_phone || '',
            case_number: d.case_number || '',
            case_type: d.case_type || '',
            court_name: d.court_name || '',
            first_hearing_date: d.first_hearing_date || '',
            next_stage: d.next_stage || '',
            notes: d.notes || '',
            first_party: d.first_party || '',
            second_party: d.second_party || '',
            referring_advocate: d.referring_advocate || '',
            incharge_advocate: d.incharge_advocate || '',
            other_side_advocate: d.other_side_advocate || '',
            appearing_for: d.appearing_for || '',
            stamp_no: d.stamp_no || '',
            counsel_advocate: d.counsel_advocate || '',
            file_no: d.file_no || '',
          });
        }
      } catch (e) {
        setError('Failed to load case.');
      }
    };
    load();
  }, [isOpen, caseId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await updateDoc(doc(db, 'cases', caseId), {
        ...formData,
        updated_at: new Date().toISOString(),
      });
      onCaseUpdated && onCaseUpdated();
      onClose && onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update case');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-900">Edit Case</h2>
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
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg"
                placeholder="Trial / Evidence / Arguments / ..."
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
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg"
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
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg"
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
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg"
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
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg"
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
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg"
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
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg"
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
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg"
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
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg"
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
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg"
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
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg"
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
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg"
                placeholder="Internal file number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                First Hearing Date
              </label>
              <input
                type="date"
                value={formData.first_hearing_date}
                onChange={(e) => setFormData({ ...formData, first_hearing_date: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg"
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

export default EditCaseModal;


