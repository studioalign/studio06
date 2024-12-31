import { supabase } from '../lib/supabase';

interface Student {
  id: string;
  name: string;
}

export async function getEnrolledStudents(classId: string, parentId: string): Promise<Student[]> {
  try {
    const { data, error } = await supabase
      .from('class_students')
      .select('student_id, students!inner(id, name)')
      .eq('class_id', classId)
      .eq('students.parent_id', parentId);

    if (error) throw error;

    return (data || []).map(row => ({
      id: row.student_id,
      name: row.students.name
    }));
  } catch (err) {
    console.error('Error fetching enrolled students:', err);
    return [];
  }
}