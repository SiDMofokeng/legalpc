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

const COLORS = ['#10B981', '#F59E0B', '#3B82F6'];

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
                <Card className="lg:col-span-2 h-96">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Ticket Status</h3>
                    <ResponsiveContainer width="100%" height="90%">
                        <PieChart>
                            <Pie
                                data={ticketStatusData}
                                cx="40%"
                                cy="50%"
                                labelLine={false}
                                label={renderCustomizedLabel}
                                outerRadius={120}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {ticketStatusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'rgba(31, 41, 55, 0.8)',
                                    borderColor: 'rgba(55, 65, 81, 1)',
                                    borderRadius: '0.5rem'
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
                <Card className="lg:col-span-3 h-96">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Conversation Topics</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={conversationSourceData}>
                            <PolarGrid />
                            <PolarAngleAxis dataKey="subject" />
                            <PolarRadiusAxis />
                            <Radar name="This Month" dataKey="A" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                             <Tooltip
                                contentStyle={{
                                    backgroundColor: 'rgba(31, 41, 55, 0.8)',
                                    borderColor: 'rgba(55, 65, 81, 1)',
                                    borderRadius: '0.5rem'
                                }}
                            />
                        </RadarChart>
                    </ResponsiveContainer>
                </Card>
            </div>
            
            <Card>
                <h3 className="font-semibold text-lg mb-4 text-gray-900 dark:text-white">Conversation Logs</h3>
                {/* A real app would have a detailed log table here. This is a placeholder. */}
                <div className="p-4 border rounded-lg dark:border-gray-700">
                    <p className="text-gray-600 dark:text-gray-400">Full conversation logs with filtering and export options would be displayed here.</p>
                </div>
            </Card>
        </div>
    );
};

export default Analytics;