import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, BookOpen, Building2, Users, GraduationCap, MessageSquare, Hash, DollarSign, CreditCard, FileText, Wallet } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const ownerNavigation = [
  { name: 'Overview', to: '/dashboard', icon: Home, end: true },
  { name: 'Classes', to: '/dashboard/classes', icon: BookOpen },
  { name: 'Messages', to: '/dashboard/messages', icon: MessageSquare },
  { name: 'Channels', to: '/dashboard/channels', icon: Hash },
  { name: 'Studio Info', to: '/dashboard/studio', icon: Building2 },
  { name: 'Teachers', to: '/dashboard/teachers', icon: Users },
  { name: 'Students', to: '/dashboard/students', icon: GraduationCap },
  { name: 'Payments', to: '/dashboard/payments', icon: DollarSign },
  { name: 'Invoices', to: '/dashboard/invoices', icon: FileText },
];

const teacherNavigation = [
  { name: 'Overview', to: '/dashboard', icon: Home, end: true },
  { name: 'Classes', to: '/dashboard/classes', icon: BookOpen },
  { name: 'Messages', to: '/dashboard/messages', icon: MessageSquare },
  { name: 'Channels', to: '/dashboard/channels', icon: Hash },
];

const parentNavigation = [
  { name: 'Overview', to: '/dashboard', icon: Home, end: true },
  { name: 'Classes', to: '/dashboard/classes', icon: BookOpen },
  { name: 'Messages', to: '/dashboard/messages', icon: MessageSquare },
  { name: 'Channels', to: '/dashboard/channels', icon: Hash },
  { name: 'My Students', to: '/dashboard/my-students', icon: GraduationCap },
];

export default function Sidebar() {
  const { userRole } = useAuth();

  let navigation;
  switch (userRole) {
    case 'owner':
      navigation = ownerNavigation;
      break;
    case 'teacher':
      navigation = teacherNavigation;
      break;
    default:
      navigation = parentNavigation;
  }

  return (
    <div className="fixed inset-y-0 left-0 w-64 bg-brand-primary text-white">
      <div className="h-16 flex items-center px-6">
        <h1 className="text-xl font-bold">StudioAlign</h1>
      </div>
      <nav className="mt-6">
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center px-6 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-secondary-400 text-brand-accent'
                    : 'text-gray-300 hover:bg-brand-secondary-400/50 hover:text-white'
                }`
              }
            >
              <Icon className="w-5 h-5 mr-3" />
              {item.name}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}