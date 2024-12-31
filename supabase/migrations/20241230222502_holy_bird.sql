/*
  # Add students table and relationships

  1. New Tables
    - `students`
      - `id` (uuid, primary key)
      - `parent_id` (uuid, references parents)
      - `studio_id` (uuid, references studios)
      - `name` (text)
      - `date_of_birth` (date)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `students` table
    - Add policies for:
      - Parents to manage their own students
      - Studio owners to view their studio's students
      - Teachers to view their studio's students
*/

CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES parents NOT NULL,
  studio_id uuid REFERENCES studios NOT NULL,
  name text NOT NULL,
  date_of_birth date NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Parents can manage their own students
CREATE POLICY "Parents can manage own students"
  ON students
  FOR ALL
  TO authenticated
  USING (parent_id IN (
    SELECT id FROM parents WHERE user_id = auth.uid()
  ))
  WITH CHECK (parent_id IN (
    SELECT id FROM parents WHERE user_id = auth.uid()
  ));

-- Studio owners can view their studio's students
CREATE POLICY "Owners can view studio students"
  ON students
  FOR SELECT
  TO authenticated
  USING (studio_id IN (
    SELECT s.id FROM studios s
    JOIN owners o ON s.owner_id = o.id
    WHERE o.user_id = auth.uid()
  ));

-- Teachers can view their studio's students
CREATE POLICY "Teachers can view studio students"
  ON students
  FOR SELECT
  TO authenticated
  USING (studio_id IN (
    SELECT studio_id FROM teachers WHERE user_id = auth.uid()
  ));