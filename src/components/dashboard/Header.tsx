import React from 'react';
import { Bell, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function Header() {
  const { signOut, userRole, userId } = useAuth();
  const { studioInfo } = useData();
  const [studioName, setStudioName] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchStudioName() {
      try {
        if (userRole === 'teacher' || userRole === 'parent') {
          const tableName = userRole === 'teacher' ? 'teachers' : 'parents';
          const { data: userData, error: userError } = await supabase
            .from(tableName)
            .select('studio:studios(name)')
            .eq('user_id', userId)
            .single();

          if (userError) throw userError;
          if (userData?.studio?.name) {
            setStudioName(userData.studio.name);
          }
        }
      } catch (err) {
        console.error('Error fetching studio name:', err);
      }
    }

    if ((userRole === 'teacher' || userRole === 'parent') && userId) {
      fetchStudioName();
    }
  }, [userRole, userId]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const displayName = userRole === 'owner' 
    ? studioInfo?.name 
    : studioName;

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-8 flex items-center justify-between">
      <div className="flex items-center">
        <h2 className="text-2xl font-semibold text-brand-primary">{displayName || 'Loading...'}</h2>
      </div>
      <div className="flex items-center space-x-4">
        <button className="p-2 text-gray-500 hover:text-brand-primary">
          <Bell className="w-5 h-5" />
        </button>
        <button className="p-2 text-gray-500 hover:text-brand-primary">
          <Settings className="w-5 h-5" />
        </button>
        <button 
          onClick={handleSignOut}
          className="p-2 text-gray-500 hover:text-brand-primary"
          title="Sign out"
        >
          <LogOut className="w-5 h-5" />
        </button>
        <div className="w-8 h-8 rounded-full bg-brand-accent flex items-center justify-center">
          <span className="text-brand-primary font-medium">JD</span>
        </div>
      </div>
    </header>
  );
}