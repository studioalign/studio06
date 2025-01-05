import React, { useState, useEffect, useCallback } from 'react';
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
import { addDays, format } from 'date-fns';

interface ClassInstance {
  id: string;
  class_id: string;
  date: string;
  status: string;
  name: string;
  start_time: string;
  end_time: string;
  teacher_id: string;
  teacher: {
    name: string;
  };
  location_id: string;
  location: {
    name: string;
  };
  class: {
    studio_id: string;
    is_recurring: boolean;
  };
  enrolledStudents?: string[];
}

export default function Classes() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassInstance | null>(null);
  const [selectedClass, setSelectedClass] = useState<ClassInstance | null>(null);
  const [modifyingClass, setModifyingClass] = useState<{ class: ClassInstance; action: 'edit' | 'delete' } | null>(null);
  const [pendingChanges, setPendingChanges] = useState<any>(null);
  const [classInstances, setClassInstances] = useState<ClassInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queryInProgress, setQueryInProgress] = useState(false);
  const { studioInfo, isLoading: dataLoading, initialized } = useData();
  const { userRole, userId } = useAuth();

  const fetchClassInstances = useCallback(async () => {
    if (!userRole || !userId || !initialized || queryInProgress || !studioInfo?.id) return;
  
    try {
      setQueryInProgress(true);
      let parentId: string | null = null;

      if (userRole === 'parent') {
        const { data: parentData, error: parentError } = await supabase
          .from('parents')
          .select('id')
          .eq('user_id', userId)
          .single();

        if (parentError) throw parentError;
        parentId = parentData.id;
      }

      let query = supabase
        .from('class_instances')
        .select(`
          id,
          class_id,
          date,
          status,
          name,
          start_time,
          end_time,
          teacher_id,
          teacher:teachers (
            name
          ),
          location_id,
          location:locations (
            name
          ),
          class:classes (
            studio_id,
            is_recurring
          )
        `);

      if (userRole === 'parent') {
        query = query.eq('class.studio_id', studioInfo.id);
      }

      const { data, error } = await query.order('date', { ascending: true });

      if (error) throw error;

      // For parent users, fetch enrolled students for each class
      if (userRole === 'parent' && parentId) {
        const instancesWithEnrollments = await Promise.all(
          (data || []).map(async (instance) => {
            const students = await getEnrolledStudents(instance.class_id, parentId);
            return {
              ...instance,
              enrolledStudents: students.map(s => s.name)
            };
          })
        );
        setClassInstances(instancesWithEnrollments);
      } else {
        setClassInstances(data || []);
      }
    } catch (err) {
      console.error('Error fetching class_instances:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch classes');
    } finally {
      setQueryInProgress(false);
      setLoading(false);
    }
  }, [userRole, userId, initialized, studioInfo?.id]);  

  // **useEffect to Fetch Data on Component Mount or Dependencies Change**
  useEffect(() => {
    fetchClassInstances();
  }, [fetchClassInstances]);

  // **Handle Delete Operations**
  
  const handleDelete = async (classItem: ClassInstance) => {
    if (classItem.class.is_recurring) {
      setModifyingClass({ class: classItem, action: 'delete' });
    } else if (window.confirm('Are you sure you want to delete this class?')) {
      await deleteClass(classItem.id);
    }
  };

  const deleteClass = async (classId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('class_instances')
        .delete()
        .eq('id', classId);

      if (deleteError) throw deleteError;

      // **Update Local State**
      setClassInstances(prevClasses => prevClasses.filter(c => c.id !== classId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete class');
    }
  };

  // **Handle Edit Operations**
  
  const handleEdit = (classItem: ClassInstance) => {
    if (classItem.class.is_recurring) {
      // Avoid setting state if the same class is already being modified
      if (
        modifyingClass?.class.id !== classItem.id ||
        modifyingClass?.action !== 'edit'
      ) {
        setModifyingClass({
          class: classItem,
          action: 'edit',
        });
      }
    } else {
      // Avoid setting state if the same class is already being edited
      if (editingClass?.id !== classItem.id) {
        setEditingClass(classItem);
      }
    }
  };  

  const handleSaveChanges = (classItem: ClassInstance, changes: any) => {
    if (classItem.class.is_recurring) {
      setPendingChanges(changes);
      setModifyingClass({
        class: classItem,
        action: 'edit'
      });
    } else {
      // **For Non-Recurring Classes, Save Directly**
      setEditingClass(classItem);
    }
  };

  const handleModifyConfirm = async (scope: 'single' | 'future' | 'all') => {
    if (!modifyingClass) return;
  
    const { class: classItem, action } = modifyingClass;
  
    try {
      if (action === 'delete') {
        // Handle delete logic
        if (scope === 'single') {
          // Delete only the selected instance
          const { error } = await supabase
            .from('class_instances')
            .delete()
            .eq('id', classItem.id);
  
          if (error) throw error;
        } else if (scope === 'future') {
          // Delete this and future instances
          const { error } = await supabase
            .from('class_instances')
            .delete()
            .eq('class_id', classItem.class_id)
            .gte('date', classItem.date);
  
          if (error) throw error;
        } else if (scope === 'all') {
          // Delete all instances
          const { error } = await supabase
            .from('class_instances')
            .delete()
            .eq('class_id', classItem.class_id);
  
          if (error) throw error;
        }
      } else if (action === 'edit') {
        // Handle edit logic
        if (scope === 'single') {
          // Update only the selected instance
          setEditingClass({ ...classItem, modificationScope: 'single' });
        } else if (scope === 'future') {
          // Update this and future instances
          setEditingClass({ ...classItem, modificationScope: 'future' });
        } else if (scope === 'all') {
          // Update all instances
          setEditingClass({ ...classItem, modificationScope: 'all' });
        }
      }
  
      // Refresh class instances after modification
      fetchClassInstances();
    } catch (err) {
      console.error(`Error handling ${scope} ${action}:`, err);
      setError(err instanceof Error ? err.message : `Failed to ${action} ${scope} instances`);
    } finally {
      setModifyingClass(null);
    }
  };  

  // **Utility Functions for Formatting**
  
  const formatSchedule = (classItem: ClassInstance) => {
    const timeStr = `${formatTime(classItem.start_time)} - ${formatTime(classItem.end_time)}`;
    if (classItem.class.is_recurring) {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return `${days[new Date(classItem.date).getDay()]} ${timeStr}`;
    }
    return `${new Date(classItem.date).toLocaleDateString()} ${timeStr}`;
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString([], { 
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  // **Conditional Rendering Based on Loading and Error States**
  
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

  // **Main Render Function**
  
  return (
    <div>
      {/* **Header Section** */}
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
      
      {/* **Add Class Form Modal** */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-brand-primary mb-4">Add New Class</h2>
          <AddClassForm
            onSuccess={() => {
              setShowAddForm(false);
              // **Refresh Classes After Adding**
              fetchClassInstances();
            }}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      )}

      {/* **Edit Class Form Modal** */}
      {editingClass && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-brand-primary mb-4">Edit Class</h2>

          {console.log('Editing class data being passed to EditClassForm:', editingClass)}

          <EditClassForm
            classData={editingClass}
            onSuccess={() => {
              setPendingChanges(null);
              setEditingClass(null);
              fetchClassInstances();
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
  classes={classInstances}
  onClassClick={setSelectedClass}
  onEdit={(classItem) => setModifyingClass({ class: classItem, action: 'edit' })}
  onDelete={(classItem) => setModifyingClass({ class: classItem, action: 'delete' })}
  userRole={userRole}
/>

      {/* **Attendance Modal** */}
      {selectedClass && (
        <AttendanceModal
          classId={selectedClass.class_id}
          instanceId={selectedClass.id}
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
    onConfirm={(scope) => handleModifyConfirm(scope)} // Pass the scope to the handler
  />
)}
      
      {/* **No Classes Found Message** */}
      {classInstances.length === 0 && !loading && (
        <p className="text-center text-gray-500 mt-8">No classes found</p>
      )}
    </div>
  );
}