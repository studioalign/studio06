/*
  # Fix attendance schema and relationships

  1. Changes
    - Remove class_id column from attendance table since we use class_instance_id
    - Ensure proper cascading deletes
    - Add updated_at trigger

  2. Security
    - Update RLS policies to properly scope access
*/

-- Remove class_id column if it still exists
ALTER TABLE attendance DROP COLUMN IF EXISTS class_id;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_attendance_updated_at
    BEFORE UPDATE ON attendance
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Ensure proper cascading deletes
ALTER TABLE attendance
  DROP CONSTRAINT IF EXISTS attendance_class_instance_id_fkey,
  ADD CONSTRAINT attendance_class_instance_id_fkey
    FOREIGN KEY (class_instance_id)
    REFERENCES class_instances(id)
    ON DELETE CASCADE;

-- Recreate policies with proper scoping
DROP POLICY IF EXISTS "Studio owners can manage attendance" ON attendance;
DROP POLICY IF EXISTS "Teachers can manage attendance" ON attendance;
DROP POLICY IF EXISTS "Parents can view attendance" ON attendance;

CREATE POLICY "Studio owners can manage attendance"
  ON attendance
  FOR ALL
  TO authenticated
  USING (
    class_instance_id IN (
      SELECT ci.id 
      FROM class_instances ci
      JOIN classes c ON ci.class_id = c.id
      JOIN studios s ON c.studio_id = s.id
      JOIN owners o ON s.owner_id = o.id
      WHERE o.user_id = auth.uid()
    )
  )
  WITH CHECK (
    class_instance_id IN (
      SELECT ci.id 
      FROM class_instances ci
      JOIN classes c ON ci.class_id = c.id
      JOIN studios s ON c.studio_id = s.id
      JOIN owners o ON s.owner_id = o.id
      WHERE o.user_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can manage attendance"
  ON attendance
  FOR ALL
  TO authenticated
  USING (
    class_instance_id IN (
      SELECT ci.id 
      FROM class_instances ci
      JOIN classes c ON ci.class_id = c.id
      WHERE c.teacher_id IN (
        SELECT id FROM teachers
        WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    class_instance_id IN (
      SELECT ci.id 
      FROM class_instances ci
      JOIN classes c ON ci.class_id = c.id
      WHERE c.teacher_id IN (
        SELECT id FROM teachers
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Parents can view attendance"
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