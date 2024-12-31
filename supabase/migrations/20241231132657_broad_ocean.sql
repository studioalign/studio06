/*
  # Fix class_students policies

  1. Changes
    - Replace existing class_students policy with a simpler version
    - Add policy for parents to view attendance records

  2. Security
    - Parents can only view class_students entries for their students
    - Parents can view attendance for their students' classes
*/

-- Drop existing policy if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'class_students' 
    AND policyname = 'Parents can view their students'' class enrollments'
  ) THEN
    DROP POLICY "Parents can view their students' class enrollments" ON class_students;
  END IF;
END $$;

-- Create simplified policy for class_students
CREATE POLICY "Parents can view their students' class enrollments"
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

-- Add policy for parents to view attendance
CREATE POLICY "Parents can view their students' attendance"
  ON attendance
  FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT s.id 
      FROM students s
      JOIN parents p ON s.parent_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );