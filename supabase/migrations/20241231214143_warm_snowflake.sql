/*
  # Class Modifications Schema Update

  1. Drop existing policies and functions
  2. Recreate policies with proper checks
  3. Add helper functions for modifications
*/

-- Drop existing policies if they exist
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Studio owners can manage modifications' AND tablename = 'class_modifications') THEN
    DROP POLICY "Studio owners can manage modifications" ON class_modifications;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Teachers can manage modifications' AND tablename = 'class_modifications') THEN
    DROP POLICY "Teachers can manage modifications" ON class_modifications;
  END IF;
END $$;

-- Drop existing function
DROP FUNCTION IF EXISTS get_effective_class_details(uuid);
DROP FUNCTION IF EXISTS modify_class_instance(uuid, date, text, uuid, uuid, time, time);
DROP FUNCTION IF EXISTS modify_future_class_instances(uuid, date, text, uuid, uuid, time, time);

-- Create modifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS class_modifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_instance_id uuid REFERENCES class_instances(id) ON DELETE CASCADE,
  name text,
  teacher_id uuid REFERENCES teachers(id),
  location_id uuid REFERENCES locations(id),
  start_time time,
  end_time time,
  created_at timestamptz DEFAULT now(),
  UNIQUE(class_instance_id)
);

-- Enable RLS
ALTER TABLE class_modifications ENABLE ROW LEVEL SECURITY;

-- Recreate RLS policies
CREATE POLICY "Studio owners can manage modifications"
  ON class_modifications
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM class_instances ci
      JOIN classes c ON ci.class_id = c.id
      JOIN studios s ON c.studio_id = s.id
      JOIN owners o ON s.owner_id = o.id
      WHERE o.user_id = auth.uid()
      AND ci.id = class_modifications.class_instance_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM class_instances ci
      JOIN classes c ON ci.class_id = c.id
      JOIN studios s ON c.studio_id = s.id
      JOIN owners o ON s.owner_id = o.id
      WHERE o.user_id = auth.uid()
      AND ci.id = class_modifications.class_instance_id
    )
  );

CREATE POLICY "Teachers can manage modifications"
  ON class_modifications
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM class_instances ci
      JOIN classes c ON ci.class_id = c.id
      JOIN teachers t ON c.teacher_id = t.id
      WHERE t.user_id = auth.uid()
      AND ci.id = class_modifications.class_instance_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM class_instances ci
      JOIN classes c ON ci.class_id = c.id
      JOIN teachers t ON c.teacher_id = t.id
      WHERE t.user_id = auth.uid()
      AND ci.id = class_modifications.class_instance_id
    )
  );

-- Recreate helper functions
CREATE OR REPLACE FUNCTION modify_class_instance(
  p_class_id uuid,
  p_date date,
  p_name text DEFAULT NULL,
  p_teacher_id uuid DEFAULT NULL,
  p_location_id uuid DEFAULT NULL,
  p_start_time time DEFAULT NULL,
  p_end_time time DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_instance_id uuid;
BEGIN
  -- Get or create the instance
  SELECT id INTO v_instance_id
  FROM class_instances
  WHERE class_id = p_class_id AND date = p_date;

  IF NOT FOUND THEN
    INSERT INTO class_instances (class_id, date)
    VALUES (p_class_id, p_date)
    RETURNING id INTO v_instance_id;
  END IF;

  -- Upsert modification record
  INSERT INTO class_modifications (
    class_instance_id,
    name,
    teacher_id,
    location_id,
    start_time,
    end_time
  ) VALUES (
    v_instance_id,
    p_name,
    p_teacher_id,
    p_location_id,
    p_start_time,
    p_end_time
  )
  ON CONFLICT (class_instance_id) DO UPDATE SET
    name = EXCLUDED.name,
    teacher_id = EXCLUDED.teacher_id,
    location_id = EXCLUDED.location_id,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION modify_future_class_instances(
  p_class_id uuid,
  p_from_date date,
  p_name text DEFAULT NULL,
  p_teacher_id uuid DEFAULT NULL,
  p_location_id uuid DEFAULT NULL,
  p_start_time time DEFAULT NULL,
  p_end_time time DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_instance record;
BEGIN
  -- Get or create instances and apply modifications
  FOR v_instance IN 
    SELECT ci.id 
    FROM class_instances ci
    WHERE ci.class_id = p_class_id 
    AND ci.date >= p_from_date
  LOOP
    INSERT INTO class_modifications (
      class_instance_id,
      name,
      teacher_id,
      location_id,
      start_time,
      end_time
    ) VALUES (
      v_instance.id,
      p_name,
      p_teacher_id,
      p_location_id,
      p_start_time,
      p_end_time
    )
    ON CONFLICT (class_instance_id) DO UPDATE SET
      name = EXCLUDED.name,
      teacher_id = EXCLUDED.teacher_id,
      location_id = EXCLUDED.location_id,
      start_time = EXCLUDED.start_time,
      end_time = EXCLUDED.end_time;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_effective_class_details(p_instance_id uuid)
RETURNS TABLE (
  name text,
  teacher_id uuid,
  location_id uuid,
  start_time time,
  end_time time
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(m.name, c.name) as name,
    COALESCE(m.teacher_id, c.teacher_id) as teacher_id,
    COALESCE(m.location_id, c.location_id) as location_id,
    COALESCE(m.start_time, c.start_time) as start_time,
    COALESCE(m.end_time, c.end_time) as end_time
  FROM class_instances ci
  JOIN classes c ON ci.class_id = c.id
  LEFT JOIN class_modifications m ON m.class_instance_id = ci.id
  WHERE ci.id = p_instance_id;
END;
$$ LANGUAGE plpgsql;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_class_modifications_instance 
  ON class_modifications(class_instance_id);

CREATE INDEX IF NOT EXISTS idx_class_instances_class_date 
  ON class_instances(class_id, date);

-- Analyze tables for better query planning
ANALYZE class_modifications;
ANALYZE class_instances;
ANALYZE classes;