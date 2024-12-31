/*
  # Add locations table for studios

  1. New Tables
    - `locations`
      - `id` (uuid, primary key)
      - `studio_id` (uuid, references studios)
      - `name` (text) - e.g. "Main Studio", "Room A", "Downtown Location"
      - `address` (text) - full address if different from main studio
      - `description` (text) - optional details about the location
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `locations` table
    - Add policies for studio owners to manage their locations
    - Add policies for teachers to view studio locations
*/

CREATE TABLE IF NOT EXISTS locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid REFERENCES studios NOT NULL,
  name text NOT NULL,
  address text,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Studio owners can manage their locations
CREATE POLICY "Owners can manage studio locations"
  ON locations
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

-- Teachers can view their studio's locations
CREATE POLICY "Teachers can view studio locations"
  ON locations
  FOR SELECT
  TO authenticated
  USING (studio_id IN (
    SELECT studio_id FROM teachers
    WHERE user_id = auth.uid()
  ));