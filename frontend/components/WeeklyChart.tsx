'use client';

import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Trade } from '@/lib/types';

interface WeeklyChartProps {
    trades: Trade[];
    isDark?: boolean;
}

interface DayData {
    day: string;
    dayFull: string;
    date: string;
    profit: number;
    trades: number;
}

export default function WeeklyChart({ trades, isDark = true }: WeeklyChartProps) {
    // Calculate weekly data
    const weeklyData = useMemo(() => {
        const today = new Date();
        const dayOfWeek = today.getDay();

        // Find Monday of current week (adjust for Sunday = 0)
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(today);
        monday.setDate(today.getDate() + mondayOffset);
        monday.setHours(0, 0, 0, 0);

        const days: DayData[] = [];
        const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const dayNamesFull = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

        for (let i = 0; i < 7; i++) {
            const currentDay = new Date(monday);
            currentDay.setDate(monday.getDate() + i);

            const nextDay = new Date(currentDay);
            nextDay.setDate(currentDay.getDate() + 1);

            // Filter trades for this day
            const dayTrades = trades.filter(t => {
                const tradeDate = new Date(t.time);
                return tradeDate >= currentDay && tradeDate < nextDay;
            });

            const profit = dayTrades.reduce((sum, t) => sum + t.net_profit, 0);

            days.push({
                day: dayNames[i],
                dayFull: dayNamesFull[i],
                date: currentDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                profit: profit,
                trades: dayTrades.length
            });
        }

        return days;
    }, [trades]);

    const colors = {
        positive: '#10b981', // emerald-500
        negative: '#f43f5e', // rose-500
        grid: isDark ? '#334155' : '#f1f5f9',
        text: isDark ? '#64748b' : '#94a3b8',
        tooltipBg: isDark ? '#1e293b' : '#ffffff',
        tooltipBorder: isDark ? '#334155' : '#e2e8f0',
        tooltipText: isDark ? '#f8fafc' : '#0f172a',
        neutral: isDark ? '#475569' : '#94a3b8',
    };

    const hasAnyTrades = weeklyData.some(d => d.trades > 0);

    if (!hasAnyTrades) {
        return (
            <div className={`flex flex-col items-center justify-center h-80 rounded-2xl ${isDark ? 'bg-slate-900/50 border border-slate-800/50' : 'bg-white border border-gray-100'}`}>
                <p className="text-slate-500 text-sm">No trades this week</p>
            </div>
        );
    }

    return (
        <div className={`w-full h-80 rounded-2xl p-4 ${isDark ? 'bg-slate-900/50 border border-slate-800/50' : 'bg-white border border-gray-100 shadow-sm'}`}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} margin={{ top: 20, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
                    <XAxis
                        dataKey="day"
                        stroke={colors.text}
                        tick={{ fill: colors.text, fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        stroke={colors.text}
                        tick={{ fill: colors.text, fontSize: 10 }}
                        tickFormatter={(v) => `$${v}`}
                        tickLine={false}
                        axisLine={false}
                    />
                    <Tooltip
                        cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}
                        contentStyle={{
                            backgroundColor: colors.tooltipBg,
                            border: `1px solid ${colors.tooltipBorder}`,
                            borderRadius: '12px',
                            color: colors.tooltipText,
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        }}
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const data = payload[0].payload as DayData;
                                // Calculate percentage (assuming $10000 base or use first day's start)
                                const pct = (data.profit / 10000) * 100;
                                return (
                                    <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                                        <p className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>
                                            {data.dayFull}, {data.date}
                                        </p>
                                        <p className={`text-lg font-bold ${data.profit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            {data.profit >= 0 ? '+' : ''}${data.profit.toFixed(2)}
                                            <span className="text-sm ml-1">
                                                ({pct >= 0 ? '+' : ''}{pct.toFixed(2)}%)
                                            </span>
                                        </p>
                                        <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                                            {data.trades} trade{data.trades !== 1 ? 's' : ''}
                                        </p>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                    <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
                        {weeklyData.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={
                                    entry.trades === 0
                                        ? colors.neutral
                                        : entry.profit >= 0
                                            ? colors.positive
                                            : colors.negative
                                }
                                opacity={entry.trades === 0 ? 0.3 : 1}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
