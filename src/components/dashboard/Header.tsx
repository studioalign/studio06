import React from 'react';
import { Bell, Settings, LogOut, User, CreditCard } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import NotificationDropdown from '../notifications/NotificationDropdown';
import { useNotifications } from '../../hooks/useNotifications';

interface DropdownItem {
  label: string;
  icon: React.ReactNode;
  href: string;
}

export default function Header() {
  const { signOut, userRole, userId } = useAuth();
  const { studioInfo } = useData();
  const [studioName, setStudioName] = useState<string>('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();

  const dropdownItems: DropdownItem[] = [
    { label: 'Profile', icon: <User className="w-4 h-4" />, href: '/dashboard/profile' },
    { label: 'Settings', icon: <Settings className="w-4 h-4" />, href: '/dashboard/settings' },
    ...(userRole === 'owner' ? [
      { label: 'Billing', icon: <CreditCard className="w-4 h-4" />, href: '/dashboard/billing' }
    ] : [])
  ];

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
    <header className="h-16 bg-white border-b border-gray-200 px-16 lg:px-8 flex items-center justify-between">
      <div className="flex items-center">
        <h2 className="text-lg md:text-xl lg:text-2xl font-semibold text-brand-primary truncate">{displayName || 'Loading...'}</h2>
      </div>
      <div className="flex items-center space-x-4">
        <button 
          onClick={() => setShowNotifications(!showNotifications)}
          className="p-2 text-gray-500 hover:text-brand-primary relative z-20"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 w-4 h-4 bg-brand-primary text-white text-xs rounded-full flex items-center justify-center transform translate-x-1 -translate-y-1">
              {unreadCount}
            </span>
          )}
        </button>
        {showNotifications && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setShowNotifications(false)}
            />
            <div className="absolute right-0 top-12 z-20">
              <NotificationDropdown onClose={() => setShowNotifications(false)} />
            </div>
          </>
        )}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="w-8 h-8 rounded-full bg-brand-accent flex items-center justify-center"
          >
            <span className="text-brand-primary font-medium">JD</span>
          </button>
          
          {showDropdown && (
            <>
              <div 
                className="fixed inset-0 z-10"
                onClick={() => setShowDropdown(false)}
              />
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-20">
                {dropdownItems.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      navigate(item.href);
                      setShowDropdown(false);
                    }}
                    className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                  >
                    {item.icon}
                    <span className="ml-2">{item.label}</span>
                  </button>
                ))}
                <div className="border-t my-1" />
                <button
                  onClick={handleSignOut}
                  className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center whitespace-nowrap"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="ml-2">Sign out</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
