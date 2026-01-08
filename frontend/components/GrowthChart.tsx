'use client';

import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Trade } from '@/lib/types';

interface GrowthChartProps {
    trades: Trade[];
    initialBalance: number;
    isDark?: boolean;
}

export default function GrowthChart({ trades, initialBalance, isDark = true }: GrowthChartProps) {
    const data = React.useMemo(() => {
        if (!trades.length) return [];
        let balance = initialBalance;
        return trades.map((trade) => {
            balance += trade.net_profit;
            const gain = ((balance - initialBalance) / initialBalance) * 100;
            return {
                date: new Date(trade.time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                fullDate: new Date(trade.time).toLocaleDateString(),
                gain: parseFloat(gain.toFixed(2))
            };
        });
    }, [trades, initialBalance]);

    if (!data.length) {
        return (
            <div className={`flex flex-col items-center justify-center h-80 rounded-2xl ${isDark ? 'bg-slate-900/50 border border-slate-800/50' : 'bg-white border border-gray-100'}`}>
                <p className="text-slate-500 text-sm">No growth data available</p>
            </div>
        );
    }

    const colors = {
        stroke: '#10b981', // emerald-500
        fillStart: '#10b981',
        grid: isDark ? '#334155' : '#f1f5f9',
        text: isDark ? '#64748b' : '#94a3b8',
        tooltipBg: isDark ? '#1e293b' : '#ffffff',
        tooltipBorder: isDark ? '#334155' : '#e2e8f0',
        tooltipText: isDark ? '#f8fafc' : '#0f172a',
    };

    return (
        <div className={`w-full h-80 rounded-2xl p-4 ${isDark ? 'bg-slate-900/50 border border-slate-800/50' : 'bg-white border border-gray-100 shadow-sm'}`}>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorGain" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={colors.fillStart} stopOpacity={0.2} />
                            <stop offset="95%" stopColor={colors.fillStart} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
                    <XAxis
                        dataKey="date"
                        stroke={colors.text}
                        tick={{ fill: colors.text, fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        minTickGap={30}
                    />
                    <YAxis
                        stroke={colors.text}
                        tick={{ fill: colors.text, fontSize: 10 }}
                        tickFormatter={(v) => `${v}%`}
                        tickLine={false}
                        axisLine={false}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: colors.tooltipBg,
                            border: `1px solid ${colors.tooltipBorder}`,
                            borderRadius: '12px',
                            color: colors.tooltipText,
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        }}
                        labelStyle={{ color: colors.text, marginBottom: '0.25rem', fontSize: '11px' }}
                        formatter={(value: number) => [<span className="font-bold text-emerald-500">+{value.toFixed(2)}%</span>, 'Gain']}
                    />
                    <Area
                        type="monotone"
                        dataKey="gain"
                        stroke={colors.stroke}
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorGain)"
                        activeDot={{ r: 4, strokeWidth: 0, fill: '#fff' }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
