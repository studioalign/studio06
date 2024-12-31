import React, { useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import WeeklyCalendar from './WeeklyCalendar';
import AddClassForm from './AddClassForm';
import EditClassForm from './EditClassForm';
import AttendanceModal from './AttendanceModal';
import RecurringClassModal from './RecurringClassModal';
import { supabase } from '../../lib/supabase';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { getEnrolledStudents } from '../../utils/classUtils';

interface Class {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  day_of_week: number | null;
  date: string | null;
  is_recurring: boolean;
  teacher_id: string;
  teacher: {
    name: string;
  };
  enrolledStudents?: string[];
}

export default function Classes() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [modifyingClass, setModifyingClass] = useState<{ class: Class; action: 'edit' | 'delete' } | null>(null);
  const [pendingChanges, setPendingChanges] = useState<any>(null);
  const { studioInfo, isLoading: dataLoading, initialized } = useData();
  const { userRole, userId } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queryInProgress, setQueryInProgress] = useState(false);

  const fetchClasses = React.useCallback(async () => {
    if (!userRole || !userId || !initialized || queryInProgress) return;

    try {
      setQueryInProgress(true);
      let query = supabase
        .from('classes')
        .select(`
          id,
          name,
          start_time,
          end_time,
          day_of_week,
          date,
          is_recurring,
          teacher_id,
          teacher:teachers (
            name
          )
        `);

      let studioId;

      if (userRole === 'teacher') {
        // Get teacher's ID first
        const { data: teacherData } = await supabase
          .from('teachers')
          .select('id, studio_id')
          .eq('user_id', userId)
          .limit(1)
          .single();

        if (teacherData) {
          studioId = teacherData.studio_id;
          query = query.eq('teacher_id', teacherData.id);
        } else {
          console.error('No teacher record found for user');
          setError('Teacher record not found');
          return;
        }
      } else if (userRole === 'parent') {
        // Get parent info and their students in a single query
        const { data: parentData } = await supabase
          .from('parents')
          .select('id, studio_id')
          .eq('user_id', userId)
          .limit(1)
          .single();

        if (parentData) {
          query = query
            .eq('studio_id', parentData.studio_id)
            .order('name');
            
          const { data: classData, error: classError } = await query;
          
          if (classError) throw classError;
          
          // Get enrollment information for the parent's students
          const enrichedClassData = await Promise.all((classData || []).map(async (classItem) => {
            const students = await getEnrolledStudents(classItem.id, parentData.id);
            return {
              ...classItem,
              enrolledStudents: students.map(s => s.name),
            };
          }));
          
          setClasses(enrichedClassData);
          return;
        } else {
          console.error('No parent record found for user');
          setError('Parent record not found');
          return;
        }
      } else {
        if (!studioInfo?.id) {
          setError('Loading studio information...');
          return;
        }
        studioId = studioInfo.id;
      }

      const { data, error: fetchError } = await query
        .eq('studio_id', studioId)
        .order('name');

      if (fetchError) throw fetchError;
      setClasses(data || []);
    } catch (err) {
      console.error('Error fetching classes:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch classes');
    } finally {
      setQueryInProgress(false);
      setLoading(false);
    }
  }, [userRole, userId, initialized, studioInfo?.id]);

  React.useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const handleDelete = async (classItem: Class) => {
    if (classItem.is_recurring) {
      setModifyingClass({ class: classItem, action: 'delete' });
    } else if (window.confirm('Are you sure you want to delete this class?')) {
      await deleteClass(classItem.id);
    }
  };

  const deleteClass = async (classId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('classes')
        .delete()
        .eq('id', classId);

      if (deleteError) throw deleteError;

      // Update local state
      setClasses(prevClasses => prevClasses.filter(c => c.id !== classId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete class');
    }
  };

  const handleEdit = (classItem: Class) => {
    if (classItem.is_recurring) {
      setModifyingClass({
        class: classItem,
        action: 'edit'
      });
    } else {
      setEditingClass({ ...classItem, modificationScope: 'single' });
    }
  };

  const handleSaveChanges = (classItem: Class, changes: any) => {
    if (classItem.is_recurring) {
      setPendingChanges(changes);
      setModifyingClass({
        class: classItem,
        action: 'edit'
      });
    } else {
      // For non-recurring classes, save directly
      setEditingClass({ ...classItem, modificationScope: 'single' });
    }
  };

  const handleModifyConfirm = async (scope: 'single' | 'future' | 'all') => {
    if (!modifyingClass) return;

    const { class: classItem, action } = modifyingClass;

    if (action === 'delete') {
      // Handle deletion based on scope
      try {
        if (scope === 'single') {
          // Delete specific instance
          const { error } = await supabase
            .from('class_instances')
            .delete()
            .eq('class_id', classItem.id)
            .eq('date', classItem.date);

          if (error) throw error;
        } else if (scope === 'future') {
          // Delete this and future instances
          const { error } = await supabase
            .from('class_instances')
            .delete()
            .eq('class_id', classItem.id)
            .gte('date', classItem.date);

          if (error) throw error;
        } else {
          // Delete all instances and the class itself
          await deleteClass(classItem.id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete class');
      }
    } else {
      // Apply the pending changes with the selected scope
      const modifiedClass = {
        ...classItem,
        modificationScope: scope
      };

      setEditingClass(modifiedClass);
      setModifyingClass(null);
    }

    if (action === 'delete') {
      setPendingChanges(null);
      fetchClasses();
    }
  };

  const formatSchedule = (classItem: Class) => {
    const timeStr = `${formatTime(classItem.start_time)} - ${formatTime(classItem.end_time)}`;
    if (classItem.is_recurring) {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return `${days[classItem.day_of_week!]} ${timeStr}`;
    }
    return `${new Date(classItem.date!).toLocaleDateString()} ${timeStr}`;
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString([], { 
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  if (loading || dataLoading) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-brand-primary">Classes</h1>
          <div className="w-32 h-10 bg-gray-200 rounded-md animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-4" />
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-brand-primary">Classes</h1>
        {userRole === 'owner' && <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Class
        </button>}
      </div>
      
      {showAddForm && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-brand-primary mb-4">Add New Class</h2>
          <AddClassForm
            onSuccess={() => {
              setShowAddForm(false);
              // Refresh classes
              fetchClasses();
            }}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      )}

      {editingClass && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-brand-primary mb-4">Edit Class</h2>
          <EditClassForm
            classData={editingClass}
            onSuccess={() => {
              setPendingChanges(null);
              setEditingClass(null);
              fetchClasses();
            }}
            onCancel={() => {
              setPendingChanges(null);
              setEditingClass(null);
            }}
            onSaveClick={(changes) => handleSaveChanges(editingClass, changes)}
          />
        </div>
      )}

      <WeeklyCalendar
        classes={classes}
        onClassClick={setSelectedClass}
        onEdit={handleEdit}
        onDelete={handleDelete}
        userRole={userRole}
      />
      
      {selectedClass && (
        <AttendanceModal
          classId={selectedClass.id}
          userRole={userRole}
          className={selectedClass.name}
          date={selectedClass.date}
          onClose={() => setSelectedClass(null)}
        />
      )}
      
      {modifyingClass && (
        <RecurringClassModal
          action={modifyingClass.action}
          onClose={() => setModifyingClass(null)}
          onConfirm={handleModifyConfirm}
        />
      )}
      
      {classes.length === 0 && !loading && (
        <p className="text-center text-gray-500 mt-8">No classes found</p>
      )}
    </div>
  );
}