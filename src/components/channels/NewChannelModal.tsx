import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { supabase } from '../../lib/supabase';
import FormInput from '../FormInput';
import SearchableDropdown from '../SearchableDropdown';

interface NewChannelModalProps {
  onClose: () => void;
}

export default function NewChannelModal({ onClose }: NewChannelModalProps) {
  const { studioInfo } = useData();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedClass, setSelectedClass] = useState<{ id: string; label: string } | null>(null);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function fetchClasses() {
      if (!studioInfo?.id) return;

      try {
        const { data, error: fetchError } = await supabase
          .from('classes')
          .select('id, name')
          .eq('studio_id', studioInfo.id)
          .order('name');

        if (fetchError) throw fetchError;
        setClasses(data || []);
      } catch (err) {
        console.error('Error fetching classes:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch classes');
      } finally {
        setLoading(false);
      }
    }

    fetchClasses();
  }, [studioInfo?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from('class_channels')
        .insert([
          {
            class_id: selectedClass.id,
            name,
            description: description || null,
            created_by: (await supabase.auth.getUser()).data.user?.id,
          },
        ]);

      if (insertError) throw insertError;
      onClose();
    } catch (err) {
      console.error('Error creating channel:', err);
      setError(err instanceof Error ? err.message : 'Failed to create channel');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-brand-primary">
            Create New Channel
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <SearchableDropdown
            id="class"
            label="Select Class"
            value={selectedClass}
            onChange={setSelectedClass}
            options={classes.map(c => ({ id: c.id, label: c.name }))}
            isLoading={loading}
            required
          />

          <FormInput
            id="name"
            type="text"
            label="Channel Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-brand-secondary-400">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim() || !selectedClass}
              className="px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400 disabled:bg-gray-400"
            >
              Create Channel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}