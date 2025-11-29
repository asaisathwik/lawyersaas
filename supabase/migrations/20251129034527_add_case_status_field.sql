/*
  # Add case_status field to cases table

  ## Changes
  - Add `case_status` column to track if a case is open or closed
  - Default value is 'open' for all existing and new cases
  - Valid values: 'open' or 'closed'
  - Allows lawyers to mark cases as closed when they're resolved
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cases' AND column_name = 'case_status'
  ) THEN
    ALTER TABLE cases ADD COLUMN case_status text DEFAULT 'open' CHECK (case_status IN ('open', 'closed'));
  END IF;
END $$;