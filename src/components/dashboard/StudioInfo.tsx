import React, { useState, useEffect } from 'react';
import { MapPin, Phone, Mail, Save, Plus } from 'lucide-react';
import FormField from '../FormField';
import RoomCard from './RoomCard';
import AddRoomForm from './AddRoomForm';
import { supabase } from '../../lib/supabase';
import type { StudioInfo as StudioInfoType } from '../../types/studio';
import { useData } from '../../contexts/DataContext';

interface Location {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
}
export default function StudioInfo() {
  const [isEditing, setIsEditing] = useState(false);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [localStudioInfo, setLocalStudioInfo] = useState<StudioInfoType | null>(null);

  const { studioInfo, error, isLoading, refreshData } = useData();

  useEffect(() => {
    if (studioInfo && !localStudioInfo) {
      setLocalStudioInfo(studioInfo);
    }
  }, [studioInfo, localStudioInfo]);

  useEffect(() => {
    async function fetchLocations() {
      if (!studioInfo?.id) return;
      
      try {
        const { data, error: fetchError } = await supabase
          .from('locations')
          .select('*')
          .eq('studio_id', studioInfo.id)
          .order('name');

        if (fetchError) throw fetchError;
        setLocations(data || []);
      } catch (err) {
        console.error('Error fetching locations:', err);
      } finally {
        setLoadingLocations(false);
      }
    }

    fetchLocations();
  }, [studioInfo?.id]);

  const handleDeleteRoom = async (roomId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('locations')
        .delete()
        .eq('id', roomId);

      if (deleteError) throw deleteError;

      setLocations(prevLocations => 
        prevLocations.filter(location => location.id !== roomId)
      );
    } catch (err) {
      console.error('Error deleting room:', err);
      // You might want to show an error message to the user here
    }
  };

  const handleSave = async () => {
    try {
      if (!studioInfo || !localStudioInfo) return;
      
      // Get the owner's ID first
      const { data: ownerData, error: ownerError } = await supabase
        .from('owners')
        .select('id')
        .single();

      if (ownerError) throw ownerError;

      // Update the existing studio record
      const { error: studioError } = await supabase
        .from('studios')
        .update({
          name: localStudioInfo.name,
          address: localStudioInfo.address,
          phone: localStudioInfo.contact.phone,
          email: localStudioInfo.contact.email,
          updated_at: new Date().toISOString(),
        })
        .eq('id', studioInfo.id)
        .eq('owner_id', ownerData.id);

      if (studioError) throw studioError;

      setIsEditing(false);
      await refreshData();
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to save studio information';
      console.error(error, err);
      throw error;
    }
  };

  if (isLoading) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-brand-primary">Studio Information</h1>
          <div className="w-32 h-10 bg-gray-200 rounded-md animate-pulse" />
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-6" />
          <div className="space-y-6">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
            <div className="h-4 bg-gray-200 rounded w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  if (!studioInfo) {
    return <div>No studio information found</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-brand-primary">Studio Information</h1>
        <button
          onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400"
        >
          <Save className="w-5 h-5 mr-2" />
          {isEditing ? 'Save Changes' : 'Edit Information'}
        </button>
        {error && (
          <p className="text-red-500 text-sm ml-4">{error}</p>
        )}
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-brand-primary mb-4">Studio Details</h2>
        <div className="space-y-6">
          <div>
            <div className="flex items-center mb-4">
              <MapPin className="w-5 h-5 text-brand-accent mr-2" />
              <h3 className="font-medium">Location Information</h3>
            </div>
            {isEditing && localStudioInfo ? (
              <div className="space-y-4 pl-7">
                <FormField
                  id="studioName"
                  label="Studio Name"
                  value={localStudioInfo.name}
                  onChange={(value) => setLocalStudioInfo({ ...localStudioInfo, name: value })}
                />
                <FormField
                  id="address"
                  label="Address"
                  value={localStudioInfo.address}
                  onChange={(value) => setLocalStudioInfo({ ...localStudioInfo, address: value })}
                />
              </div>
            ) : (
              <div className="pl-7 space-y-2">
                <p className="font-medium text-gray-900">{studioInfo.name}</p>
                <p className="text-brand-secondary-400">{studioInfo.address}</p>
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center mb-4">
              <Phone className="w-5 h-5 text-brand-accent mr-2" />
              <h3 className="font-medium">Contact Information</h3>
            </div>
            {isEditing && localStudioInfo ? (
              <div className="space-y-4 pl-7">
                <FormField
                  id="phone"
                  type="tel"
                  label="Phone Number"
                  value={localStudioInfo.contact.phone}
                  onChange={(value) =>
                    setLocalStudioInfo({
                      ...localStudioInfo,
                      contact: { ...localStudioInfo.contact, phone: value },
                    })
                  }
                />
                <FormField
                  id="email"
                  type="email"
                  label="Email Address"
                  value={localStudioInfo.contact.email}
                  onChange={(value) =>
                    setLocalStudioInfo({
                      ...localStudioInfo,
                      contact: { ...localStudioInfo.contact, email: value },
                    })
                  }
                />
              </div>
            ) : (
              <div className="pl-7 space-y-2">
                <p className="text-brand-secondary-400">{studioInfo.contact.phone}</p>
                <p className="text-brand-secondary-400">{studioInfo.contact.email}</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6 mt-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-brand-primary">Studio Rooms</h2>
          <button
            onClick={() => setShowAddRoom(true)}
            className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Room
          </button>
        </div>

        {showAddRoom && studioInfo && (
          <div className="mb-6">
            <AddRoomForm
              studioId={studioInfo.id}
              onSuccess={() => {
                setShowAddRoom(false);
                // Refresh locations
                setLocations(prevLocations => [...prevLocations]);
              }}
              onCancel={() => setShowAddRoom(false)}
            />
          </div>
        )}

        <div className="space-y-4">
          {loadingLocations ? (
            <div className="animate-pulse space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="bg-gray-100 h-24 rounded-lg" />
              ))}
            </div>
          ) : locations.length > 0 ? (
            locations.map(location => (
              <RoomCard
                key={location.id}
                name={location.name}
                description={location.description}
                address={location.address}
                onDelete={() => handleDeleteRoom(location.id)}
              />
            ))
          ) : (
            <p className="text-center text-gray-500 py-4">
              No rooms added yet. Add your first room to get started.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}