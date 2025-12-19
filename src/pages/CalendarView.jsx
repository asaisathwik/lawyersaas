import { useState, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { Loader2, Calendar as CalendarIcon, FileText, Phone } from 'lucide-react';
import Link from 'next/link';
import { db } from '../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

export function CalendarView() {
  const { user } = useAuth();
  const [value, setValue] = useState(new Date());
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDateCases, setSelectedDateCases] = useState([]);

  const fetchCases = async () => {
    if (!user?.id) {
      setCases([]);
      setLoading(false);
      return;
    }
    try {
      const q = query(
        collection(db, 'cases'),
        where('user_id', '==', user.id)
      );
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setCases(list);
    } catch (error) {
      console.error('Error fetching cases:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [user]);

  const getLocalDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    if (value instanceof Date) {
      const selectedDate = getLocalDateString(value);
      const casesOnDate = cases.filter((caseItem) => {
        if (!caseItem.next_hearing_date) return false;
        const hearingDate = getLocalDateString(new Date(caseItem.next_hearing_date));
        return hearingDate === selectedDate;
      });
      setSelectedDateCases(casesOnDate);
    }
  }, [value, cases]);

  const tileClassName = ({ date }) => {
    const dateStr = getLocalDateString(date);
    const hasHearing = cases.some((caseItem) => {
      if (!caseItem.next_hearing_date) return false;
      const hearingDate = getLocalDateString(new Date(caseItem.next_hearing_date));
      return hearingDate === dateStr;
    });
    return hasHearing ? 'has-hearing' : '';
  };

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

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Hearing Calendar</h1>
            <p className="text-slate-600">View and track all upcoming hearings</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <style>{`
                .react-calendar {
                  width: 100%;
                  border: none;
                  font-family: inherit;
                }
                .react-calendar__tile {
                  padding: 1rem;
                  position: relative;
                  border-radius: 0.5rem;
                }
                .react-calendar__tile--active {
                  background: #0f172a !important;
                  color: white;
                }
                .react-calendar__tile--now {
                  background: #f1f5f9;
                }
                .react-calendar__tile:hover {
                  background: #e2e8f0;
                }
                .has-hearing {
                  background: #e2e8f0 !important;
                  font-weight: 600;
                }
                .has-hearing::after {
                  content: '';
                  position: absolute;
                  bottom: 0.5rem;
                  left: 50%;
                  transform: translateX(-50%);
                  width: 6px;
                  height: 6px;
                  background: #0f172a;
                  border-radius: 50%;
                }
                .react-calendar__tile--active.has-hearing::after {
                  background: white;
                }
                .react-calendar__navigation button {
                  font-size: 1rem;
                  font-weight: 600;
                  color: #0f172a;
                }
                .react-calendar__navigation button:hover {
                  background: #f1f5f9;
                }
                .react-calendar__month-view__weekdays {
                  font-weight: 600;
                  color: #64748b;
                }
              `}</style>
              <Calendar
                onChange={setValue}
                value={value}
                tileClassName={tileClassName}
              />
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sticky top-24">
              <div className="flex items-center space-x-2 mb-4">
                <CalendarIcon className="w-5 h-5 text-slate-600" />
                <h2 className="text-xl font-bold text-slate-900">
                  {value instanceof Date &&
                    value.toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                </h2>
              </div>

              {selectedDateCases.length === 0 ? (
                <div className="text-center py-8">
                  <div className="bg-slate-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CalendarIcon className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-slate-600 text-sm">No hearings on this date</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600 mb-3">
                    {selectedDateCases.length} {selectedDateCases.length === 1 ? 'hearing' : 'hearings'} scheduled
                  </p>
                  {selectedDateCases.map((caseItem) => (
                    <Link
                      key={caseItem.id}
                      href={`/case/${caseItem.id}`}
                      className="block border border-slate-200 rounded-lg p-4 hover:shadow-md transition"
                    >
                      <h3 className="font-semibold text-slate-900 mb-2">
                        {caseItem.client_name}
                      </h3>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2 text-sm text-slate-600">
                          <FileText className="w-3.5 h-3.5" />
                          <span>{caseItem.case_number}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-slate-600">
                          <Phone className="w-3.5 h-3.5" />
                          <span>{caseItem.client_phone}</span>
                        </div>
                      </div>
                      <span className="inline-block mt-3 px-2 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded">
                        {caseItem.case_type}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


