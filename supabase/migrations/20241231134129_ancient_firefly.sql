/*
  # Add teacher viewing policy for parents

  1. Changes
    - Add policy to allow parents to view teacher information for their studio
*/

-- Create policy for parents to view teachers in their studio
CREATE POLICY "Parents can view studio teachers"
  ON teachers
  FOR SELECT
  TO authenticated
  USING (
    studio_id IN (
      SELECT studio_id 
      FROM parents 
      WHERE user_id = auth.uid()
    )
  );