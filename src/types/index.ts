export interface Case {
  id: string;
  user_id: string;
  client_name: string;
  client_phone: string;
  case_number: string;
  case_type: string;
  court_name: string;
  first_hearing_date: string;
  next_hearing_date: string | null;
  notes: string;
  case_status: 'open' | 'closed';
  notification_scheduled: boolean;
  next_notification_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Hearing {
  id: string;
  case_id: string;
  hearing_date: string;
  notes: string;
  created_at: string;
}

export interface CaseFormData {
  client_name: string;
  client_phone: string;
  case_number: string;
  case_type: string;
  court_name: string;
  first_hearing_date: string;
  notes: string;
}

export interface HearingFormData {
  hearing_date: string;
  notes: string;
}
