/*
  # Add end date to classes and auto-create instances

  1. Schema Changes
    - Add end_date to classes table
    - Add function to auto-create instances
    - Add trigger to manage instances on class changes

  2. Data Migration
    - Update existing classes with reasonable end dates
    - Create instances for existing classes
*/

-- Add end_date to classes
ALTER TABLE classes ADD COLUMN end_date date;

-- Update existing classes to have an end date 3 months from their creation
UPDATE classes 
SET end_date = created_at::date + INTERVAL '3 months'
WHERE end_date IS NULL;

-- Make end_date required for future classes
ALTER TABLE classes ALTER COLUMN end_date SET NOT NULL;

-- Add constraint to ensure end_date is after the class date for non-recurring classes
ALTER TABLE classes ADD CONSTRAINT valid_class_dates 
  CHECK (
    (is_recurring = true) OR 
    (is_recurring = false AND date <= end_date)
  );

-- Function to generate dates between two dates
CREATE OR REPLACE FUNCTION generate_dates(start_date date, end_date date, day_of_week int)
RETURNS TABLE (date date) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE dates AS (
    -- Find first occurrence of day_of_week after start_date
    SELECT start_date + (day_of_week - EXTRACT(DOW FROM start_date))::integer % 7 AS date
    UNION ALL
    SELECT date + 7
    FROM dates
    WHERE date + 7 <= end_date
  )
  SELECT d.date FROM dates d;
END;
$$ LANGUAGE plpgsql;

-- Function to create class instances
CREATE OR REPLACE FUNCTION create_class_instances()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete existing future instances
  DELETE FROM class_instances 
  WHERE class_id = NEW.id 
  AND date > CURRENT_DATE;

  -- Create new instances
  IF NEW.is_recurring THEN
    INSERT INTO class_instances (class_id, date, status)
    SELECT NEW.id, date, 'scheduled'
    FROM generate_dates(
      GREATEST(CURRENT_DATE, NEW.created_at::date),
      NEW.end_date,
      NEW.day_of_week
    );
  ELSE
    -- For non-recurring classes, create single instance
    INSERT INTO class_instances (class_id, date, status)
    VALUES (NEW.id, NEW.date, 'scheduled');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to manage instances
CREATE TRIGGER manage_class_instances
  AFTER INSERT OR UPDATE OF is_recurring, day_of_week, date, end_date
  ON classes
  FOR EACH ROW
  EXECUTE FUNCTION create_class_instances();

-- Create instances for existing classes
DO $$
DECLARE
  class_record RECORD;
BEGIN
  FOR class_record IN SELECT * FROM classes LOOP
    -- Trigger the function for each class
    UPDATE classes 
    SET updated_at = NOW() 
    WHERE id = class_record.id;
  END LOOP;
END $$;