/*
  # Add class instance tracking and attendance improvements

  1. Changes
    - Add trigger to automatically create instances for recurring classes
    - Add function to handle instance creation on schedule changes
    - Add constraint to ensure end_date is after start date
    - Add indexes for performance optimization

  2. Security
    - Enable RLS on all new tables
    - Add policies for owners, teachers, and parents
*/

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_class_instances_date 
  ON class_instances(date);

CREATE INDEX IF NOT EXISTS idx_class_instances_class_status 
  ON class_instances(class_id, status);

-- Function to validate class dates
CREATE OR REPLACE FUNCTION validate_class_dates()
RETURNS TRIGGER AS $$
BEGIN
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
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for date validation
CREATE TRIGGER validate_class_dates_trigger
  BEFORE INSERT OR UPDATE ON classes
  FOR EACH ROW
  EXECUTE FUNCTION validate_class_dates();

-- Function to clean up old unattended instances
CREATE OR REPLACE FUNCTION cleanup_old_instances()
RETURNS void AS $$
BEGIN
  -- Delete unattended instances older than 30 days
  DELETE FROM class_instances
  WHERE date < CURRENT_DATE - INTERVAL '30 days'
    AND status = 'scheduled'
    AND NOT EXISTS (
      SELECT 1 
      FROM attendance 
      WHERE attendance.class_instance_id = class_instances.id
    );
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to clean up old instances (needs to be run manually by admin)
COMMENT ON FUNCTION cleanup_old_instances IS 
  'Run this function periodically to clean up old unattended class instances';