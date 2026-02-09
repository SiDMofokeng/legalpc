import React from 'react';
import Card from './ui/Card';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

const ticketStatusData = [
  { name: 'Resolved', value: 400 },
  { name: 'Open', value: 150 },
  { name: 'In Progress', value: 75 },
];

const conversationSourceData = [
  { subject: 'Pricing', A: 120, B: 110, fullMark: 150 },
  { subject: 'Support', A: 98, B: 130, fullMark: 150 },
  { subject: 'Sales', A: 86, B: 130, fullMark: 150 },
  { subject: 'Onboarding', A: 99, B: 100, fullMark: 150 },
  { subject: 'Other', A: 85, B: 90, fullMark: 150 },
];

const COLORS = ['#C79A2A', '#F08A24', '#0A2A1F'];

// Custom label renderer for the Pie chart
const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize="16px"
      fontWeight="bold"
      style={{ textShadow: '0px 1px 3px rgba(0, 0, 0, 0.5)' }}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};


const Analytics: React.FC = () => {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <Card className="lg:col-span-2 h-96" noClip>
                    <h3 className="font-extrabold text-gray-900 dark:text-white mb-4 tracking-tight">Ticket Status</h3>
                    <ResponsiveContainer width="100%" height="90%">
                        <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                            <Pie
                                data={ticketStatusData}
                                cx="45%"
                                cy="50%"
                                labelLine={false}
                                label={renderCustomizedLabel}
                                outerRadius={110}
                                fill="#C79A2A"
                                dataKey="value"
                            >
                                {ticketStatusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'rgba(11, 15, 20, 0.8)',
                                    borderColor: 'rgba(255, 255, 255, 0.12)',
                                    borderRadius: '0.75rem'
                                }}
                            />
                            <Legend 
                                layout="vertical" 
                                verticalAlign="middle" 
                                align="right"
                                iconType="circle"
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </Card>
                <Card className="lg:col-span-3 h-96" noClip>
                    <h3 className="font-extrabold text-gray-900 dark:text-white mb-4 tracking-tight">Conversation Topics</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="52%" outerRadius="72%" data={conversationSourceData}>
                            <PolarGrid />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#6b7280', fontSize: 12 }} />
                            <PolarRadiusAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                            <Radar name="This Month" dataKey="A" stroke="#F08A24" fill="#F08A24" fillOpacity={0.55} />
                             <Tooltip
                                contentStyle={{
                                    backgroundColor: 'rgba(11, 15, 20, 0.8)',
                                    borderColor: 'rgba(255, 255, 255, 0.12)',
                                    borderRadius: '0.75rem'
                                }}
                            />
                        </RadarChart>
                    </ResponsiveContainer>
                </Card>
            </div>
            
            <Card>
                <h3 className="font-extrabold text-lg mb-4 text-gray-900 dark:text-white tracking-tight">Conversation Logs</h3>
                <div className="p-4 border border-black/5 dark:border-white/10 rounded-xl">
                    <p className="text-gray-600 dark:text-gray-400">Full conversation logs with filtering and export options will live here (export, filters, time ranges).</p>
                </div>
            </Card>
        </div>
    );
};

export default Analytics;