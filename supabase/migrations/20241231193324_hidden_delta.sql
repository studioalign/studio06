/*
  # Fix attendance system

  1. Changes
    - Drop existing instance_students and instance_enrollments tables
    - Create new instance_enrollments table with proper constraints
    - Update attendance table to reference instance_enrollments
    - Add proper indexes and policies
*/

-- Drop existing tables and triggers
DROP TABLE IF EXISTS instance_students CASCADE;
DROP TABLE IF EXISTS instance_enrollments CASCADE;
DROP TRIGGER IF EXISTS manage_instance_enrollments ON class_instances;
DROP FUNCTION IF EXISTS create_instance_enrollments();

-- Create instance_enrollments table
CREATE TABLE instance_enrollments (
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

CREATE POLICY "Parents can view instance enrollments"
  ON instance_enrollments
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

-- Recreate attendance table
DROP TABLE IF EXISTS attendance CASCADE;

CREATE TABLE attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_enrollment_id uuid REFERENCES instance_enrollments(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('present', 'late', 'authorised', 'unauthorised')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(instance_enrollment_id)
);

-- Enable RLS
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Create policies for attendance
CREATE POLICY "Studio owners can manage attendance"
  ON attendance
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM instance_enrollments ie
      JOIN class_instances ci ON ci.id = ie.class_instance_id
      JOIN classes c ON ci.class_id = c.id
      JOIN studios s ON c.studio_id = s.id
      JOIN owners o ON s.owner_id = o.id
      WHERE o.user_id = auth.uid()
      AND ie.id = attendance.instance_enrollment_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM instance_enrollments ie
      JOIN class_instances ci ON ci.id = ie.class_instance_id
      JOIN classes c ON ci.class_id = c.id
      JOIN studios s ON c.studio_id = s.id
      JOIN owners o ON s.owner_id = o.id
      WHERE o.user_id = auth.uid()
      AND ie.id = attendance.instance_enrollment_id
    )
  );

CREATE POLICY "Teachers can manage attendance"
  ON attendance
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM instance_enrollments ie
      JOIN class_instances ci ON ci.id = ie.class_instance_id
      JOIN classes c ON ci.class_id = c.id
      WHERE c.teacher_id IN (
        SELECT id FROM teachers
        WHERE user_id = auth.uid()
      )
      AND ie.id = attendance.instance_enrollment_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM instance_enrollments ie
      JOIN class_instances ci ON ci.id = ie.class_instance_id
      JOIN classes c ON ci.class_id = c.id
      WHERE c.teacher_id IN (
        SELECT id FROM teachers
        WHERE user_id = auth.uid()
      )
      AND ie.id = attendance.instance_enrollment_id
    )
  );

CREATE POLICY "Parents can view attendance"
  ON attendance
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM instance_enrollments ie
      JOIN students s ON s.id = ie.student_id
      JOIN parents p ON s.parent_id = p.id
      WHERE p.user_id = auth.uid()
      AND ie.id = attendance.instance_enrollment_id
    )
  );

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
CREATE INDEX idx_attendance_enrollment 
  ON attendance(instance_enrollment_id);