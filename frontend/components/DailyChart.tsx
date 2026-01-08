'use client';

import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList } from 'recharts';
import { Trade } from '@/lib/types';
import { Calendar } from 'lucide-react';
import AIAnalyzeButton from './AIAnalyzeButton';

interface DailyChartProps {
    trades: Trade[];
    isDark?: boolean;
}

interface DayData {
    day: string;
    dayNum: number;
    winners: number;
    losers: number;
    total: number;
    netProfit: number;
}

export default function DailyChart({ trades, isDark = true }: DailyChartProps) {
    const dailyData = useMemo(() => {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        // Initialize weekdays (Mon-Fri)
        const days: DayData[] = [1, 2, 3, 4, 5].map(i => ({
            day: dayNames[i],
            dayNum: i,
            winners: 0,
            losers: 0,
            total: 0,
            netProfit: 0
        }));

        // Count trades by day of week
        trades.forEach(trade => {
            const tradeDate = new Date(trade.time);
            const dayOfWeek = tradeDate.getDay();

            // Only weekdays (Mon=1 to Fri=5)
            if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                const dayIndex = dayOfWeek - 1;
                days[dayIndex].total++;
                days[dayIndex].netProfit += trade.net_profit;

                if (trade.net_profit > 0) {
                    days[dayIndex].winners++;
                } else if (trade.net_profit < 0) {
                    days[dayIndex].losers++;
                }
            }
        });

        return days;
    }, [trades]);

    const colors = {
        winners: '#a3e635', // lime-400 (like Myfxbook)
        losers: '#c084fc', // purple-400 (like Myfxbook)
        grid: isDark ? '#334155' : '#f1f5f9',
        text: isDark ? '#64748b' : '#94a3b8',
        tooltipBg: isDark ? '#1e293b' : '#ffffff',
    };

    // Styles
    const containerClass = isDark
        ? 'bg-slate-900/50 border border-slate-800/50'
        : 'bg-white border border-gray-100 shadow-sm';
    const textClass = isDark ? 'text-slate-200' : 'text-gray-800';
    const mutedClass = isDark ? 'text-slate-400' : 'text-gray-500';

    const maxTotal = Math.max(...dailyData.map(d => d.total), 1);

    return (
        <div className={`rounded-2xl p-6 ${containerClass}`}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Calendar size={18} className="text-purple-500" />
                    <h3 className={`font-semibold ${textClass}`}>Winners vs Losers by Day</h3>
                </div>
                <AIAnalyzeButton
                    sectionName="Winners vs Losers by Day"
                    sectionData={dailyData}
                    isDark={isDark}
                />
            </div>

            <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyData} margin={{ top: 30, right: 10, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
                        <XAxis
                            dataKey="day"
                            stroke={colors.text}
                            tick={{ fill: colors.text, fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                            label={{ value: 'Day', position: 'insideBottom', offset: -5, fill: colors.text }}
                        />
                        <YAxis
                            stroke={colors.text}
                            tick={{ fill: colors.text, fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                            allowDecimals={false}
                        />
                        <Tooltip
                            cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const data = payload[0].payload as DayData;
                                    return (
                                        <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                                            <p className={`text-sm font-medium ${textClass}`}>{data.day}</p>
                                            <div className="mt-2 space-y-1">
                                                <p className="text-lime-400 text-sm">Winners: {data.winners}</p>
                                                <p className="text-purple-400 text-sm">Losers: {data.losers}</p>
                                                <p className={`text-sm font-medium ${data.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    Net: {data.netProfit >= 0 ? '+' : ''}${data.netProfit.toFixed(2)}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Legend
                            wrapperStyle={{ paddingTop: '10px' }}
                            formatter={(value) => <span className={mutedClass}>{value}</span>}
                        />
                        <Bar
                            dataKey="winners"
                            stackId="a"
                            fill={colors.winners}
                            name="Winners"
                        >
                            <LabelList
                                dataKey="total"
                                position="top"
                                fill={colors.text}
                                fontSize={11}
                            />
                        </Bar>
                        <Bar
                            dataKey="losers"
                            stackId="a"
                            fill={colors.losers}
                            name="Losers"
                            radius={[4, 4, 0, 0]}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
