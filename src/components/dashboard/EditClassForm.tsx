import React, { useState, useEffect } from 'react';
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

export default function EditClassForm({
  classData,
  onSuccess,
  onCancel,
  onSaveClick,
}: EditClassFormProps) {
  const { studioInfo, teachers, locations } = useData();
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<{ id: string; label: string }[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [name, setName] = useState(classData.name);
  const [selectedRoom, setSelectedRoom] = useState<{ id: string; label: string } | null>(
    locations.find((loc) => loc.id === classData.location_id)
      ? {
          id: classData.location_id!,
          label: locations.find((loc) => loc.id === classData.location_id)!.name,
        }
      : null
  );
  const [selectedTeacher, setSelectedTeacher] = useState<{ id: string; label: string } | null>(
    teachers.find((t) => t.id === classData.teacher_id)
      ? {
          id: classData.teacher_id,
          label: teachers.find((t) => t.id === classData.teacher_id)!.name,
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

  useEffect(() => {
    if (!studioInfo?.id || !classData?.id) return;
  
    async function fetchData() {
      try {
        console.log('Fetching class instance details for class ID:', classData.id);
  
        // Fetch class instance details to get location
        const { data: instanceDetails, error: instanceError } = await supabase
          .from('class_instances')
          .select(`
            location_id,
            location:locations (
              id,
              name,
              address
            )
          `)
          .eq('id', classData.id)
          .maybeSingle();
  
        if (instanceError) throw instanceError;
  
        if (instanceDetails?.location) {
          setSelectedRoom({
            id: instanceDetails.location.id,
            label: instanceDetails.location.address
              ? `${instanceDetails.location.name} (${instanceDetails.location.address})`
              : instanceDetails.location.name,
          });
        } else {
          console.warn('No location found for class instance ID:', classData.id);
          setSelectedRoom(null); // Allow manual selection
        }
  
        // Fetch all students in the studio
        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select('id, name')
          .eq('studio_id', studioInfo.id)
          .order('name');
  
        if (studentsError) throw studentsError;
        setStudents(studentsData || []);
  
        // Fetch enrolled students for this class instance
        const { data: enrolledData, error: enrolledError } = await supabase
          .from('instance_enrollments')
          .select('student:students(id, name)')
          .eq('class_instance_id', classData.id);
  
        if (enrolledError) throw enrolledError;
  
        if (enrolledData) {
          setSelectedStudents(
            enrolledData.map((enrollment) => ({
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
  }, [studioInfo?.id, classData?.id]);  
  
  const studentOptions = React.useMemo(
    () => students.map((student) => ({ id: student.id, label: student.name })),
    [students]
  );

  const logClasses = React.useCallback((date) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`Classes for date ${date}`);
    }
  }, []);  

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

  const handleSubmit = async () => {
    setError(null);
    setIsSubmitting(true);
  
    try {
      console.log("Starting class update...");
      console.log("Class data:", {
        name,
        teacher_id: selectedTeacher?.id,
        location_id: selectedRoom?.id,
        start_time: startTime,
        end_time: endTime,
        is_recurring: isRecurring,
        day_of_week: isRecurring ? parseInt(dayOfWeek) : null,
        date: !isRecurring ? date : null,
      });
  
      // Step 1: Update class instance details
      const { error: updateError } = await supabase
        .from('class_instances')
        .update({
          name,
          teacher_id: selectedTeacher?.id,
          location_id: selectedRoom?.id,
          start_time: startTime,
          end_time: endTime,
        })
        .eq('id', classData.id);
  
      if (updateError) {
        console.error("Error updating class details:", updateError);
        throw updateError;
      }
  
      console.log("Class instance updated successfully.");
  
      // Step 2: Fetch existing enrollments for this class instance
      const { data: existingEnrollments, error: fetchEnrollmentsError } = await supabase
        .from('instance_enrollments')
        .select('student_id')
        .eq('class_instance_id', classData.id);
  
      if (fetchEnrollmentsError) {
        console.error("Error fetching existing enrollments:", fetchEnrollmentsError);
        throw fetchEnrollmentsError;
      }
  
      const existingEnrollmentIds = existingEnrollments?.map((enrollment) => enrollment.student_id) || [];
  
      // Step 3: Remove unenrolled students
      const studentsToRemove = existingEnrollmentIds.filter(
        (id) => !selectedStudents.some((student) => student.id === id)
      );
  
      if (studentsToRemove.length > 0) {
        console.log("Removing unenrolled students:", studentsToRemove);
        const { error: deleteError } = await supabase
          .from('instance_enrollments')
          .delete()
          .eq('class_instance_id', classData.id)
          .in('student_id', studentsToRemove);
  
        if (deleteError) {
          console.error("Error removing unenrolled students:", deleteError);
          throw deleteError;
        }
      }
  
      // Step 4: Add new enrollments
      const newEnrollments = selectedStudents.filter(
        (student) => !existingEnrollmentIds.includes(student.id)
      );
  
      if (newEnrollments.length > 0) {
        console.log("Adding new enrollments:", newEnrollments);
        const { error: insertError } = await supabase
          .from('instance_enrollments')
          .insert(
            newEnrollments.map((student) => ({
              class_instance_id: classData.id,
              student_id: student.id,
            }))
          );
  
        if (insertError) {
          console.error("Error adding new enrollments:", insertError);
          throw insertError;
        }
      }
  
      console.log("Enrollments updated successfully.");
      onSuccess();
      console.log("Class saved successfully.");
    } catch (err) {
      console.error("Error saving class:", err);
      setError(err instanceof Error ? err.message : "Failed to save class");
    } finally {
      setIsSubmitting(false);
    }
  };  

  // Inside EditClassForm component, alongside existing functions
const handleDeleteAllInstances = async () => {
  try {
    const { error } = await supabase
      .from('class_instances')
      .delete()
      .eq('class_id', classData.id); // Use class_id to delete all instances

    if (error) {
      console.error('Error deleting all instances:', error);
      throw error;
    }

    console.log('All instances deleted successfully.');
    onSuccess(); // Notify the parent component about the success
  } catch (err) {
    console.error('Error deleting all instances:', err);
    setError(err instanceof Error ? err.message : 'Failed to delete all instances');
  }
};

const handleEditInstances = async (modificationScope: 'all' | 'future') => {
  try {
    // Debug logs for tracing
    console.log('Starting handleEditInstances...');
    console.log('Modification Scope:', modificationScope);
    console.log('Class ID:', classData.class_id);
    console.log('Target Date:', classData.date);
    console.log('ClassData passed to handleEditInstances:', classData);

    // Call the Supabase RPC for bulk updates
    const { error } = await supabase.rpc('bulk_update_class_instances', {
      target_class_id: classData.class_id,
      target_date: classData.date,
      modification_scope: modificationScope,
      updated_name: name,
      updated_teacher_id: selectedTeacher?.id,
      updated_location_id: selectedRoom?.id,
      updated_start_time: startTime,
      updated_end_time: endTime,
    });

    // Debug: Log the RPC result
    if (error) {
      console.error(`Error editing ${modificationScope} instances:`, error);
      throw new Error(`Failed to edit ${modificationScope} instances: ${error.message}`);
    }

    console.log(`Successfully edited ${modificationScope} instances.`);
    onSuccess(); // Notify parent component of success
  } catch (err) {
    console.error('Error in handleEditInstances:', err);
    setError(err instanceof Error ? err.message : 'Failed to edit instances');
  }
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
        options={teachers.map((teacher) => ({ id: teacher.id, label: teacher.name }))}
      />

      <SearchableDropdown
        id="room"
        label="Select Room"
        value={selectedRoom}
        onChange={setSelectedRoom}
        options={locations.map((location) => ({
          id: location.id,
          label: location.name,
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

      <div>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
          />
          <span className="ml-2">Recurring Weekly Class</span>
        </label>
      </div>

      {isRecurring ? (
        <select
          value={dayOfWeek}
          onChange={(e) => setDayOfWeek(e.target.value)}
          required
        >
          <option value="">Select Day</option>
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
  options={students.map((student) => ({
    id: student.id,
    label: student.name,
    disabled: selectedStudents.some((selected) => selected.id === student.id),
  }))}
  isLoading={loadingStudents}
/>

      {error && <p className="text-red-500">{error}</p>}

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
          onClick={(e) => {
            e.preventDefault();
            if (validateForm()) handleSubmit();
          }}
          disabled={isSubmitting}
          className="px-4 py-2 bg-brand-primary text-white rounded-md"
        >
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </button>
      </div>
    </form>
  );
}