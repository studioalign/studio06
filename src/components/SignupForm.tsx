import React, { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Role } from '../types/auth';
import { roles } from '../data/roles';
import RoleCard from './RoleCard';
import SearchableDropdown from './SearchableDropdown';
import FormInput from './FormInput';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useStudios } from '../hooks/useStudios';

export default function SignupForm() {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedStudio, setSelectedStudio] = useState<{ id: string; label: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { studios, isLoading: loadingStudios, error: studiosError } = useStudios();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (!selectedRole) {
        throw new Error('Please select a role');
      }

      if ((selectedRole === 'teacher' || selectedRole === 'parent') && !selectedStudio) {
        throw new Error('Please select a studio');
      }
      // Sign up the user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error('Signup failed');

      let studioId: string | null = null;

      if (selectedRole === 'owner') {
        // First create the owner
        const { data: ownerData, error: ownerError } = await supabase
          .from('owners')
          .insert([
            {
              user_id: authData.user.id,
              name,
              email,
            },
          ])
          .select()
          .single();

        if (ownerError) throw ownerError;
        
        // Check if owner already has a studio
        const { data: existingStudio } = await supabase
          .from('studios')
          .select('id')
          .eq('owner_id', ownerData.id)
          .maybeSingle();

        if (!existingStudio) {
          // Create initial studio only if one doesn't exist
          const { data: studioData, error: studioError } = await supabase
            .from('studios')
            .insert([
              {
                owner_id: ownerData.id,
                name: 'My Dance Studio',
                address: '',
                phone: '',
                email: email,
              },
            ])
            .select()
            .single();

          if (studioError) throw studioError;
          studioId = studioData.id;
        }
      } else {
        // Create teacher or parent record with studio association
        const { error: userError } = await supabase
          .from(selectedRole === 'teacher' ? 'teachers' : 'parents')
          .insert([
            {
              user_id: authData.user.id,
              studio_id: selectedStudio!.id,
              name,
              email,
            },
          ]);

        if (userError) throw userError;
      }

      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during signup');
    }
  };

  return (
    <div className="w-full max-w-4xl p-8 bg-white rounded-2xl shadow-xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-brand-primary mb-2">Create your StudioAlign account</h1>
        <p className="text-brand-secondary-400">Choose your role to get started</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {roles.map((role) => (
          <RoleCard
            key={role.id}
            role={role}
            isSelected={selectedRole === role.id}
            onSelect={setSelectedRole}
          />
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-md mx-auto">
        <FormInput
          id="name"
          type="text"
          label="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <FormInput
          id="email"
          type="email"
          label="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        
        <FormInput
          id="password"
          type="password"
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {(selectedRole === 'teacher' || selectedRole === 'parent') && (
          <SearchableDropdown
            id="studio"
            label="Select Studio"
            value={selectedStudio}
            onChange={setSelectedStudio}
            options={studios.map(studio => ({ id: studio.id, label: studio.name }))}
            isLoading={loadingStudios}
            error={studiosError}
          />
        )}
        <button
          type="submit"
          disabled={!selectedRole}
          className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-brand-primary hover:bg-brand-secondary-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-accent disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <UserPlus className="w-5 h-5 mr-2" />
          Sign up
        </button>
        
        {error && (
          <p className="text-red-500 text-sm text-center">{error}</p>
        )}
        
        <p className="text-center text-sm text-brand-secondary-400">
          Already have an account?{' '}
          <Link to="/" className="font-medium text-brand-primary hover:text-brand-secondary-400">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}