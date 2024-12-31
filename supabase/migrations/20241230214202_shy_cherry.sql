/*
  # Add policy for reading studio names
  
  1. Changes
    - Add policy to allow all authenticated users to read studio names
    This is needed for the studio selection dropdown during signup
*/

-- Allow all authenticated users to read studio names
CREATE POLICY "Anyone can read studio names"
  ON studios
  FOR SELECT
  TO authenticated
  USING (true);