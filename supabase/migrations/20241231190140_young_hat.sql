/*
  # Migrate to instance_students table
  
  1. Data Migration
    - Move existing enrollments from class_students to instance_students
    - Clean up class_students table to remove instance-specific data
  
  2. Changes
    - Populates instance_students table
    - Restores class_students to class-level enrollments only
*/

-- First migrate existing enrollments to instance_students
INSERT INTO instance_students (class_instance_id, student_id)
SELECT cs.class_instance_id, cs.student_id
FROM class_students cs
WHERE cs.class_instance_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Create temporary table for class-level enrollments
CREATE TEMP TABLE class_level_enrollments AS
SELECT DISTINCT class_id, student_id
FROM class_students;

-- Clear existing class_students
TRUNCATE class_students;

-- Drop class_instance_id column and constraints
ALTER TABLE class_students 
  DROP CONSTRAINT class_students_pkey,
  DROP COLUMN class_instance_id;

-- Restore primary key
ALTER TABLE class_students 
  ADD PRIMARY KEY (class_id, student_id);

-- Restore class-level enrollments
INSERT INTO class_students (class_id, student_id)
SELECT class_id, student_id
FROM class_level_enrollments;

-- Drop temporary table
DROP TABLE class_level_enrollments;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_class_students_class
  ON class_students(class_id);
CREATE INDEX IF NOT EXISTS idx_class_students_student
  ON class_students(student_id);