import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import DashboardCard from './DashboardCard';
import AddStudentForm from '../AddStudentForm';

interface Student {
  id: string;
  name: string;
  date_of_birth: string;
  created_at: string;
}

export default function MyStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [parentInfo, setParentInfo] = useState<{ id: string; studio_id: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    async function fetchStudents() {
      try {
        const { data: parentData, error: parentError } = await supabase
          .from('parents')
          .select('id, studio_id')
          .single();

        if (parentError) throw parentError;
        setParentInfo(parentData);

        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select('*')
          .eq('parent_id', parentData.id)
          .order('name');

        if (studentsError) throw studentsError;
        setStudents(studentsData || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch students');
      } finally {
        setLoading(false);
      }
    }

    fetchStudents();
  }, [refreshKey]);

  const handleAddSuccess = () => {
    setShowAddForm(false);
    setRefreshKey(prev => prev + 1); // Force a refresh by updating the key
  };

  if (loading) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-brand-primary">My Students</h1>
          <div className="w-32 h-10 bg-gray-200 rounded-md animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2].map((i) => (
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
        <h1 className="text-2xl font-bold text-brand-primary">My Students</h1>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Student
        </button>
      </div>

      {showAddForm && parentInfo && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-brand-primary mb-4">Add New Student</h2>
          <AddStudentForm
            parentId={parentInfo.id}
            studioId={parentInfo.studio_id}
            onSuccess={handleAddSuccess}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {students.map((student) => (
          <DashboardCard
            key={student.id}
            title={student.name}
            items={[
              { label: 'Date of Birth', value: new Date(student.date_of_birth).toLocaleDateString() },
              { label: 'Added', value: new Date(student.created_at).toLocaleDateString() },
            ]}
          />
        ))}
      </div>
      {students.length === 0 && !loading && (
        <p className="text-center text-gray-500 mt-8">No students added yet</p>
      )}
    </div>
  );
}