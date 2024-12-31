-- Add class data columns to class_instances
ALTER TABLE class_instances ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE class_instances ADD COLUMN IF NOT EXISTS teacher_id uuid REFERENCES teachers(id);
ALTER TABLE class_instances ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES locations(id);
ALTER TABLE class_instances ADD COLUMN IF NOT EXISTS start_time time;
ALTER TABLE class_instances ADD COLUMN IF NOT EXISTS end_time time;

-- First populate existing instances with class data
UPDATE class_instances ci SET
  name = c.name,
  teacher_id = c.teacher_id,
  location_id = c.location_id,
  start_time = c.start_time,
  end_time = c.end_time
FROM classes c
WHERE ci.class_id = c.id;

-- Create function to modify a single class instance
CREATE OR REPLACE FUNCTION modify_class_instance(
  p_class_id uuid,
  p_date date,
  p_name text,
  p_teacher_id uuid,
  p_location_id uuid,
  p_start_time time,
  p_end_time time
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

  -- Update the instance with new values
  UPDATE class_instances SET
    name = p_name,
    teacher_id = p_teacher_id,
    location_id = p_location_id,
    start_time = p_start_time,
    end_time = p_end_time
  WHERE id = v_instance_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to modify future class instances
CREATE OR REPLACE FUNCTION modify_future_class_instances(
  p_class_id uuid,
  p_from_date date,
  p_name text,
  p_teacher_id uuid,
  p_location_id uuid,
  p_start_time time,
  p_end_time time
) RETURNS void AS $$
BEGIN
  -- Update all future instances
  UPDATE class_instances SET
    name = p_name,
    teacher_id = p_teacher_id,
    location_id = p_location_id,
    start_time = p_start_time,
    end_time = p_end_time
  WHERE class_id = p_class_id 
  AND date >= p_from_date;
END;
$$ LANGUAGE plpgsql;

-- Drop class_modifications table if it exists
DROP TABLE IF EXISTS class_modifications CASCADE;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_class_instances_teacher 
  ON class_instances(teacher_id);
CREATE INDEX IF NOT EXISTS idx_class_instances_location 
  ON class_instances(location_id);
CREATE INDEX IF NOT EXISTS idx_class_instances_composite
  ON class_instances(class_id, date);

-- Analyze tables for better query planning
ANALYZE class_instances;
ANALYZE classes;