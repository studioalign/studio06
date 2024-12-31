/*
  # Add teachers and parents tables

  1. New Tables
    - `teachers`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `studio_id` (uuid, references studios)
      - `name` (text)
      - `email` (text)
      - `created_at` (timestamp)

    - `parents`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `studio_id` (uuid, references studios)
      - `name` (text)
      - `email` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for:
      - Teachers and owners can read teacher data for their studio
      - Parents and owners can read parent data for their studio
      - Users can insert their own data during signup
      - Users can update their own data
*/

-- Create teachers table
CREATE TABLE IF NOT EXISTS teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  studio_id uuid REFERENCES studios NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;

-- Teachers can read their own data
CREATE POLICY "Teachers can read own data"
  ON teachers
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Studio owners can read their studio's teacher data
CREATE POLICY "Owners can read studio teachers"
  ON teachers
  FOR SELECT
  TO authenticated
  USING (studio_id IN (
    SELECT s.id FROM studios s
    JOIN owners o ON s.owner_id = o.id
    WHERE o.user_id = auth.uid()
  ));

-- Allow new users to insert their data during signup
CREATE POLICY "Users can insert own teacher data"
  ON teachers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow teachers to update their own data
CREATE POLICY "Teachers can update own data"
  ON teachers
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create parents table
CREATE TABLE IF NOT EXISTS parents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  studio_id uuid REFERENCES studios NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE parents ENABLE ROW LEVEL SECURITY;

-- Parents can read their own data
CREATE POLICY "Parents can read own data"
  ON parents
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Studio owners can read their studio's parent data
CREATE POLICY "Owners can read studio parents"
  ON parents
  FOR SELECT
  TO authenticated
  USING (studio_id IN (
    SELECT s.id FROM studios s
    JOIN owners o ON s.owner_id = o.id
    WHERE o.user_id = auth.uid()
  ));

-- Allow new users to insert their data during signup
CREATE POLICY "Users can insert own parent data"
  ON parents
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow parents to update their own data
CREATE POLICY "Parents can update own data"
  ON parents
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);