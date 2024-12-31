/*
  # Create instance-specific enrollments table
  
  1. New Tables
    - `instance_students`: Links students to specific class instances
      - `class_instance_id` (uuid, references class_instances)
      - `student_id` (uuid, references students)
      - `created_at` (timestamp)
  
  2. Changes
    - Keeps class_students table for managing overall class enrollment
    - Adds automatic creation of instance enrollments
  
  3. Security
    - Enables RLS
    - Adds appropriate policies for owners, teachers, and parents
*/

-- Create instance_students table
CREATE TABLE instance_students (
  class_instance_id uuid REFERENCES class_instances(id) ON DELETE CASCADE,
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (class_instance_id, student_id)
);

-- Enable RLS
ALTER TABLE instance_students ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Studio owners can manage instance students"
  ON instance_students
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
      AND ci.id = instance_students.class_instance_id
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
      AND ci.id = instance_students.class_instance_id
    )
  );

CREATE POLICY "Teachers can manage instance students"
  ON instance_students
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
      AND ci.id = instance_students.class_instance_id
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
      AND ci.id = instance_students.class_instance_id
    )
  );

CREATE POLICY "Parents can view instance students"
  ON instance_students
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

-- Create function to automatically create instance enrollments
CREATE OR REPLACE FUNCTION create_instance_enrollments()
RETURNS TRIGGER AS $$
BEGIN
  -- When a new class instance is created, copy enrollments from class_students
  INSERT INTO instance_students (class_instance_id, student_id)
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

-- Create index for better query performance
CREATE INDEX idx_instance_students_instance 
  ON instance_students(class_instance_id);
CREATE INDEX idx_instance_students_student 
  ON instance_students(student_id);