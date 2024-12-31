/*
  # Fix teacher attendance permissions

  1. Changes
    - Simplify RLS policies for teachers
    - Add missing indexes for performance
    - Fix attendance relationship with instance enrollments

  2. Security
    - Teachers can manage attendance for their classes
    - Maintain existing owner and parent policies
*/

-- Drop existing policies if they exist
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Teachers can manage attendance' AND tablename = 'attendance') THEN
    DROP POLICY "Teachers can manage attendance" ON attendance;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Teachers can manage instance enrollments' AND tablename = 'instance_enrollments') THEN
    DROP POLICY "Teachers can manage instance enrollments" ON instance_enrollments;
  END IF;
END $$;

-- Create simplified policy for teachers to manage instance enrollments
CREATE POLICY "Teachers can manage instance enrollments"
  ON instance_enrollments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM class_instances ci
      JOIN classes c ON ci.class_id = c.id
      JOIN teachers t ON c.teacher_id = t.id
      WHERE t.user_id = auth.uid()
      AND ci.id = instance_enrollments.class_instance_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM class_instances ci
      JOIN classes c ON ci.class_id = c.id
      JOIN teachers t ON c.teacher_id = t.id
      WHERE t.user_id = auth.uid()
      AND ci.id = instance_enrollments.class_instance_id
    )
  );

-- Create simplified policy for teachers to manage attendance
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
      JOIN teachers t ON c.teacher_id = t.id
      WHERE t.user_id = auth.uid()
      AND ie.id = attendance.instance_enrollment_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM instance_enrollments ie
      JOIN class_instances ci ON ci.id = ie.class_instance_id
      JOIN classes c ON ci.class_id = c.id
      JOIN teachers t ON c.teacher_id = t.id
      WHERE t.user_id = auth.uid()
      AND ie.id = attendance.instance_enrollment_id
    )
  );

-- Add composite indexes for better join performance
CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teachers_user_id ON teachers(user_id);
CREATE INDEX IF NOT EXISTS idx_class_instances_class_date ON class_instances(class_id, date);

-- Analyze tables for better query planning
ANALYZE instance_enrollments;
ANALYZE attendance;
ANALYZE classes;
ANALYZE teachers;