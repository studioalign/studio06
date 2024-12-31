/*
  # Add attendance tracking

  1. New Tables
    - `attendance`
      - `id` (uuid, primary key)
      - `class_id` (uuid, references classes)
      - `student_id` (uuid, references students)
      - `date` (date)
      - `status` (text, enum: present, late, authorised, unauthorised)
      - `notes` (text, optional)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `attendance` table
    - Add policies for teachers and owners to manage attendance
*/

CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid REFERENCES classes ON DELETE CASCADE,
  student_id uuid REFERENCES students ON DELETE CASCADE,
  date date NOT NULL,
  status text NOT NULL CHECK (status IN ('present', 'late', 'authorised', 'unauthorised')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(class_id, student_id, date)
);

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Studio owners can manage attendance
CREATE POLICY "Studio owners can manage attendance"
  ON attendance
  FOR ALL
  TO authenticated
  USING (class_id IN (
    SELECT c.id FROM classes c
    JOIN studios s ON c.studio_id = s.id
    JOIN owners o ON s.owner_id = o.id
    WHERE o.user_id = auth.uid()
  ))
  WITH CHECK (class_id IN (
    SELECT c.id FROM classes c
    JOIN studios s ON c.studio_id = s.id
    JOIN owners o ON s.owner_id = o.id
    WHERE o.user_id = auth.uid()
  ));

-- Teachers can manage attendance for their classes
CREATE POLICY "Teachers can manage attendance"
  ON attendance
  FOR ALL
  TO authenticated
  USING (class_id IN (
    SELECT id FROM classes
    WHERE teacher_id IN (
      SELECT id FROM teachers
      WHERE user_id = auth.uid()
    )
  ))
  WITH CHECK (class_id IN (
    SELECT id FROM classes
    WHERE teacher_id IN (
      SELECT id FROM teachers
      WHERE user_id = auth.uid()
    )
  ));