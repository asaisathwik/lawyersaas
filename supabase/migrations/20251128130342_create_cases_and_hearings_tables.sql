/*
  # Lawyer Case Management System Database Schema

  ## Overview
  This migration creates the database structure for a lawyer case management system
  where lawyers can track cases, clients, and hearing schedules.

  ## New Tables
  
  ### `cases`
  Stores all case information for lawyers
  - `id` (uuid, primary key) - Unique identifier for each case
  - `user_id` (uuid, foreign key to auth.users) - Lawyer who owns this case
  - `client_name` (text) - Name of the client
  - `client_phone` (text) - Client's phone number
  - `case_number` (text) - Official case number
  - `case_type` (text) - Type of case (civil, criminal, etc.)
  - `court_name` (text) - Name of the court handling the case
  - `first_hearing_date` (timestamptz) - Date of the first hearing
  - `next_hearing_date` (timestamptz, nullable) - Date of the next scheduled hearing
  - `notes` (text, nullable) - Additional notes about the case
  - `notification_scheduled` (boolean) - Whether notification is scheduled
  - `next_notification_date` (timestamptz, nullable) - When to send next notification
  - `created_at` (timestamptz) - When the case was created
  - `updated_at` (timestamptz) - When the case was last updated

  ### `hearings`
  Stores hearing history and details for each case
  - `id` (uuid, primary key) - Unique identifier for each hearing
  - `case_id` (uuid, foreign key to cases) - The case this hearing belongs to
  - `hearing_date` (timestamptz) - Date and time of the hearing
  - `notes` (text, nullable) - Notes about the hearing (judge notes, progress, etc.)
  - `created_at` (timestamptz) - When the hearing record was created

  ## Security
  - Enable RLS on all tables
  - Users can only access their own cases and related hearings
  - Policies ensure data isolation between different lawyers
*/

-- Create cases table
CREATE TABLE IF NOT EXISTS cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_name text NOT NULL,
  client_phone text NOT NULL,
  case_number text NOT NULL,
  case_type text NOT NULL,
  court_name text NOT NULL,
  first_hearing_date timestamptz NOT NULL,
  next_hearing_date timestamptz,
  notes text DEFAULT '',
  notification_scheduled boolean DEFAULT false,
  next_notification_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create hearings table
CREATE TABLE IF NOT EXISTS hearings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
  hearing_date timestamptz NOT NULL,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_cases_user_id ON cases(user_id);
CREATE INDEX IF NOT EXISTS idx_cases_next_hearing_date ON cases(next_hearing_date);
CREATE INDEX IF NOT EXISTS idx_hearings_case_id ON hearings(case_id);
CREATE INDEX IF NOT EXISTS idx_hearings_date ON hearings(hearing_date);

-- Enable Row Level Security
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE hearings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cases table
CREATE POLICY "Users can view own cases"
  ON cases FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cases"
  ON cases FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cases"
  ON cases FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own cases"
  ON cases FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for hearings table
CREATE POLICY "Users can view hearings of own cases"
  ON hearings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = hearings.case_id
      AND cases.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert hearings for own cases"
  ON hearings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = hearings.case_id
      AND cases.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update hearings of own cases"
  ON hearings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = hearings.case_id
      AND cases.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = hearings.case_id
      AND cases.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete hearings of own cases"
  ON hearings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = hearings.case_id
      AND cases.user_id = auth.uid()
    )
  );