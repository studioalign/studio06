/*
  # Add class instances schema

  1. Changes
    - Add class_instances table for tracking individual class occurrences
    - Add policies for owners, teachers, and parents
    - Add indexes for performance optimization

  2. Security
    - Enable RLS on class_instances table
    - Add policies for all user roles
*/

-- Drop existing policies if they exist
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Studio owners can manage class instances' AND tablename = 'class_instances') THEN
    DROP POLICY "Studio owners can manage class instances" ON class_instances;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Teachers can manage their class instances' AND tablename = 'class_instances') THEN
    DROP POLICY "Teachers can manage their class instances" ON class_instances;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Parents can view class instances' AND tablename = 'class_instances') THEN
    DROP POLICY "Parents can view class instances" ON class_instances;
  END IF;
END $$;

-- Add status enum type if it doesn't exist
DO $$ BEGIN
  CREATE TYPE class_status AS ENUM ('scheduled', 'cancelled', 'completed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add class_instances table if it doesn't exist
CREATE TABLE IF NOT EXISTS class_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid REFERENCES classes ON DELETE CASCADE,
  date date NOT NULL,
  status class_status DEFAULT 'scheduled',
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
  USING (
    class_id IN (
      SELECT c.id 
      FROM classes c
      JOIN studios s ON c.studio_id = s.id
      JOIN owners o ON s.owner_id = o.id
      WHERE o.user_id = auth.uid()
    )
  )
  WITH CHECK (
    class_id IN (
      SELECT c.id 
      FROM classes c
      JOIN studios s ON c.studio_id = s.id
      JOIN owners o ON s.owner_id = o.id
      WHERE o.user_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can manage their class instances"
  ON class_instances
  FOR ALL
  TO authenticated
  USING (
    class_id IN (
      SELECT id 
      FROM classes
      WHERE teacher_id IN (
        SELECT id FROM teachers
        WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    class_id IN (
      SELECT id 
      FROM classes
      WHERE teacher_id IN (
        SELECT id FROM teachers
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Parents can view class instances"
  ON class_instances
  FOR SELECT
  TO authenticated
  USING (
    class_id IN (
      SELECT c.id
      FROM classes c
      JOIN studios s ON c.studio_id = s.id
      JOIN parents p ON p.studio_id = s.id
      WHERE p.user_id = auth.uid()
    )
  );

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_class_instances_class_date 
  ON class_instances(class_id, date);

CREATE INDEX IF NOT EXISTS idx_class_instances_date 
  ON class_instances(date);