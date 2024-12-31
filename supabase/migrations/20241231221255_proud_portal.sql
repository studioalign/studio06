/*
  # Populate class instances with class data
  
  1. Changes
    - Populates class_instances table with data from base classes
    - Adds function to copy class data when creating new instances
    - Updates trigger to include class data when creating instances
*/

-- First populate existing instances with class data
UPDATE class_instances ci SET
  name = c.name,
  teacher_id = c.teacher_id,
  location_id = c.location_id,
  start_time = c.start_time,
  end_time = c.end_time
FROM classes c
WHERE ci.class_id = c.id;

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS manage_instance_enrollments ON class_instances;
DROP FUNCTION IF EXISTS create_instance_enrollments();

-- Create new function that copies class data when creating enrollments
CREATE OR REPLACE FUNCTION create_instance_enrollments()
RETURNS TRIGGER AS $$
BEGIN
  -- Copy class data to the instance
  UPDATE class_instances 
  SET 
    name = c.name,
    teacher_id = c.teacher_id,
    location_id = c.location_id,
    start_time = c.start_time,
    end_time = c.end_time
  FROM classes c
  WHERE class_instances.id = NEW.id
  AND class_instances.class_id = c.id;

  -- Create enrollments from class_students
  INSERT INTO instance_enrollments (class_instance_id, student_id)
  SELECT NEW.id, cs.student_id
  FROM class_students cs
  WHERE cs.class_id = NEW.class_id
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER manage_instance_enrollments
  AFTER INSERT ON class_instances
  FOR EACH ROW
  EXECUTE FUNCTION create_instance_enrollments();

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_class_instances_composite
  ON class_instances(class_id, date, teacher_id, location_id);

-- Analyze tables for better query planning
ANALYZE class_instances;
ANALYZE classes;