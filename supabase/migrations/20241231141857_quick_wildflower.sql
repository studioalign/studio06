/*
  # Fix class instances and end date handling

  1. Changes
    - Add trigger to automatically create instances for recurring classes
    - Add validation for class dates
    - Ensure proper handling of end dates
*/

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS manage_class_instances ON classes;
DROP TRIGGER IF EXISTS validate_class_dates_trigger ON classes;

-- Drop existing functions
DROP FUNCTION IF EXISTS create_class_instances();
DROP FUNCTION IF EXISTS validate_class_dates();
DROP FUNCTION IF EXISTS generate_dates(date, date, int);

-- Recreate generate_dates function with better handling
CREATE OR REPLACE FUNCTION generate_dates(start_date date, end_date date, day_of_week int)
RETURNS TABLE (date date) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE dates AS (
    -- Find first occurrence of day_of_week on or after start_date
    SELECT start_date + ((day_of_week - EXTRACT(DOW FROM start_date) + 7) % 7)::integer AS date
    WHERE start_date + ((day_of_week - EXTRACT(DOW FROM start_date) + 7) % 7)::integer <= end_date
    UNION ALL
    SELECT date + 7
    FROM dates
    WHERE date + 7 <= end_date
  )
  SELECT d.date FROM dates d ORDER BY date;
END;
$$ LANGUAGE plpgsql;

-- Create function to validate class dates
CREATE OR REPLACE FUNCTION validate_class_dates()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure end_date is not null
  IF NEW.end_date IS NULL THEN
    RAISE EXCEPTION 'End date is required';
  END IF;

  -- For non-recurring classes
  IF NOT NEW.is_recurring THEN
    IF NEW.date IS NULL THEN
      RAISE EXCEPTION 'Date is required for non-recurring classes';
    END IF;
    IF NEW.date > NEW.end_date THEN
      RAISE EXCEPTION 'Class date must be before or equal to end date';
    END IF;
  -- For recurring classes
  ELSE
    IF NEW.day_of_week IS NULL THEN
      RAISE EXCEPTION 'Day of week is required for recurring classes';
    END IF;
    IF NEW.day_of_week NOT BETWEEN 0 AND 6 THEN
      RAISE EXCEPTION 'Day of week must be between 0 and 6';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to manage class instances
CREATE OR REPLACE FUNCTION create_class_instances()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete future instances
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

-- Create triggers
CREATE TRIGGER validate_class_dates_trigger
  BEFORE INSERT OR UPDATE ON classes
  FOR EACH ROW
  EXECUTE FUNCTION validate_class_dates();

CREATE TRIGGER manage_class_instances
  AFTER INSERT OR UPDATE OF is_recurring, day_of_week, date, end_date
  ON classes
  FOR EACH ROW
  EXECUTE FUNCTION create_class_instances();

-- Create instances for existing classes
DO $$
BEGIN
  -- Update each class to trigger instance creation
  UPDATE classes 
  SET updated_at = NOW() 
  WHERE end_date IS NOT NULL;
END $$;