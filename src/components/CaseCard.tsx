import { Link } from 'react-router-dom';
import { Case } from '../types';
import { Calendar, Phone, FileText, Building, CheckCircle } from 'lucide-react';

interface CaseCardProps {
  case: Case;
}

export function CaseCard({ case: caseData }: CaseCardProps) {
  const nextHearingDate = caseData.next_hearing_date
    ? new Date(caseData.next_hearing_date).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Not scheduled';

  const isClosed = caseData.case_status === 'closed';

  return (
    <div className={`bg-white border rounded-xl p-6 hover:shadow-lg transition-shadow ${isClosed ? 'border-slate-300 bg-slate-50' : 'border-slate-200'}`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <h3 className={`text-lg font-semibold ${isClosed ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
              {caseData.client_name}
            </h3>
            {isClosed && <CheckCircle className="w-5 h-5 text-green-600" />}
          </div>
          <div className="flex items-center space-x-2 text-sm text-slate-600">
            <Phone className="w-3.5 h-3.5" />
            <span>{caseData.client_phone}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-full">
            {caseData.case_type}
          </span>
          {isClosed && (
            <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
              Closed
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center space-x-2 text-sm text-slate-600">
          <FileText className="w-3.5 h-3.5" />
          <span className="font-medium">Case No:</span>
          <span>{caseData.case_number}</span>
        </div>

        <div className="flex items-center space-x-2 text-sm text-slate-600">
          <Building className="w-3.5 h-3.5" />
          <span>{caseData.court_name}</span>
        </div>

        <div className="flex items-center space-x-2 text-sm">
          <Calendar className="w-3.5 h-3.5 text-slate-600" />
          <span className="font-medium text-slate-700">Next Hearing:</span>
          <span className={caseData.next_hearing_date ? 'text-slate-900 font-medium' : 'text-slate-500'}>
            {nextHearingDate}
          </span>
        </div>
      </div>

      <Link
        to={`/case/${caseData.id}`}
        className="block w-full text-center bg-slate-900 text-white py-2.5 rounded-lg font-medium hover:bg-slate-800 transition"
      >
        View Details
      </Link>
    </div>
  );
}
