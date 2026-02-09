
import React, { useState, useMemo, useRef, useEffect } from 'react';
import Card from './ui/Card';
import { ChatbotIcon } from './icons/ChatbotIcon';
import { TicketsIcon } from './icons/TicketsIcon';
import { KnowledgeIcon } from './icons/KnowledgeIcon';
import { UsersIcon } from './icons/UsersIcon';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import type { Ticket } from '../types';
import { CalendarIcon } from './icons/CalendarIcon';

// --- Mock Data for different timeframes ---
const weeklyData = [
  { name: 'Mon', conversations: 400 },
  { name: 'Tue', conversations: 300 },
  { name: 'Wed', conversations: 200 },
  { name: 'Thu', conversations: 278 },
  { name: 'Fri', conversations: 189 },
  { name: 'Sat', conversations: 239 },
  { name: 'Sun', conversations: 349 },
];

const dailyData = [
    { name: '12am', conversations: 10 }, { name: '3am', conversations: 15 },
    { name: '6am', conversations: 30 }, { name: '9am', conversations: 80 },
    { name: '12pm', conversations: 120 }, { name: '3pm', conversations: 100 },
    { name: '6pm', conversations: 90 }, { name: '9pm', conversations: 40 },
];

const monthlyData = [
    { name: 'Week 1', conversations: 1200 }, { name: 'Week 2', conversations: 1500 },
    { name: 'Week 3', conversations: 1100 }, { name: 'Week 4', conversations: 1800 },
];

const hourlyDataForDay = [
    { name: '1am', conversations: 5 }, { name: '2am', conversations: 3 },
    { name: '3am', conversations: 7 }, { name: '4am', conversations: 4 },
    { name: '5am', conversations: 10 }, { name: '6am', conversations: 15 },
    { name: '7am', conversations: 25 }, { name: '8am', conversations: 40 },
    { name: '9am', conversations: 60 }, { name: '10am', conversations: 75 },
    { name: '11am', conversations: 80 }, { name: '12pm', conversations: 90 },
];


const mockRecentTickets: Pick<Ticket, 'id' | 'customerName' | 'subject' | 'status'>[] = [];

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
                        isToday ? 'bg-blue-600 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-600'
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
        if (selectedDate) {
            return {
                title: `Conversations for ${selectedDate.toLocaleDateString()}`,
                data: hourlyDataForDay,
                activeFilter: selectedDate.toISOString(),
            };
        }
        switch (timeframe) {
            case 'daily': return { title: 'Conversations Today', data: dailyData, activeFilter: 'daily' };
            case 'monthly': return { title: 'Conversations This Month', data: monthlyData, activeFilter: 'monthly' };
            case 'weekly':
            default: return { title: 'Conversations This Week', data: weeklyData, activeFilter: 'weekly' };
        }
    }, [timeframe, selectedDate]);
    
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
                            <TimeframeButton filter="daily" label="Daily" />
                            <TimeframeButton filter="weekly" label="Weekly" />
                            <TimeframeButton filter="monthly" label="Monthly" />
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
