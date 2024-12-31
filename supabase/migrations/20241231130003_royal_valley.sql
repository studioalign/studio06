/*
  # Add classes table and related schemas

  1. New Tables
    - `classes`
      - `id` (uuid, primary key)
      - `studio_id` (uuid, references studios)
      - `name` (text)
      - `teacher_id` (uuid, references teachers)
      - `start_time` (time)
      - `end_time` (time)
      - `day_of_week` (int, 0-6 for Sunday-Saturday)
      - `is_recurring` (boolean)
      - `date` (date, for one-off classes)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    - `class_students` (junction table)
      - `class_id` (uuid, references classes)
      - `student_id` (uuid, references students)
      
  2. Security
    - Enable RLS on both tables
    - Add policies for studio owners and teachers
*/

-- Create classes table
CREATE TABLE IF NOT EXISTS classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid REFERENCES studios NOT NULL,
  name text NOT NULL,
  teacher_id uuid REFERENCES teachers NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  day_of_week int,
  is_recurring boolean DEFAULT true,
  date date,
  location_id uuid REFERENCES locations,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_day_of_week CHECK (day_of_week >= 0 AND day_of_week <= 6),
  CONSTRAINT valid_times CHECK (start_time < end_time),
  CONSTRAINT recurring_or_date CHECK (
    (is_recurring = true AND day_of_week IS NOT NULL AND date IS NULL) OR
    (is_recurring = false AND date IS NOT NULL AND day_of_week IS NULL)
  )
);

-- Create class_students junction table
CREATE TABLE IF NOT EXISTS class_students (
  class_id uuid REFERENCES classes ON DELETE CASCADE,
  student_id uuid REFERENCES students ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (class_id, student_id)
);

-- Enable RLS
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_students ENABLE ROW LEVEL SECURITY;

-- Policies for classes table
CREATE POLICY "Studio owners can manage classes"
  ON classes
  FOR ALL
  TO authenticated
  USING (studio_id IN (
    SELECT s.id FROM studios s
    JOIN owners o ON s.owner_id = o.id
    WHERE o.user_id = auth.uid()
  ))
  WITH CHECK (studio_id IN (
    SELECT s.id FROM studios s
    JOIN owners o ON s.owner_id = o.id
    WHERE o.user_id = auth.uid()
  ));

CREATE POLICY "Teachers can view their classes"
  ON classes
  FOR SELECT
  TO authenticated
  USING (
    teacher_id IN (
      SELECT id FROM teachers
      WHERE user_id = auth.uid()
    )
  );

-- Policies for class_students table
CREATE POLICY "Studio owners can manage class students"
  ON class_students
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

CREATE POLICY "Teachers can view class students"
  ON class_students
  FOR SELECT
  TO authenticated
  USING (class_id IN (
    SELECT id FROM classes
    WHERE teacher_id IN (
      SELECT id FROM teachers
      WHERE user_id = auth.uid()
    )
  ));