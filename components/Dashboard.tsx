
import React, { useState, useMemo, useRef, useEffect } from 'react';
import Card from './ui/Card';
import { ChatbotIcon } from './icons/ChatbotIcon';
import { TicketsIcon } from './icons/TicketsIcon';
import { KnowledgeIcon } from './icons/KnowledgeIcon';
import { UsersIcon } from './icons/UsersIcon';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import type { Ticket } from '../types';
import { CalendarIcon } from './icons/CalendarIcon';

type Point = { name: string; conversations: number };

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function lastNDays(n: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    out.push(ymd(d));
  }
  return out;
}

function buildWeeklyFromTickets(tickets: Ticket[]): Point[] {
  const days = lastNDays(7);
  const map = new Map<string, number>();
  days.forEach((d) => map.set(d, 0));

  for (const t of tickets) {
    const d = String((t as any).lastUpdate || '').slice(0, 10);
    if (map.has(d)) map.set(d, (map.get(d) || 0) + 1);
  }

  return days.map((d) => {
    const label = d.slice(5);
    return { name: label, conversations: map.get(d) || 0 };
  });
}

const StatCard: React.FC<{ icon: React.ReactNode; title: string; value: string; description: string }> = ({ icon, title, value, description }) => (
    <Card className="h-full">
        <div className="h-full flex flex-col justify-between">
            <div className="flex items-center">
                <div className="p-3 mr-4 text-[#C79A2A] bg-[#C79A2A]/10 rounded-2xl ring-1 ring-[#C79A2A]/20">
                    {icon}
                </div>
                <div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</p>
                    <p className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">{value}</p>
                </div>
            </div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 min-h-[2.5rem] leading-snug">{description}</p>
        </div>
    </Card>
);

