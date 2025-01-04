import React, { createContext, useContext, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  isAuthenticated: boolean;
  userRole: string | null;
  userId: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const signIn = async (email: string, password: string) => {
    const { data: { user }, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error('Invalid email or password');
    }
    
    if (!user) {
      throw new Error('No user found');
    }

    try {
      // Check each role table to determine the user's role
      const { data: ownerData } = await supabase
        .from('owners')
        .select()
        .eq('user_id', user.id)
        .maybeSingle();

      if (ownerData) {
        setIsAuthenticated(true);
        setUserRole('owner');
        setUserId(user.id);
        return;
      }

      const { data: teacherData } = await supabase
        .from('teachers')
        .select()
        .eq('user_id', user.id)
        .maybeSingle();

      if (teacherData) {
        setIsAuthenticated(true);
        setUserRole('teacher');
        setUserId(user.id);
        return;
      }

      const { data: parentData } = await supabase
        .from('parents')
        .select()
        .eq('user_id', user.id)
        .maybeSingle();

      if (parentData) {
        setIsAuthenticated(true);
        setUserRole('parent');
        setUserId(user.id);
        return;
      }

      throw new Error('User role not found');
    } catch (err) {
      throw new Error('Failed to verify user role');
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setUserRole(null);
    setUserId(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, userRole, userId, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
