import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Edit2, Trash2 } from 'lucide-react';
import { addWeeks, subWeeks, startOfWeek, addDays, format, isSameDay } from 'date-fns';

interface Class {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  day_of_week: number | null;
  date: string | null;
  is_recurring: boolean;
  teacher: {
    name: string;
  };
  enrolledStudents?: string[];
}

interface WeeklyCalendarProps {
  classes: Class[];
  onClassClick: (classItem: Class) => void;
  onEdit?: (classItem: Class) => void;
  onDelete?: (classItem: Class, date: string) => void;
  userRole: string | null;
}

export default function WeeklyCalendar({ classes, onClassClick, onEdit, onDelete, userRole }: WeeklyCalendarProps) {
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });

  const formatTime = React.useCallback((time: string) => {
    return format(new Date(`2000-01-01T${time}`), 'h:mm a');
  }, []);

  const getClassesForDay = React.useCallback((date: Date) => {
    const dayOfWeek = date.getDay();
    const dateStr = format(date, 'yyyy-MM-dd');
    const modifiedClasses: Class[] = [];

    classes.forEach(classItem => {
      if (classItem.is_recurring) {
        if (classItem.day_of_week === dayOfWeek) {
          // Check for modifications
          const modifiedClass = {
            ...classItem,
            date: dateStr
          };
          modifiedClasses.push(modifiedClass);
        }
      }
      else if (classItem.date === dateStr) {
        modifiedClasses.push(classItem);
      }
    });
    return modifiedClasses;
  }, [classes]);

  const handlePrevWeek = () => {
    setCurrentDate(subWeeks(currentDate, 1));
  };

  const handleNextWeek = () => {
    setCurrentDate(addWeeks(currentDate, 1));
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="flex items-center justify-between p-4 border-b">
        <button
          onClick={handlePrevWeek}
          className="p-2 hover:bg-gray-100 rounded-full"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold">
          Week of {format(weekStart, 'MMMM d, yyyy')}
        </h2>
        <button
          onClick={handleNextWeek}
          className="p-2 hover:bg-gray-100 rounded-full"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="divide-y">
        {Array.from({ length: 7 }).map((_, index) => {
          const day = addDays(weekStart, index);
          const dayClasses = getClassesForDay(day);
          const isToday = isSameDay(day, new Date());

          return (
            <div key={index} className="p-4">
              <h3 className={`font-medium mb-2 ${
                isToday ? 'text-brand-primary' : 'text-gray-900'
              }`}>
                {format(day, 'EEEE, MMMM d')}
                {isToday && <span className="ml-2 text-brand-accent">(Today)</span>}
              </h3>
              <div className="space-y-2">
                {dayClasses.length > 0 ? (
                  dayClasses.map(classItem => (
                    <div
                      key={classItem.id}
                      className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                      onClick={(e) => {
                        // Prevent click when clicking action buttons
                        if (!(e.target as HTMLElement).closest('button')) {
                          onClassClick({
                            ...classItem,
                            date: format(day, 'yyyy-MM-dd')
                          });
                        }
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-brand-primary">
                            {classItem.name}
                          </h4>
                          <p className="text-sm text-brand-secondary-400">
                            {formatTime(classItem.start_time)} - {formatTime(classItem.end_time)}
                          </p>
                          <p className="text-sm text-gray-600">
                            Teacher: {classItem.teacher.name}
                          </p>
                          {userRole === 'parent' && classItem.enrolledStudents && (
                            <p className="text-sm text-gray-600 mt-1">
                              {classItem.enrolledStudents.length > 0 
                                ? `Enrolled: ${classItem.enrolledStudents.join(', ')}`
                                : 'Not enrolled'}
                            </p>
                          )}
                          {userRole === 'owner' && (
                            <div className="flex space-x-2 mt-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEdit?.({
                                    ...classItem, 
                                    date: format(day, 'yyyy-MM-dd'),
                                    is_recurring: classItem.is_recurring
                                  });
                                }}
                                className="p-1 text-gray-400 hover:text-brand-primary transition-colors"
                                title="Edit class"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDelete?.({
                                    ...classItem,
                                    date: format(day, 'yyyy-MM-dd')
                                  });
                                }}
                                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                title="Delete class"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 py-2">No classes scheduled</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}