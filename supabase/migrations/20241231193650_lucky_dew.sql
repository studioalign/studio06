/*
  # Fix instance enrollments

  1. Changes
    - Populate missing instance enrollments for all class instances
    - Add trigger to ensure enrollments are created for future instances
    - Add indexes for better performance

  2. Data Migration
    - Creates enrollments for all existing class instances based on class_students
*/

-- First, populate missing enrollments for all existing instances
INSERT INTO instance_enrollments (class_instance_id, student_id)
SELECT DISTINCT ci.id, cs.student_id
FROM class_instances ci
JOIN class_students cs ON cs.class_id = ci.class_id
WHERE NOT EXISTS (
  SELECT 1 
  FROM instance_enrollments ie 
  WHERE ie.class_instance_id = ci.id 
  AND ie.student_id = cs.student_id
)
ON CONFLICT DO NOTHING;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS manage_instance_enrollments ON class_instances;

-- Recreate the function with better error handling
CREATE OR REPLACE FUNCTION create_instance_enrollments()
RETURNS TRIGGER AS $$
BEGIN
  -- When a new class instance is created, copy enrollments from class_students
  INSERT INTO instance_enrollments (class_instance_id, student_id)
  SELECT NEW.id, cs.student_id
  FROM class_students cs
  WHERE cs.class_id = NEW.class_id
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error in create_instance_enrollments: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER manage_instance_enrollments
  AFTER INSERT ON class_instances
  FOR EACH ROW
  EXECUTE FUNCTION create_instance_enrollments();

-- Add additional indexes for better performance
CREATE INDEX IF NOT EXISTS idx_instance_enrollments_composite 
  ON instance_enrollments(class_instance_id, student_id);

-- Analyze tables for better query planning
ANALYZE instance_enrollments;
ANALYZE class_instances;
ANALYZE class_students;