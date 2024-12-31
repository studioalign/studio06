import React, { useState } from 'react';
import { UserPlus } from 'lucide-react';
import FormInput from './FormInput';
import { supabase } from '../lib/supabase';

interface AddStudentFormProps {
  parentId: string;
  studioId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function AddStudentForm({ parentId, studioId, onSuccess, onCancel }: AddStudentFormProps) {
  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const { error: insertError } = await supabase
        .from('students')
        .insert([
          {
            parent_id: parentId,
            studio_id: studioId,
            name,
            date_of_birth: dateOfBirth,
          },
        ]);

      if (insertError) throw insertError;

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add student');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormInput
        id="name"
        type="text"
        label="Student Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <FormInput
        id="dateOfBirth"
        type="date"
        label="Date of Birth"
        value={dateOfBirth}
        onChange={(e) => setDateOfBirth(e.target.value)}
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
          <UserPlus className="w-4 h-4 mr-2" />
          Add Student
        </button>
      </div>
    </form>
  );
}