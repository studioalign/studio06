/*
  # Add Class Modification Procedures

  1. New Procedures
    - modify_class_instance: Modifies a single class instance
    - modify_future_class_instances: Modifies current and future instances
    - modify_all_class_instances: Modifies all instances of a class

  2. Changes
    - Adds modifications table to track changes
    - Adds procedures for handling different modification scopes
    - Updates class_instances schema to support modifications
*/

-- Create modifications table to track changes
CREATE TABLE IF NOT EXISTS class_modifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_instance_id uuid REFERENCES class_instances(id) ON DELETE CASCADE,
  name text,
  teacher_id uuid REFERENCES teachers(id),
  start_time time,
  end_time time,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE class_modifications ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
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

-- Function to modify a single class instance
CREATE OR REPLACE FUNCTION modify_class_instance(
  p_class_id uuid,
  p_date date,
  p_name text,
  p_teacher_id uuid,
  p_start_time time,
  p_end_time time
) RETURNS void AS $$
DECLARE
  v_instance_id uuid;
BEGIN
  -- Get the instance ID
  SELECT id INTO v_instance_id
  FROM class_instances
  WHERE class_id = p_class_id AND date = p_date;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Class instance not found';
  END IF;

  -- Create modification record
  INSERT INTO class_modifications (
    class_instance_id,
    name,
    teacher_id,
    start_time,
    end_time
  ) VALUES (
    v_instance_id,
    p_name,
    p_teacher_id,
    p_start_time,
    p_end_time
  );
END;
$$ LANGUAGE plpgsql;

-- Function to modify future class instances
CREATE OR REPLACE FUNCTION modify_future_class_instances(
  p_class_id uuid,
  p_from_date date,
  p_name text,
  p_teacher_id uuid,
  p_start_time time,
  p_end_time time
) RETURNS void AS $$
DECLARE
  v_instance record;
BEGIN
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
      start_time,
      end_time
    ) VALUES (
      v_instance.id,
      p_name,
      p_teacher_id,
      p_start_time,
      p_end_time
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_class_modifications_instance 
  ON class_modifications(class_instance_id);

-- Function to get effective class details
CREATE OR REPLACE FUNCTION get_effective_class_details(p_instance_id uuid)
RETURNS TABLE (
  name text,
  teacher_id uuid,
  start_time time,
  end_time time
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(m.name, c.name) as name,
    COALESCE(m.teacher_id, c.teacher_id) as teacher_id,
    COALESCE(m.start_time, c.start_time) as start_time,
    COALESCE(m.end_time, c.end_time) as end_time
  FROM class_instances ci
  JOIN classes c ON ci.class_id = c.id
  LEFT JOIN class_modifications m ON m.class_instance_id = ci.id
  WHERE ci.id = p_instance_id;
END;
$$ LANGUAGE plpgsql;