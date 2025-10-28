import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { supabase, TeamMember, CalendarEvent } from '../lib/supabase';

export default function MonthlyCalendar() {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [currentYear]);

  const loadData = async () => {
    setLoading(true);

    const { data: members } = await supabase
      .from('team_members')
      .select('*')
      .order('name');

    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31);

    const { data: calendarEvents } = await supabase
      .from('calendar_events')
      .select('*')
      .gte('date', startOfYear.toISOString().split('T')[0])
      .lte('date', endOfYear.toISOString().split('T')[0]);

    if (members) setTeamMembers(members);
    if (calendarEvents) setEvents(calendarEvents);
    setLoading(false);
  };

  const getDaysInMonth = (year: number, month: number) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => {
      return new Date(year, month, i + 1);
    });
  };

  const getEventsForMemberAndDate = (memberId: string, date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(e => e.team_member_id === memberId && e.date === dateStr);
  };

  const getEventColor = (eventType: string) => {
    const colors: Record<string, string> = {
      vacation: 'bg-blue-500',
      meeting: 'bg-green-500',
      sick: 'bg-red-500',
      training: 'bg-yellow-500',
      work: 'bg-gray-300',
    };
    return colors[eventType] || 'bg-gray-300';
  };

  const months = Array.from({ length: 12 }, (_, i) => i);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-full mx-auto">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-slate-700 to-slate-900 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CalendarIcon className="w-8 h-8 text-white" />
                <h1 className="text-3xl font-bold text-white">Calendrier {currentYear}</h1>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentYear(currentYear - 1)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-white font-semibold"
                >
                  {currentYear - 1}
                </button>
                <button
                  onClick={() => setCurrentYear(currentYear + 1)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-white font-semibold"
                >
                  {currentYear + 1}
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 bg-slate-50 border-b border-slate-200">
            <div className="flex flex-wrap gap-4 items-center">
              <span className="text-sm font-semibold text-slate-700">Légende:</span>
              <div className="flex gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-blue-500"></div>
                  <span className="text-sm text-slate-600">Congés</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-green-500"></div>
                  <span className="text-sm text-slate-600">Réunion</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-red-500"></div>
                  <span className="text-sm text-slate-600">Maladie</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-yellow-500"></div>
                  <span className="text-sm text-slate-600">Formation</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {months.map((monthIndex) => {
            const days = getDaysInMonth(currentYear, monthIndex);
            const monthName = new Date(currentYear, monthIndex).toLocaleDateString('fr-FR', { month: 'long' });

            return (
              <div key={monthIndex} className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-slate-600 to-slate-800 p-4">
                  <h2 className="text-xl font-bold text-white capitalize">{monthName} {currentYear}</h2>
                </div>

                <div className="overflow-x-auto">
                  <div className="inline-block min-w-full">
                    <div className="bg-slate-100 border-b border-slate-200">
                      <div className="flex">
                        <div className="w-48 flex-shrink-0 p-3 font-semibold text-slate-700 border-r border-slate-200">
                          Membre de l'équipe
                        </div>
                        <div className="flex flex-1">
                          {days.map((day) => (
                            <div
                              key={day.toISOString()}
                              className="flex-1 min-w-[40px] p-2 text-center border-r border-slate-200 last:border-r-0"
                            >
                              <div className="text-xs text-slate-500 uppercase">
                                {day.toLocaleDateString('fr-FR', { weekday: 'short' })}
                              </div>
                              <div className="text-sm font-semibold text-slate-700 mt-1">
                                {day.getDate()}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      {teamMembers.map((member, idx) => (
                        <div
                          key={member.id}
                          className={`flex border-b border-slate-200 hover:bg-slate-50 transition-colors ${
                            idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                          }`}
                        >
                          <div className="w-48 flex-shrink-0 p-3 border-r border-slate-200">
                            <div className="font-medium text-slate-800">{member.name}</div>
                            <div className="text-xs text-slate-500 mt-1">{member.position}</div>
                          </div>
                          <div className="flex flex-1">
                            {days.map((day) => {
                              const dayEvents = getEventsForMemberAndDate(member.id, day);
                              const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                              return (
                                <div
                                  key={day.toISOString()}
                                  className={`flex-1 min-w-[40px] p-1 border-r border-slate-200 last:border-r-0 ${
                                    isWeekend ? 'bg-slate-100/50' : ''
                                  }`}
                                >
                                  {dayEvents.map((event) => (
                                    <div
                                      key={event.id}
                                      className={`h-6 rounded ${getEventColor(event.event_type)} mb-1`}
                                      title={`${event.event_type}: ${event.notes}`}
                                    />
                                  ))}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
