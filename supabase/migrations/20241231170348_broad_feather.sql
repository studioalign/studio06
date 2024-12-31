/*
  # Update class instance policies

  1. Changes
    - Add policy for teachers to view their class instances
    - Add policy for parents to view their studio's class instances
    - Update existing policies to use proper joins and conditions

  2. Security
    - Ensure proper row-level security for all roles
    - Maintain data isolation between studios
*/

-- Drop existing policies
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Studio owners can manage class instances' AND tablename = 'class_instances') THEN
    DROP POLICY "Studio owners can manage class instances" ON class_instances;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Teachers can manage their class instances' AND tablename = 'class_instances') THEN
    DROP POLICY "Teachers can manage their class instances" ON class_instances;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Parents can view class instances' AND tablename = 'class_instances') THEN
    DROP POLICY "Parents can view class instances" ON class_instances;
  END IF;
END $$;

-- Create new policies with proper joins
CREATE POLICY "Studio owners can manage class instances"
  ON class_instances
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM classes c
      JOIN studios s ON c.studio_id = s.id
      JOIN owners o ON s.owner_id = o.id
      WHERE o.user_id = auth.uid()
      AND c.id = class_instances.class_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM classes c
      JOIN studios s ON c.studio_id = s.id
      JOIN owners o ON s.owner_id = o.id
      WHERE o.user_id = auth.uid()
      AND c.id = class_instances.class_id
    )
  );

CREATE POLICY "Teachers can manage their class instances"
  ON class_instances
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM classes c
      JOIN teachers t ON c.teacher_id = t.id
      WHERE t.user_id = auth.uid()
      AND c.id = class_instances.class_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM classes c
      JOIN teachers t ON c.teacher_id = t.id
      WHERE t.user_id = auth.uid()
      AND c.id = class_instances.class_id
    )
  );

CREATE POLICY "Parents can view studio class instances"
  ON class_instances
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM classes c
      JOIN studios s ON c.studio_id = s.id
      JOIN parents p ON p.studio_id = s.id
      WHERE p.user_id = auth.uid()
      AND c.id = class_instances.class_id
    )
  );