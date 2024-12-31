import { ReactNode } from 'react';

export type Role = 'owner' | 'teacher' | 'parent';

export interface RoleOption {
  id: Role;
  title: string;
  description: string;
  icon: ReactNode;
}