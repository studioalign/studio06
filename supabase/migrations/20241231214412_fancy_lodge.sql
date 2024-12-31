/*
  # Add Function for Effective Class Details
  
  Adds a function to get the effective details of a class instance,
  taking into account any modifications.
*/

-- Drop existing function first
DROP FUNCTION IF EXISTS get_effective_class_details(uuid);

-- Create new function with updated return type
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