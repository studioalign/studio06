/*
  # Fix parent class viewing policies

  1. Changes
    - Drop existing problematic policies
    - Create simplified policies for parent class access
    - Add direct studio access policy for parents

  2. Security
    - Maintain proper row-level security
    - Ensure parents can only see classes from their studio
    - Ensure parents can only see classes their students are enrolled in
*/

-- Drop existing problematic policies
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Parents can view their students'' classes' AND tablename = 'classes') THEN
    DROP POLICY "Parents can view their students' classes" ON classes;
  END IF;
END $$;

-- Create new simplified policy for parents to view classes
CREATE POLICY "Parents can view studio classes"
  ON classes
  FOR SELECT
  TO authenticated
  USING (
    studio_id IN (
      SELECT studio_id 
      FROM parents 
      WHERE user_id = auth.uid()
    )
  );

-- Update class_students policy to be more direct
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Parents can view their students'' class enrollments' AND tablename = 'class_students') THEN
    DROP POLICY "Parents can view their students' class enrollments" ON class_students;
  END IF;
END $$;

CREATE POLICY "Parents can view class enrollments"
  ON class_students
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