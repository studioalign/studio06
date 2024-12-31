import React from 'react';
import { Users, BookOpen, GraduationCap } from 'lucide-react';
import StatsCard from './StatsCard';

export default function Overview() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-primary mb-6">Overview</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard
          title="Total Students"
          value="156"
          icon={GraduationCap}
          trend="+12%"
          description="vs last month"
        />
        <StatsCard
          title="Active Classes"
          value="24"
          icon={BookOpen}
          trend="+3"
          description="this week"
        />
        <StatsCard
          title="Teachers"
          value="12"
          icon={Users}
          trend="stable"
          description="no change"
        />
      </div>
    </div>
  );
}