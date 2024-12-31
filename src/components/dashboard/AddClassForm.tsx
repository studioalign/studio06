import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import FormInput from '../FormInput';
import SearchableDropdown from '../SearchableDropdown';
import { useData } from '../../contexts/DataContext';
import MultiSelectDropdown from '../MultiSelectDropdown';
import { supabase } from '../../lib/supabase';

interface Student {
  id: string;
  name: string;
}

interface AddClassFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function AddClassForm({ onSuccess, onCancel }: AddClassFormProps) {
  const { studioInfo, teachers, locations } = useData();
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [name, setName] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState<{ id: string; label: string } | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<{ id: string; label: string } | null>(null);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isRecurring, setIsRecurring] = useState(true);
  const [dayOfWeek, setDayOfWeek] = useState<string>('');
  const [date, setDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<{ id: string; label: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch students when component mounts
  React.useEffect(() => {
    async function fetchStudents() {
      if (!studioInfo?.id) return;

      try {
        const { data, error: fetchError } = await supabase
          .from('students')
          .select('id, name')
          .eq('studio_id', studioInfo.id)
          .order('name');

        if (fetchError) throw fetchError;
        setStudents(data || []);
      } catch (err) {
        console.error('Error fetching students:', err);
      } finally {
        setLoadingStudents(false);
      }
    }

    fetchStudents();
  }, [studioInfo?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studioInfo?.id) return;

    setError(null);
    setIsSubmitting(true);

    try {
      // Validate inputs
      if (!name || !selectedTeacher || !startTime || !endTime || !selectedRoom) {
        throw new Error('Please fill in all required fields');
      }

      if (isRecurring && !dayOfWeek) {
        throw new Error('Please select a day of the week for recurring classes');
      }

      if (!isRecurring && !date) {
        throw new Error('Please select a date for one-off classes');
      }
      
      if (isRecurring && !endDate) {
        throw new Error('Please select an end date for recurring classes');
      }

      // Create the class
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .insert([
          {
            studio_id: studioInfo.id,
            name,
            teacher_id: selectedTeacher.id,
            start_time: startTime,
            end_time: endTime,
            is_recurring: isRecurring,
            day_of_week: isRecurring ? parseInt(dayOfWeek) : null,
            date: !isRecurring ? date : null,
            end_date: isRecurring ? endDate : date, // For recurring classes use endDate, for one-off use date
            location_id: selectedRoom.id,
          },
        ])
        .select()
        .single();

      if (classError) throw classError;

      // Add students to the class if any are selected
      if (selectedStudents.length > 0 && classData) {
        const { error: studentsError } = await supabase
          .from('class_students')
          .insert(
            selectedStudents.map(student => ({
              class_id: classData.id,
              student_id: student.id,
            }))
          );

        if (studentsError) throw studentsError;
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create class');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
        required
        value={selectedTeacher}
        onChange={setSelectedTeacher}
        options={teachers.map(teacher => ({ id: teacher.id, label: teacher.name }))}
      />

      <SearchableDropdown
        id="room"
        label="Select Room"
        value={selectedRoom}
        required
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
      
      {isRecurring && (
        <FormInput
          id="endDate"
          type="date"
          label="End Date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
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
          type="submit"
          disabled={isSubmitting}
          className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400 disabled:bg-gray-400"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Class
        </button>
      </div>
    </form>
  );
}