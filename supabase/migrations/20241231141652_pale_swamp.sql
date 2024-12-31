/*
  # Fix date column ambiguity

  1. Changes
    - Drop and recreate policies with proper column qualifiers
    - Add proper table aliases to avoid ambiguity
*/

-- Drop existing policies
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Parents can view studio classes' AND tablename = 'classes') THEN
    DROP POLICY "Parents can view studio classes" ON classes;
  END IF;
END $$;

-- Recreate policy with proper column qualifiers
CREATE POLICY "Parents can view studio classes"
  ON classes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM parents p
      WHERE p.user_id = auth.uid()
      AND p.studio_id = classes.studio_id
    )
  );

-- Update class instances policy
DROP POLICY IF EXISTS "Parents can view class instances" ON class_instances;

CREATE POLICY "Parents can view class instances"
  ON class_instances
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM parents p
      JOIN studios s ON p.studio_id = s.id
      JOIN classes c ON c.studio_id = s.id
      WHERE p.user_id = auth.uid()
      AND class_instances.class_id = c.id
    )
  );