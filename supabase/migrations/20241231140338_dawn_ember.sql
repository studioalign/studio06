/*
  # Fix attendance schema and relationships

  1. Changes
    - Add indexes for better performance
    - Add trigger for class_instances updated_at
    - Ensure proper constraints

  2. Security
    - Update RLS policies for better isolation
*/

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_class_instances_class_date 
  ON class_instances(class_id, date);

CREATE INDEX IF NOT EXISTS idx_attendance_instance_student 
  ON attendance(class_instance_id, student_id);

-- Add updated_at trigger for class_instances
CREATE TRIGGER update_class_instances_updated_at
    BEFORE UPDATE ON class_instances
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Ensure proper constraints and cascading
ALTER TABLE class_instances
  DROP CONSTRAINT IF EXISTS class_instances_class_id_date_key,
  ADD CONSTRAINT class_instances_class_id_date_key 
    UNIQUE(class_id, date);

-- Update class_instances policies for better isolation
DROP POLICY IF EXISTS "Studio owners can manage class instances" ON class_instances;
DROP POLICY IF EXISTS "Teachers can manage their class instances" ON class_instances;
DROP POLICY IF EXISTS "Parents can view class instances" ON class_instances;

CREATE POLICY "Studio owners can manage class instances"
  ON class_instances
  FOR ALL
  TO authenticated
  USING (
    class_id IN (
      SELECT c.id 
      FROM classes c
      JOIN studios s ON c.studio_id = s.id
      JOIN owners o ON s.owner_id = o.id
      WHERE o.user_id = auth.uid()
    )
  )
  WITH CHECK (
    class_id IN (
      SELECT c.id 
      FROM classes c
      JOIN studios s ON c.studio_id = s.id
      JOIN owners o ON s.owner_id = o.id
      WHERE o.user_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can manage their class instances"
  ON class_instances
  FOR ALL
  TO authenticated
  USING (
    class_id IN (
      SELECT id 
      FROM classes
      WHERE teacher_id IN (
        SELECT id FROM teachers
        WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    class_id IN (
      SELECT id 
      FROM classes
      WHERE teacher_id IN (
        SELECT id FROM teachers
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Parents can view class instances"
  ON class_instances
  FOR SELECT
  TO authenticated
  USING (
    class_id IN (
      SELECT c.id
      FROM classes c
      JOIN studios s ON c.studio_id = s.id
      JOIN parents p ON p.studio_id = s.id
      WHERE p.user_id = auth.uid()
    )
  );