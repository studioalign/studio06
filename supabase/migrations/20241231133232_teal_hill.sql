/*
  # Update parent class viewing

  1. Changes
    - Allow parents to view all classes in their studio
    - Maintain ability to see enrollment status

  2. Security
    - Parents can only view classes from their studio
    - Maintain existing enrollment viewing permissions
*/

-- Drop existing class viewing policy for parents
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Parents can view enrolled classes' AND tablename = 'classes') THEN
    DROP POLICY "Parents can view enrolled classes" ON classes;
  END IF;
END $$;

-- Create new policy for parents to view all studio classes
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