/*
  # Implement recurring classes

  1. Changes
    - Add end_date validation
    - Fix class instance generation
    - Add proper date handling for recurring classes

  2. Security
    - Maintain existing RLS policies
*/

-- Drop existing triggers
DROP TRIGGER IF EXISTS manage_class_instances ON classes;
DROP TRIGGER IF EXISTS validate_class_dates_trigger ON classes;

-- Drop existing functions
DROP FUNCTION IF EXISTS create_class_instances();
DROP FUNCTION IF EXISTS validate_class_dates();

-- Create function to validate class dates
CREATE OR REPLACE FUNCTION validate_class_dates()
RETURNS TRIGGER AS $$
BEGIN
  -- For non-recurring classes
  IF NOT NEW.is_recurring THEN
    IF NEW.date IS NULL THEN
      RAISE EXCEPTION 'Date is required for non-recurring classes';
    END IF;
    -- For non-recurring classes, end_date should equal date
    NEW.end_date = NEW.date;
  -- For recurring classes
  ELSE
    IF NEW.day_of_week IS NULL THEN
      RAISE EXCEPTION 'Day of week is required for recurring classes';
    END IF;
    -- Set end_date to 3 months from current date for recurring classes
    NEW.end_date = CURRENT_DATE + INTERVAL '3 months';
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
    SELECT 
      NEW.id,
      generate_series(
        -- Start from the next occurrence of day_of_week
        CURRENT_DATE + (NEW.day_of_week - EXTRACT(DOW FROM CURRENT_DATE))::integer % 7,
        NEW.end_date,
        '7 days'::interval
      )::date,
      'scheduled'::class_status;
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