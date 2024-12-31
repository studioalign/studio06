/*
  # Add parent class access policies

  1. Changes
    - Add policy for parents to view classes their students are enrolled in
    - Add policy for parents to view class_students entries for their students

  2. Security
    - Parents can only view classes their students are enrolled in
    - Parents can only view class_students entries for their students
*/

-- Allow parents to view classes their students are enrolled in
CREATE POLICY "Parents can view their students' classes"
  ON classes
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT cs.class_id 
      FROM class_students cs
      JOIN students s ON cs.student_id = s.id
      JOIN parents p ON s.parent_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- Allow parents to view class_students entries for their students
CREATE POLICY "Parents can view their students' class enrollments"
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