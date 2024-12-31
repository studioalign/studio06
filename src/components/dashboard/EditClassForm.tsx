import React, { useState } from 'react';
import { Save } from 'lucide-react';
import FormInput from '../FormInput';
import SearchableDropdown from '../SearchableDropdown';
import MultiSelectDropdown from '../MultiSelectDropdown';
import { supabase } from '../../lib/supabase';
import { useData } from '../../contexts/DataContext';

interface Student {
  id: string;
  name: string;
}

interface ClassData {
  id: string;
  name: string;
  teacher_id: string;
  location_id?: string;
  start_time: string;
  end_time: string;
  is_recurring: boolean;
  day_of_week: number | null;
  date: string | null;
  modificationScope?: 'single' | 'future' | 'all';
}

interface EditClassFormProps {
  classData: ClassData;
  onSuccess: () => void;
  onCancel: () => void;
  onSaveClick: (changes: any) => void;
}

export default function EditClassForm({ classData, onSuccess, onCancel, onSaveClick }: EditClassFormProps) {
  const { studioInfo, teachers, locations } = useData();
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<{ id: string; label: string }[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [name, setName] = useState(classData.name);
  const [selectedRoom, setSelectedRoom] = useState<{ id: string; label: string } | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<{ id: string; label: string } | null>(
    teachers.find(t => t.id === classData.teacher_id) 
      ? { 
          id: classData.teacher_id, 
          label: teachers.find(t => t.id === classData.teacher_id)!.name 
        }
      : null
  );
  const [startTime, setStartTime] = useState(classData.start_time);
  const [endTime, setEndTime] = useState(classData.end_time);
  const [isRecurring, setIsRecurring] = useState(classData.is_recurring);
  const [dayOfWeek, setDayOfWeek] = useState(classData.day_of_week?.toString() || '');
  const [date, setDate] = useState(classData.date || '');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    if (!name || !startTime || !endTime) {
      setError('Please fill in all required fields');
      return false;
    }

    if (isRecurring && !dayOfWeek) {
      setError('Please select a day of the week for recurring classes');
      return false;
    }

    if (!isRecurring && !date) {
      setError('Please select a date for one-off classes');
      return false;
    }

    return true;
  };

  React.useEffect(() => {
    async function fetchData() {
      if (!studioInfo?.id) return;
      
      try {
        // First fetch the class details to get the location
        const { data: classDetails, error: classError } = await supabase
          .from('classes')
          .select(`
            location_id,
            location:locations (
              id,
              name,
              address
            )
          `)
          .eq('id', classData.id)
          .single();

        if (classError) throw classError;

        if (classDetails?.location) {
          setSelectedRoom({
            id: classDetails.location.id,
            label: classDetails.location.address 
              ? `${classDetails.location.name} (${classDetails.location.address})`
              : classDetails.location.name
          });
        }

        // Fetch all students
        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select('id, name')
          .eq('studio_id', studioInfo.id)
          .order('name');

        if (studentsError) throw studentsError;
        setStudents(studentsData || []);

        // Fetch enrolled students
        const { data: enrolledData, error: enrolledError } = await supabase
          .from('class_students')
          .select('student:students(id, name)')
          .eq('class_id', classData.id);

        if (enrolledError) throw enrolledError;
        
        if (enrolledData) {
          setSelectedStudents(
            enrolledData.map(enrollment => ({
              id: enrollment.student.id,
              label: enrollment.student.name,
            }))
          );
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoadingStudents(false);
      }
    }

    fetchData();
  }, [studioInfo?.id, classData.id]);

  const handleSubmit = async () => {
    if (!studioInfo?.id || !selectedTeacher) return;
    
    setError(null);
    setIsSubmitting(true);
    
    try {
      if (classData.modificationScope === 'single') {
        // Update only this instance
        const { error: updateError } = await supabase
          .rpc('modify_class_instance', { 
            p_class_id: classData.id, 
            p_date: classData.date, 
            p_name: name, 
            p_teacher_id: selectedTeacher.id, 
            p_location_id: selectedRoom?.id, 
            p_start_time: startTime, 
            p_end_time: endTime 
          }); 

        if (updateError) throw updateError;
      } else if (classData.modificationScope === 'future') {
        // Update this and future instances
        const { error: updateError } = await supabase
          .rpc('modify_future_class_instances', { 
            p_class_id: classData.id, 
            p_from_date: classData.date, 
            p_name: name, 
            p_teacher_id: selectedTeacher.id, 
            p_location_id: selectedRoom?.id, 
            p_start_time: startTime, 
            p_end_time: endTime 
          }); 

        if (updateError) throw updateError;
      } else {
        // Update all instances
        const { error: updateError } = await supabase
          .from('classes')
          .update({
            name,
            teacher_id: selectedTeacher.id,
            location_id: selectedRoom?.id,
            start_time: startTime,
            end_time: endTime,
            is_recurring: isRecurring,
            day_of_week: isRecurring ? parseInt(dayOfWeek) : null,
            date: !isRecurring ? date : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', classData.id);

        if (updateError) throw updateError;

      }
      
      // Update enrolled students
      // First, remove all existing enrollments
      const { error: deleteError } = await supabase
        .from('class_students')
        .delete()
        .eq('class_id', classData.id);

      if (deleteError) throw deleteError;

      // Then add new enrollments
      if (selectedStudents.length > 0) {
        const { error: enrollError } = await supabase
          .from('class_students')
          .insert(
            selectedStudents.map(student => ({
              class_id: classData.id,
              student_id: student.id,
            }))
          );

        if (enrollError) throw enrollError;
      }

      onSuccess(); 
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update class');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    handleSubmit();
  };

  return (
    <form className="space-y-4">
      <FormInput
        id="name"
        type="text"
        label="Class Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />

      <SearchableDropdown
        id="teacher"
        label="Select Teacher"
        value={selectedTeacher}
        onChange={setSelectedTeacher}
        options={teachers.map(teacher => ({ id: teacher.id, label: teacher.name }))}
      />

      <SearchableDropdown
        id="room"
        label="Select Room"
        value={selectedRoom}
        onChange={setSelectedRoom}
        options={locations.map(location => ({ 
          id: location.id, 
          label: location.address ? `${location.name} (${location.address})` : location.name 
        }))}
      />

      <div className="grid grid-cols-2 gap-4">
        <FormInput
          id="startTime"
          type="time"
          label="Start Time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          required
        />

        <FormInput
          id="endTime"
          type="time"
          label="End Time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          required
        />
      </div>

      <div className="flex items-center space-x-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
            className="rounded border-gray-300 text-brand-primary focus:ring-brand-accent"
          />
          <span className="ml-2 text-sm text-gray-700">Recurring weekly class</span>
        </label>
      </div>

      {isRecurring ? (
        <select
          value={dayOfWeek}
          onChange={(e) => setDayOfWeek(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
          required
        >
          <option value="">Select day of week</option>
          <option value="0">Sunday</option>
          <option value="1">Monday</option>
          <option value="2">Tuesday</option>
          <option value="3">Wednesday</option>
          <option value="4">Thursday</option>
          <option value="5">Friday</option>
          <option value="6">Saturday</option>
        </select>
      ) : (
        <FormInput
          id="date"
          type="date"
          label="Class Date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      )}

      <MultiSelectDropdown
        id="students"
        label="Select Students"
        value={selectedStudents}
        onChange={setSelectedStudents}
        options={students.map(student => ({ id: student.id, label: student.name }))}
        isLoading={loadingStudents}
      />

      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSaveClick}
          disabled={isSubmitting}
          className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400 disabled:bg-gray-400"
        >
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </button>
      </div>
    </form>
  );
}