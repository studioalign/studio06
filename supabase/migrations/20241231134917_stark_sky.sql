/*
  # Add class instances tracking

  1. New Tables
    - `class_instances`
      - `id` (uuid, primary key)
      - `class_id` (uuid, references classes)
      - `date` (date)
      - `status` (text) - for tracking cancellations, etc.
      - `notes` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Changes
    - Update attendance table to reference class_instances instead of classes directly
    - Add policies for managing class instances

  3. Security
    - Enable RLS
    - Add policies for owners and teachers
*/

-- Create class_instances table
CREATE TABLE IF NOT EXISTS class_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid REFERENCES classes ON DELETE CASCADE,
  date date NOT NULL,
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled', 'completed')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(class_id, date)
);

-- Enable RLS
ALTER TABLE class_instances ENABLE ROW LEVEL SECURITY;

-- Add policies for class_instances
CREATE POLICY "Studio owners can manage class instances"
  ON class_instances
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

CREATE POLICY "Teachers can manage their class instances"
  ON class_instances
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

CREATE POLICY "Parents can view class instances"
  ON class_instances
  FOR SELECT
  TO authenticated
  USING (class_id IN (
    SELECT cs.class_id 
    FROM class_students cs
    JOIN students s ON cs.student_id = s.id
    JOIN parents p ON s.parent_id = p.id
    WHERE p.user_id = auth.uid()
  ));

-- Modify attendance table to reference class_instances
ALTER TABLE attendance 
  DROP CONSTRAINT attendance_class_id_fkey,
  ADD COLUMN class_instance_id uuid REFERENCES class_instances ON DELETE CASCADE,
  ADD CONSTRAINT attendance_unique_instance UNIQUE(class_instance_id, student_id);

-- Update attendance policies
DROP POLICY IF EXISTS "Studio owners can manage attendance" ON attendance;
DROP POLICY IF EXISTS "Teachers can manage attendance" ON attendance;
DROP POLICY IF EXISTS "Parents can view their students' attendance" ON attendance;

CREATE POLICY "Studio owners can manage attendance"
  ON attendance
  FOR ALL
  TO authenticated
  USING (class_instance_id IN (
    SELECT ci.id FROM class_instances ci
    JOIN classes c ON ci.class_id = c.id
    JOIN studios s ON c.studio_id = s.id
    JOIN owners o ON s.owner_id = o.id
    WHERE o.user_id = auth.uid()
  ))
  WITH CHECK (class_instance_id IN (
    SELECT ci.id FROM class_instances ci
    JOIN classes c ON ci.class_id = c.id
    JOIN studios s ON c.studio_id = s.id
    JOIN owners o ON s.owner_id = o.id
    WHERE o.user_id = auth.uid()
  ));

CREATE POLICY "Teachers can manage attendance"
  ON attendance
  FOR ALL
  TO authenticated
  USING (class_instance_id IN (
    SELECT ci.id FROM class_instances ci
    JOIN classes c ON ci.class_id = c.id
    WHERE c.teacher_id IN (
      SELECT id FROM teachers
      WHERE user_id = auth.uid()
    )
  ))
  WITH CHECK (class_instance_id IN (
    SELECT ci.id FROM class_instances ci
    JOIN classes c ON ci.class_id = c.id
    WHERE c.teacher_id IN (
      SELECT id FROM teachers
      WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Parents can view attendance"
  ON attendance
  FOR SELECT
  TO authenticated
  USING (student_id IN (
    SELECT s.id 
    FROM students s
    JOIN parents p ON s.parent_id = p.id
    WHERE p.user_id = auth.uid()
  ));