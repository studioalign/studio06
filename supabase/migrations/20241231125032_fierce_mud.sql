/*
  # Fix studio RLS policies

  1. Changes
    - Add UPDATE policy for owners to modify their studio
    - Fix policy conditions to properly check ownership

  2. Security
    - Ensures owners can only update their own studio
    - Maintains existing read/insert policies
*/

-- Drop existing update policy if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'studios' 
    AND policyname = 'Owners can update own studio'
  ) THEN
    DROP POLICY "Owners can update own studio" ON studios;
  END IF;
END $$;

-- Create new update policy with correct conditions
CREATE POLICY "Owners can update own studio"
  ON studios
  FOR UPDATE
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