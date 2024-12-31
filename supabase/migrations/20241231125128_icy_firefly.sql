/*
  # Fix studio update permissions

  1. Changes
    - Drop and recreate all studio policies to ensure proper permissions
    - Add proper UPDATE policy for studio owners
    - Ensure consistent policy conditions

  2. Security
    - Owners can only manage their own studio
    - Maintains existing read access for teachers/parents
*/

-- Drop existing policies
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Owners can read own studio' AND tablename = 'studios') THEN
    DROP POLICY "Owners can read own studio" ON studios;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Owners can insert own studio' AND tablename = 'studios') THEN
    DROP POLICY "Owners can insert own studio" ON studios;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Owners can update own studio' AND tablename = 'studios') THEN
    DROP POLICY "Owners can update own studio" ON studios;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can read studio names' AND tablename = 'studios') THEN
    DROP POLICY "Anyone can read studio names" ON studios;
  END IF;
END $$;

-- Recreate all policies with consistent conditions
CREATE POLICY "Owners can manage own studio"
  ON studios
  FOR ALL
  TO authenticated
  USING (
    owner_id IN (
      SELECT id FROM owners 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    owner_id IN (
      SELECT id FROM owners 
      WHERE user_id = auth.uid()
    )
  );

-- Allow all authenticated users to read studio names (for signup)
CREATE POLICY "Anyone can read studio names"
  ON studios
  FOR SELECT
  TO authenticated
  USING (true);