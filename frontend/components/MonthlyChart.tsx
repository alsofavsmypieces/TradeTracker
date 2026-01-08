'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { MonthlyReturn } from '@/lib/types';

interface MonthlyChartProps {
    data: MonthlyReturn[];
    isDark?: boolean;
}

export default function MonthlyChart({ data, isDark = true }: MonthlyChartProps) {
    if (!data.length) {
        return (
            <div className={`flex flex-col items-center justify-center h-80 rounded-2xl ${isDark ? 'bg-slate-900/50 border border-slate-800/50' : 'bg-white border border-gray-100'}`}>
                <p className="text-slate-500 text-sm">No monthly data available</p>
            </div>
        );
    }

    const colors = {
        positive: '#10b981', // emerald-500
        negative: '#f43f5e', // rose-500
        grid: isDark ? '#334155' : '#f1f5f9',
        text: isDark ? '#64748b' : '#94a3b8',
        tooltipBg: isDark ? '#1e293b' : '#ffffff',
        tooltipBorder: isDark ? '#334155' : '#e2e8f0',
        tooltipText: isDark ? '#f8fafc' : '#0f172a',
    };

    return (
        <div className={`w-full h-80 rounded-2xl p-4 ${isDark ? 'bg-slate-900/50 border border-slate-800/50' : 'bg-white border border-gray-100 shadow-sm'}`}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
                    <XAxis
                        dataKey="period"
                        stroke={colors.text}
                        tick={{ fill: colors.text, fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        stroke={colors.text}
                        tick={{ fill: colors.text, fontSize: 10 }}
                        tickFormatter={(v) => `${v}%`}
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
                        formatter={(value: any) => [
                            <span className={Number(value) >= 0 ? "text-emerald-500 font-bold" : "text-rose-500 font-bold"}>
                                {Number(value) > 0 ? '+' : ''}{Number(value).toFixed(2)}%
                            </span>,
                            'Return'
                        ]}
                    />
                    <Bar dataKey="gain_pct" radius={[4, 4, 0, 0]}>
                        {data.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={entry.gain_pct >= 0 ? colors.positive : colors.negative}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
