/*
  # Create owners table

  1. New Tables
    - `owners`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `name` (text)
      - `email` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `owners` table
    - Add policies for:
      - Owners can read their own data
      - New users can insert their own data
      - Owners can update their own data
*/

CREATE TABLE IF NOT EXISTS owners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE owners ENABLE ROW LEVEL SECURITY;

-- Allow owners to read their own data
CREATE POLICY "Owners can read own data"
  ON owners
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow new users to insert their data during signup
CREATE POLICY "Users can insert own data"
  ON owners
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow owners to update their own data
CREATE POLICY "Owners can update own data"
  ON owners
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);