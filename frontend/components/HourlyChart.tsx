'use client';

import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Trade } from '@/lib/types';
import { Clock } from 'lucide-react';
import AIAnalyzeButton from './AIAnalyzeButton';

interface HourlyChartProps {
    trades: Trade[];
    isDark?: boolean;
    timezoneOffset?: number; // Hours offset from GMT
}

interface HourData {
    hour: number;
    hourLabel: string;
    winners: number;
    losers: number;
    total: number;
    netProfit: number;
}

export default function HourlyChart({ trades, isDark = true, timezoneOffset = 0 }: HourlyChartProps) {
    const hourlyData = useMemo(() => {
        // Initialize all 24 hours
        const hours: HourData[] = Array.from({ length: 24 }, (_, i) => ({
            hour: i,
            hourLabel: i.toString(),
            winners: 0,
            losers: 0,
            total: 0,
            netProfit: 0
        }));

        // Count trades by hour (with timezone adjustment)
        trades.forEach(trade => {
            const tradeDate = new Date(trade.time);
            // Apply timezone offset
            let hour = (tradeDate.getUTCHours() + timezoneOffset) % 24;
            if (hour < 0) hour += 24;

            hours[hour].total++;
            hours[hour].netProfit += trade.net_profit;

            if (trade.net_profit > 0) {
                hours[hour].winners++;
            } else if (trade.net_profit < 0) {
                hours[hour].losers++;
            }
        });

        // Filter to only show hours with trades
        return hours.filter(h => h.total > 0);
    }, [trades, timezoneOffset]);

    const colors = {
        winners: '#22c55e', // green-500
        losers: '#a855f7', // purple-500 (like Myfxbook)
        grid: isDark ? '#334155' : '#f1f5f9',
        text: isDark ? '#64748b' : '#94a3b8',
        tooltipBg: isDark ? '#1e293b' : '#ffffff',
        tooltipBorder: isDark ? '#334155' : '#e2e8f0',
    };

    // Styles
    const containerClass = isDark
        ? 'bg-slate-900/50 border border-slate-800/50'
        : 'bg-white border border-gray-100 shadow-sm';
    const textClass = isDark ? 'text-slate-200' : 'text-gray-800';
    const mutedClass = isDark ? 'text-slate-400' : 'text-gray-500';

    if (hourlyData.length === 0) {
        return (
            <div className={`rounded-2xl p-6 ${containerClass}`}>
                <div className="flex items-center gap-2 mb-4">
                    <Clock size={18} className="text-purple-500" />
                    <h3 className={`font-semibold ${textClass}`}>Winners vs Losers by Hour</h3>
                </div>
                <div className="flex items-center justify-center h-64">
                    <p className={mutedClass}>No trade data available</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`rounded-2xl p-6 ${containerClass}`}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Clock size={18} className="text-purple-500" />
                    <h3 className={`font-semibold ${textClass}`}>Winners vs Losers by Hour</h3>
                </div>
                <AIAnalyzeButton
                    sectionName="Winners vs Losers by Hour"
                    sectionData={hourlyData}
                    isDark={isDark}
                />
            </div>

            <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hourlyData} margin={{ top: 20, right: 10, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
                        <XAxis
                            dataKey="hourLabel"
                            stroke={colors.text}
                            tick={{ fill: colors.text, fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                            label={{ value: 'Hour', position: 'insideBottom', offset: -5, fill: colors.text }}
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
                            contentStyle={{
                                backgroundColor: colors.tooltipBg,
                                border: `1px solid ${colors.tooltipBorder}`,
                                borderRadius: '12px',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                            }}
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const data = payload[0].payload as HourData;
                                    return (
                                        <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                                            <p className={`text-sm font-medium ${textClass}`}>
                                                Hour: {data.hour}:00 - {data.hour}:59
                                            </p>
                                            <div className="mt-2 space-y-1">
                                                <p className="text-emerald-400 text-sm">
                                                    Winners: {data.winners}
                                                </p>
                                                <p className="text-purple-400 text-sm">
                                                    Losers: {data.losers}
                                                </p>
                                                <p className={`text-sm ${data.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
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
                            formatter={(value) => (
                                <span className={mutedClass}>{value}</span>
                            )}
                        />
                        <Bar
                            dataKey="winners"
                            stackId="a"
                            fill={colors.winners}
                            name="Winners"
                            radius={[0, 0, 0, 0]}
                        />
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
