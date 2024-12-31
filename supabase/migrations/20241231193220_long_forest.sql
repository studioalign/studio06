/*
  # Fix attendance and instance enrollments

  1. Changes
    - Create instance_enrollments table for tracking per-instance student enrollments
    - Add policies for managing instance enrollments
    - Update attendance table to reference instance_enrollments
    - Add indexes for better performance
*/

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS manage_instance_enrollments ON class_instances;
DROP FUNCTION IF EXISTS create_instance_enrollments();

-- Create instance_enrollments table
CREATE TABLE IF NOT EXISTS instance_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_instance_id uuid REFERENCES class_instances(id) ON DELETE CASCADE,
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(class_instance_id, student_id)
);

-- Enable RLS
ALTER TABLE instance_enrollments ENABLE ROW LEVEL SECURITY;

-- Create policies for instance_enrollments
CREATE POLICY "Studio owners can manage instance enrollments"
  ON instance_enrollments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM class_instances ci
      JOIN classes c ON ci.class_id = c.id
      JOIN studios s ON c.studio_id = s.id
      JOIN owners o ON s.owner_id = o.id
      WHERE o.user_id = auth.uid()
      AND ci.id = instance_enrollments.class_instance_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM class_instances ci
      JOIN classes c ON ci.class_id = c.id
      JOIN studios s ON c.studio_id = s.id
      JOIN owners o ON s.owner_id = o.id
      WHERE o.user_id = auth.uid()
      AND ci.id = instance_enrollments.class_instance_id
    )
  );

CREATE POLICY "Teachers can manage instance enrollments"
  ON instance_enrollments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM class_instances ci
      JOIN classes c ON ci.class_id = c.id
      WHERE c.teacher_id IN (
        SELECT id FROM teachers
        WHERE user_id = auth.uid()
      )
      AND ci.id = instance_enrollments.class_instance_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM class_instances ci
      JOIN classes c ON ci.class_id = c.id
      WHERE c.teacher_id IN (
        SELECT id FROM teachers
        WHERE user_id = auth.uid()
      )
      AND ci.id = instance_enrollments.class_instance_id
    )
  );

-- Modify attendance table to reference instance_enrollments
ALTER TABLE attendance
  DROP CONSTRAINT IF EXISTS attendance_instance_student_id_fkey,
  ADD COLUMN instance_enrollment_id uuid REFERENCES instance_enrollments(id) ON DELETE CASCADE,
  ADD CONSTRAINT attendance_instance_enrollment_unique UNIQUE(instance_enrollment_id);

-- Create function to automatically create instance enrollments
CREATE OR REPLACE FUNCTION create_instance_enrollments()
RETURNS TRIGGER AS $$
BEGIN
  -- When a new class instance is created, copy enrollments from class_students
  INSERT INTO instance_enrollments (class_instance_id, student_id)
  SELECT NEW.id, cs.student_id
  FROM class_students cs
  WHERE cs.class_id = NEW.class_id
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to manage instance enrollments
CREATE TRIGGER manage_instance_enrollments
  AFTER INSERT ON class_instances
  FOR EACH ROW
  EXECUTE FUNCTION create_instance_enrollments();

-- Create indexes for better performance
CREATE INDEX idx_instance_enrollments_instance 
  ON instance_enrollments(class_instance_id);
CREATE INDEX idx_instance_enrollments_student 
  ON instance_enrollments(student_id);