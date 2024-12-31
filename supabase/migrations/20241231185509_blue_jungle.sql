/*
  # Add instance-specific enrollment support
  
  1. Changes
    - Add class_instance_id to class_students table
    - Update constraints and primary key
    - Add policies for instance-specific access
    
  2. Notes
    - Handles existing data migration carefully
    - Preserves data integrity during migration
*/

-- First create a backup of existing enrollments
CREATE TABLE class_students_backup AS 
SELECT * FROM class_students;

-- Drop existing primary key
ALTER TABLE class_students DROP CONSTRAINT class_students_pkey;

-- Add class_instance_id column
ALTER TABLE class_students 
  ADD COLUMN class_instance_id uuid REFERENCES class_instances(id) ON DELETE CASCADE;

-- Create temporary table for new enrollments
CREATE TEMP TABLE new_enrollments AS
WITH RECURSIVE future_instances AS (
  SELECT DISTINCT cs.class_id, cs.student_id, ci.id as instance_id
  FROM class_students cs
  JOIN class_instances ci ON ci.class_id = cs.class_id
  WHERE ci.date >= CURRENT_DATE
)
SELECT * FROM future_instances;

-- Clear existing enrollments
TRUNCATE class_students;

-- Insert new enrollments with instance IDs
INSERT INTO class_students (class_id, student_id, class_instance_id)
SELECT class_id, student_id, instance_id
FROM new_enrollments;

-- Make class_instance_id required
ALTER TABLE class_students ALTER COLUMN class_instance_id SET NOT NULL;

-- Add new primary key
ALTER TABLE class_students 
  ADD PRIMARY KEY (class_id, student_id, class_instance_id);

-- Drop temporary table
DROP TABLE new_enrollments;

-- Update RLS policies
DROP POLICY IF EXISTS "Studio owners can manage class students" ON class_students;
DROP POLICY IF EXISTS "Teachers can view class students" ON class_students;
DROP POLICY IF EXISTS "Parents can view student enrollments" ON class_students;

CREATE POLICY "Studio owners can manage class students"
  ON class_students
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM classes c
      JOIN studios s ON c.studio_id = s.id
      JOIN owners o ON s.owner_id = o.id
      WHERE o.user_id = auth.uid()
      AND c.id = class_students.class_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM classes c
      JOIN studios s ON c.studio_id = s.id
      JOIN owners o ON s.owner_id = o.id
      WHERE o.user_id = auth.uid()
      AND c.id = class_students.class_id
    )
  );

CREATE POLICY "Teachers can view class students"
  ON class_students
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM classes c
      JOIN teachers t ON c.teacher_id = t.id
      WHERE t.user_id = auth.uid()
      AND c.id = class_students.class_id
    )
  );

CREATE POLICY "Parents can view student enrollments"
  ON class_students
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM students s
      JOIN parents p ON s.parent_id = p.id
      WHERE p.user_id = auth.uid()
      AND s.id = class_students.student_id
    )
  );