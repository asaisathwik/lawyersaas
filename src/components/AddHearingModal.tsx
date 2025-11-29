import { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { HearingFormData } from '../types';

interface AddHearingModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
  onHearingAdded: () => void;
}

export function AddHearingModal({ isOpen, onClose, caseId, onHearingAdded }: AddHearingModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<HearingFormData>({
    hearing_date: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: insertError } = await supabase.from('hearings').insert({
        case_id: caseId,
        ...formData,
      });

      if (insertError) throw insertError;

      const { error: updateError } = await supabase
        .from('cases')
        .update({
          next_hearing_date: formData.hearing_date,
          updated_at: new Date().toISOString()
        })
        .eq('id', caseId);

      if (updateError) throw updateError;

      setFormData({
        hearing_date: '',
        notes: '',
      });
      onHearingAdded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add hearing');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="border-b border-slate-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-900">Add Next Hearing</h2>
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
