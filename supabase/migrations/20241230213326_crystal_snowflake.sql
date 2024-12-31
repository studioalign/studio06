/*
  # Create studios table

  1. New Tables
    - `studios`
      - `id` (uuid, primary key)
      - `owner_id` (uuid, references owners.id)
      - `name` (text)
      - `address` (text)
      - `phone` (text)
      - `email` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `studios` table
    - Add policies for owner access
*/

CREATE TABLE IF NOT EXISTS studios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES owners(id) NOT NULL,
  name text NOT NULL,
  address text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE studios ENABLE ROW LEVEL SECURITY;

-- Allow owners to read their own studio data
CREATE POLICY "Owners can read own studio"
  ON studios
  FOR SELECT
  TO authenticated
  USING (owner_id IN (
    SELECT id FROM owners WHERE user_id = auth.uid()
  ));

-- Allow owners to insert their studio data
CREATE POLICY "Owners can insert own studio"
  ON studios
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id IN (
    SELECT id FROM owners WHERE user_id = auth.uid()
  ));

-- Allow owners to update their own studio data
CREATE POLICY "Owners can update own studio"
  ON studios
  FOR UPDATE
  TO authenticated
  USING (owner_id IN (
    SELECT id FROM owners WHERE user_id = auth.uid()
  ))
  WITH CHECK (owner_id IN (
    SELECT id FROM owners WHERE user_id = auth.uid()
  ));