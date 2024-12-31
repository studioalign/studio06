import React, { createContext, useContext, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import type { StudioInfo as StudioInfoType } from '../types/studio';
import { useLocation } from 'react-router-dom';

interface Teacher {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

interface Location {
  id: string;
  name: string;
  address: string | null;
}

interface DataContextType {
  studioInfo: StudioInfoType | null;
  teachers: Teacher[];
  locations: Location[];
  students: any[]; // TODO: Add proper type once students table is available
  isLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [studioInfo, setStudioInfo] = useState<StudioInfoType | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userRole, userId } = useAuth();
  const location = useLocation();
  const [initialized, setInitialized] = useState(false);

  React.useEffect(() => {
    if (userId) {
      fetchData();
    }
  }, [userId, location.pathname]);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (userRole === 'owner') {
        // Get the owner's ID
        const { data: ownerData, error: ownerError } = await supabase
          .from('owners')
          .select('id')
          .single();

        if (ownerError) throw ownerError;

        // Get the studio information
        const { data: studioData, error: studioError } = await supabase
          .from('studios')
          .select('*')
          .eq('owner_id', ownerData.id)
          .single();

        if (studioError) throw studioError;

        setStudioInfo({
          id: studioData.id,
          name: studioData.name,
          address: studioData.address,
          contact: {
            phone: studioData.phone,
            email: studioData.email,
          },
        });

        // Fetch teachers for the studio
        const { data: teachersData, error: teachersError } = await supabase
          .from('teachers')
          .select('*')
          .eq('studio_id', studioData.id);

        if (teachersError) throw teachersError;
        setTeachers(teachersData || []);

        // Fetch locations for the studio
        const { data: locationsData, error: locationsError } = await supabase
          .from('locations')
          .select('id, name, address')
          .eq('studio_id', studioData.id)
          .order('name');

        if (locationsError) throw locationsError;
        setLocations(locationsData || []);

        // TODO: Fetch students once the table is available
      } else if (userRole === 'teacher' || userRole === 'parent') {
        // Get user's studio information
        const tableName = userRole === 'teacher' ? 'teachers' : 'parents';
        const { data: userData, error: userError } = await supabase
          .from(tableName)
          .select(`
            studio:studios (
              id,
              name,
              address,
              phone,
              email
            )
          `)
          .eq('user_id', userId)
          .single();

        if (userError) throw userError;

        setStudioInfo({
          id: userData.studio.id,
          name: userData.studio.name,
          address: userData.studio.address,
          contact: {
            phone: userData.studio.phone,
            email: userData.studio.email,
          },
        });

        // Fetch teachers for the studio
        const { data: teachersData, error: teachersError } = await supabase
          .from('teachers')
          .select('*')
          .eq('studio_id', userData.studio.id);

        if (teachersError) throw teachersError;
        setTeachers(teachersData || []);

        // Fetch locations for the studio
        const { data: locationsData, error: locationsError } = await supabase
          .from('locations')
          .select('id, name, address')
          .eq('studio_id', userData.studio.id)
          .order('name');

        if (locationsError) throw locationsError;
        setLocations(locationsData || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setIsLoading(false);
      setInitialized(true);
    }
  };

  return (
    <DataContext.Provider 
      value={{ 
        studioInfo, 
        teachers, 
        locations,
        students, 
        isLoading, 
        error,
        initialized,
        refreshData: fetchData 
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}