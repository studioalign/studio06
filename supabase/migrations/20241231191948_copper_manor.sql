/*
  # Restructure attendance table to use instance_students

  1. Changes
    - Add ID to instance_students table
    - Update attendance table to reference instance_students
    - Add proper indexes and constraints
    
  2. Security
    - Maintain existing RLS policies with improved constraints
*/

-- First backup existing attendance records
CREATE TABLE attendance_backup AS 
SELECT * FROM attendance;

-- Add ID to instance_students
ALTER TABLE instance_students 
  ADD COLUMN id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  DROP CONSTRAINT instance_students_pkey,
  ADD CONSTRAINT instance_students_unique_enrollment UNIQUE (class_instance_id, student_id);

-- Drop and recreate attendance table
DROP TABLE attendance;

CREATE TABLE attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_student_id uuid NOT NULL REFERENCES instance_students(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('present', 'late', 'authorised', 'unauthorised')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT attendance_instance_student_unique UNIQUE(instance_student_id)
);

-- Enable RLS
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Restore attendance records with new relationship
WITH instance_student_map AS (
  SELECT 
    instance_students.id AS instance_student_id,
    instance_students.class_instance_id,
    instance_students.student_id
  FROM instance_students
)
INSERT INTO attendance (
  id,
  instance_student_id,
  status,
  notes,
  created_at,
  updated_at
)
SELECT 
  ab.id,
  ism.instance_student_id,
  ab.status,
  ab.notes,
  ab.created_at,
  ab.updated_at
FROM attendance_backup ab
JOIN instance_student_map ism ON 
  ism.class_instance_id = ab.class_instance_id AND 
  ism.student_id = ab.student_id
ON CONFLICT (instance_student_id) 
DO UPDATE SET
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  updated_at = now();

-- Drop backup table
DROP TABLE attendance_backup;

-- Create indexes for better performance
CREATE INDEX idx_attendance_instance_student ON attendance(instance_student_id);
CREATE INDEX idx_attendance_status ON attendance(status);

-- Recreate RLS policies
CREATE POLICY "Studio owners can manage attendance"
  ON attendance
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM instance_students ist
      JOIN class_instances ci ON ci.id = ist.class_instance_id
      JOIN classes c ON ci.class_id = c.id
      JOIN studios s ON c.studio_id = s.id
      JOIN owners o ON s.owner_id = o.id
      WHERE o.user_id = auth.uid()
      AND ist.id = attendance.instance_student_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM instance_students ist
      JOIN class_instances ci ON ci.id = ist.class_instance_id
      JOIN classes c ON ci.class_id = c.id
      JOIN studios s ON c.studio_id = s.id
      JOIN owners o ON s.owner_id = o.id
      WHERE o.user_id = auth.uid()
      AND ist.id = attendance.instance_student_id
    )
  );

CREATE POLICY "Teachers can manage attendance"
  ON attendance
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM instance_students ist
      JOIN class_instances ci ON ci.id = ist.class_instance_id
      JOIN classes c ON ci.class_id = c.id
      WHERE c.teacher_id IN (
        SELECT id FROM teachers
        WHERE user_id = auth.uid()
      )
      AND ist.id = attendance.instance_student_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM instance_students ist
      JOIN class_instances ci ON ci.id = ist.class_instance_id
      JOIN classes c ON ci.class_id = c.id
      WHERE c.teacher_id IN (
        SELECT id FROM teachers
        WHERE user_id = auth.uid()
      )
      AND ist.id = attendance.instance_student_id
    )
  );

CREATE POLICY "Parents can view attendance"
  ON attendance
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM instance_students ist
      JOIN students s ON s.id = ist.student_id
      JOIN parents p ON s.parent_id = p.id
      WHERE p.user_id = auth.uid()
      AND ist.id = attendance.instance_student_id
    )
  );

-- Add trigger for updated_at
CREATE TRIGGER update_attendance_timestamp
  BEFORE UPDATE ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();