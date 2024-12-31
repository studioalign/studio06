-- Drop existing function and table
DROP FUNCTION IF EXISTS get_effective_class_details(uuid);
DROP TABLE IF EXISTS class_modifications CASCADE;

-- Create class_modifications table
CREATE TABLE class_modifications (
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

-- Create RLS policies
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

-- Create function to modify a single class instance
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

  -- Delete any existing modification
  DELETE FROM class_modifications WHERE class_instance_id = v_instance_id;

  -- Create new modification record
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
  );
END;
$$ LANGUAGE plpgsql;

-- Create function to modify future class instances
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
  -- Delete existing modifications for future instances
  DELETE FROM class_modifications 
  WHERE class_instance_id IN (
    SELECT id FROM class_instances 
    WHERE class_id = p_class_id AND date >= p_from_date
  );

  -- Create modifications for all future instances
  FOR v_instance IN 
    SELECT id 
    FROM class_instances 
    WHERE class_id = p_class_id 
    AND date >= p_from_date
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
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create function to get effective class details
CREATE OR REPLACE FUNCTION get_effective_class_details(p_instance_id uuid)
RETURNS TABLE (
  name text,
  teacher_id uuid,
  teacher_name text,
  location_id uuid,
  location_name text,
  location_address text,
  start_time time,
  end_time time,
  studio_id uuid
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(m.name, c.name) as name,
    COALESCE(m.teacher_id, c.teacher_id) as teacher_id,
    t.name as teacher_name,
    COALESCE(m.location_id, c.location_id) as location_id,
    l.name as location_name,
    l.address as location_address,
    COALESCE(m.start_time, c.start_time) as start_time,
    COALESCE(m.end_time, c.end_time) as end_time,
    c.studio_id
  FROM class_instances ci
  JOIN classes c ON ci.class_id = c.id
  LEFT JOIN class_modifications m ON m.class_instance_id = ci.id
  LEFT JOIN teachers t ON COALESCE(m.teacher_id, c.teacher_id) = t.id
  LEFT JOIN locations l ON COALESCE(m.location_id, c.location_id) = l.id
  WHERE ci.id = p_instance_id;
END;
$$ LANGUAGE plpgsql;

-- Add indexes for better performance
CREATE INDEX idx_class_modifications_instance 
  ON class_modifications(class_instance_id);

CREATE INDEX idx_class_modifications_teacher 
  ON class_modifications(teacher_id);

CREATE INDEX idx_class_modifications_location 
  ON class_modifications(location_id);

-- Analyze tables for better query planning
ANALYZE class_modifications;
ANALYZE class_instances;
ANALYZE classes;
ANALYZE teachers;
ANALYZE locations;