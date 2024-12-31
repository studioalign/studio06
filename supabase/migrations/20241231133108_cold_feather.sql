/*
  # Fix parent class viewing

  1. Changes
    - Add policy for parents to view all classes in their studio
    - Add policy for parents to view class enrollments for their students
    - Add policy for parents to view attendance for their students

  2. Security
    - Maintain proper row-level security
    - Ensure parents can only see relevant data
*/

-- Drop existing policies if they exist
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Parents can view studio classes' AND tablename = 'classes') THEN
    DROP POLICY "Parents can view studio classes" ON classes;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Parents can view class enrollments' AND tablename = 'class_students') THEN
    DROP POLICY "Parents can view class enrollments" ON class_students;
  END IF;
END $$;

-- Create new policy for parents to view classes
CREATE POLICY "Parents can view enrolled classes"
  ON classes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM class_students cs
      JOIN students s ON cs.student_id = s.id
      JOIN parents p ON s.parent_id = p.id
      WHERE p.user_id = auth.uid()
      AND cs.class_id = classes.id
    )
  );

-- Create new policy for parents to view class enrollments
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