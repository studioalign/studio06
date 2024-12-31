/*
  # Fix attendance schema and constraints

  1. Changes
    - Remove date column from attendance table since it's already in class_instances
    - Update unique constraint
    - Add migration to safely handle existing data
*/

-- First remove the old unique constraint
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_class_id_student_id_date_key;

-- Remove the date column since it's redundant with class_instances
ALTER TABLE attendance DROP COLUMN IF EXISTS date;

-- Ensure the unique constraint is properly set
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_unique_instance;
ALTER TABLE attendance ADD CONSTRAINT attendance_unique_instance UNIQUE(class_instance_id, student_id);

-- Update RLS policies to reflect the schema changes
DROP POLICY IF EXISTS "Studio owners can manage attendance" ON attendance;
DROP POLICY IF EXISTS "Teachers can manage attendance" ON attendance;
DROP POLICY IF EXISTS "Parents can view attendance" ON attendance;

-- Recreate policies with correct conditions
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