const CalendarPopover: React.FC<{ 
    onSelectDate: (date: Date) => void; 
    onClose: () => void;
}> = ({ onSelectDate, onClose }) => {
    const [date, setDate] = useState(new Date());
    const calendarRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose]);

    const daysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay();

    const renderDays = () => {
        const month = date.getMonth();
        const year = date.getFullYear();
        const days = [];
        const totalDays = daysInMonth(month, year);
        const firstDay = firstDayOfMonth(month, year);

        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="w-8 h-8"></div>);
        }

        for (let i = 1; i <= totalDays; i++) {
            const dayDate = new Date(year, month, i);
            const isToday = new Date().toDateString() === dayDate.toDateString();
            days.push(
                <button
                    key={i}
                    onClick={() => onSelectDate(dayDate)}
                    className={`w-8 h-8 flex items-center justify-center rounded-full text-sm ${
                        isToday ? 'bg-[#0A2A1F] text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                >
                    {i}
                </button>
            );
        }
        return days;
    };

    const changeMonth = (offset: number) => {
        setDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
    };

    return (
        <div ref={calendarRef} className="absolute top-12 right-0 z-20 w-64 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-xl border dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
                <button onClick={() => changeMonth(-1)} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">&lt;</button>
                <span className="font-semibold text-sm">{date.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                <button onClick={() => changeMonth(1)} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">&gt;</button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500">
                <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
            </div>
            <div className="grid grid-cols-7 gap-1 mt-2">
                {renderDays()}
            </div>
        </div>
    );
};

type Timeframe = 'daily' | 'weekly' | 'monthly';

const Dashboard: React.FC<{
    tickets?: Ticket[];
    totalConversations?: number;
    activeBotsCount?: number;
    knowledgeSyncedCount?: number;
    knowledgePendingCount?: number;
}> = ({
    tickets = [],
    totalConversations = 0,
    activeBotsCount = 0,
    knowledgeSyncedCount = 0,
    knowledgePendingCount = 0,
}) => {
    const [timeframe, setTimeframe] = useState<Timeframe>('weekly');
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    const chartDetails = useMemo(() => {
        // Real data only: we don’t have a conversation log yet.
        // Use ticket count per day as the proxy for inbound interactions.
        const weekly = buildWeeklyFromTickets(tickets);

        if (selectedDate) {
            const k = ymd(selectedDate).slice(5);
            const d = weekly.find((x) => x.name === k);
            return {
                title: `Tickets for ${selectedDate.toLocaleDateString()}`,
                data: [{ name: k, conversations: d?.conversations || 0 }],
                activeFilter: selectedDate.toISOString(),
            };
        }

        return { title: 'Tickets (Last 7 days)', data: weekly, activeFilter: 'weekly' };
    }, [tickets, selectedDate]);
    
    const handleTimeframeChange = (newTimeframe: Timeframe) => {
        setTimeframe(newTimeframe);
        setSelectedDate(null);
    };

    const handleDateSelect = (date: Date) => {
        setSelectedDate(date);
        setIsCalendarOpen(false);
    };

    const TimeframeButton: React.FC<{ filter: Timeframe | string; label: string; }> = ({ filter, label }) => {
        const isActive = chartDetails.activeFilter === filter;
        return (
            <button
                onClick={() => handleTimeframeChange(filter as Timeframe)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    isActive
                      ? 'bg-[#0A2A1F] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
                {label}
            </button>
        );
    }

    const openTickets = tickets.filter(t => t.status === 'open' || t.status === 'in_progress');
    const highPriorityOpen = openTickets.filter(t => t.priority === 'high');

    return (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 items-stretch">
                <StatCard 
                    icon={<UsersIcon className="w-6 h-6" />} 
                    title="Total Conversations" 
                    value={Number(totalConversations).toLocaleString()}
                    description="Total across all bots"
                />
                <StatCard 
                    icon={<ChatbotIcon className="w-6 h-6" />} 
                    title="Active Bots" 
                    value={String(activeBotsCount)}
                    description="Currently active"
                />
                <StatCard 
                    icon={<TicketsIcon className="w-6 h-6" />} 
                    title="Open Tickets" 
                    value={String(openTickets.length)}
                    description={highPriorityOpen.length ? `${highPriorityOpen.length} high priority` : 'No high priority'}
                />
                 <StatCard 
                    icon={<KnowledgeIcon className="w-6 h-6" />} 
                    title="Knowledge Sources" 
                    value={String(knowledgeSyncedCount + knowledgePendingCount)}
                    description={`${knowledgeSyncedCount} synced • ${knowledgePendingCount} pending`}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                     <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{chartDetails.title}</h3>
                        <div className="flex items-center gap-2 relative">
                            <TimeframeButton filter="weekly" label="Last 7 days" />
                            <button 
                                onClick={() => setIsCalendarOpen(prev => !prev)}
                                className={`p-2 rounded-lg transition-colors ${isCalendarOpen || selectedDate ? 'bg-[#0A2A1F] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                            >
                                <CalendarIcon className="w-4 h-4" />
                            </button>
                            {isCalendarOpen && <CalendarPopover onSelectDate={handleDateSelect} onClose={() => setIsCalendarOpen(false)} />}
                        </div>
                     </div>
                     <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                                data={chartDetails.data}
                                margin={{
                                    top: 5, right: 30, left: 20, bottom: 5,
                                }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-20" />
                                <XAxis dataKey="name" stroke="currentColor" />
                                <YAxis stroke="currentColor" />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'rgba(31, 41, 55, 0.8)',
                                        borderColor: 'rgba(55, 65, 81, 1)',
                                        borderRadius: '0.5rem',
                                        color: '#ffffff'
                                    }}
                                    itemStyle={{ color: '#ffffff' }}
                                    cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}
                                />
                                <Legend />
                                <Line type="monotone" dataKey="conversations" name="Conversations" stroke="#C79A2A" strokeWidth={3} activeDot={{ r: 8 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
                <Card>
                    <h3 className="font-extrabold text-gray-900 mb-4 tracking-tight">Recent Tickets</h3>
                    <ul className="space-y-4">
                        {tickets.slice().sort((a, b) => (b.lastUpdate || '').localeCompare(a.lastUpdate || '')).slice(0, 4).map(ticket => (
                            <li key={ticket.id} className="flex items-start">
                                <div className="p-2 mr-3 text-sm text-lpc-gold bg-lpc-gold/10 rounded-2xl ring-1 ring-lpc-gold/15">
                                    <TicketsIcon className="w-5 h-5"/>
                                </div>
                                <div className="min-w-0">
                                    <p className="font-semibold text-gray-900 dark:text-white truncate">{ticket.subject}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                        {ticket.customerName} · <span className="capitalize">{ticket.status?.replace('_', ' ')}</span>
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>
                    {tickets.length === 0 ? (
                      <div className="text-sm text-gray-500 dark:text-gray-400">No tickets yet.</div>
                    ) : null}
                </Card>
            </div>
        </div>
    );
};

export default Dashboard;
