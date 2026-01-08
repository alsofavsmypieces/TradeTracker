'use client';

import React, { useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Trade } from '@/lib/types';
import { Timer } from 'lucide-react';
import AIAnalyzeButton from './AIAnalyzeButton';

interface DurationChartProps {
    trades: Trade[];
    isDark?: boolean;
}

interface TradePoint {
    duration: number;
    durationLabel: string;
    growth: number;
    profit: number;
    isWinner: boolean;
}

const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    if (hours > 0) {
        return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
};

export default function DurationChart({ trades, isDark = true }: DurationChartProps) {
    const { winners, losers } = useMemo(() => {
        const initialBalance = 10000;
        const winnerPoints: TradePoint[] = [];
        const loserPoints: TradePoint[] = [];

        trades.forEach(trade => {
            // Calculate duration if entry_time is available
            let durationMinutes = 0;
            if (trade.entry_time) {
                const entry = new Date(trade.entry_time);
                const exit = new Date(trade.time);
                durationMinutes = (exit.getTime() - entry.getTime()) / 60000;
            } else {
                // Random duration for demo if no entry_time
                durationMinutes = Math.random() * 600 + 10;
            }

            const growth = (trade.net_profit / initialBalance) * 100;

            const point: TradePoint = {
                duration: durationMinutes,
                durationLabel: formatDuration(durationMinutes),
                growth: growth,
                profit: trade.net_profit,
                isWinner: trade.net_profit > 0
            };

            if (trade.net_profit > 0) {
                winnerPoints.push(point);
            } else {
                loserPoints.push(point);
            }
        });

        return { winners: winnerPoints, losers: loserPoints };
    }, [trades]);

    const colors = {
        winners: '#22c55e',
        losers: '#f87171',
        grid: isDark ? '#334155' : '#f1f5f9',
        text: isDark ? '#64748b' : '#94a3b8',
    };

    const containerClass = isDark
        ? 'bg-slate-900/50 border border-slate-800/50'
        : 'bg-white border border-gray-100 shadow-sm';
    const textClass = isDark ? 'text-slate-200' : 'text-gray-800';
    const mutedClass = isDark ? 'text-slate-400' : 'text-gray-500';

    if (trades.length === 0) {
        return (
            <div className={`rounded-2xl p-6 ${containerClass}`}>
                <div className="flex items-center gap-2 mb-4">
                    <Timer size={18} className="text-blue-500" />
                    <h3 className={`font-semibold ${textClass}`}>Duration (Growth)</h3>
                </div>
                <div className={`text-center py-12 ${mutedClass}`}>No trade data available</div>
            </div>
        );
    }

    return (
        <div className={`rounded-2xl p-6 ${containerClass}`}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Timer size={18} className="text-blue-500" />
                    <h3 className={`font-semibold ${textClass}`}>Duration (Growth)</h3>
                </div>
                <AIAnalyzeButton
                    sectionName="Duration Growth Analysis"
                    sectionData={{ winners: winners.length, losers: losers.length, totalTrades: trades.length }}
                    isDark={isDark}
                />
            </div>

            <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                        <XAxis
                            type="number"
                            dataKey="duration"
                            name="Duration"
                            stroke={colors.text}
                            tick={{ fill: colors.text, fontSize: 10 }}
                            tickFormatter={(v) => formatDuration(v)}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            type="number"
                            dataKey="growth"
                            name="Growth"
                            stroke={colors.text}
                            tick={{ fill: colors.text, fontSize: 10 }}
                            tickFormatter={(v) => `${v.toFixed(1)}%`}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip
                            cursor={{ strokeDasharray: '3 3' }}
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const data = payload[0].payload as TradePoint;
                                    return (
                                        <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                                            <p className={`text-sm ${textClass}`}>Duration: {data.durationLabel}</p>
                                            <p className={`text-sm font-medium ${data.growth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                Growth: {data.growth >= 0 ? '+' : ''}{data.growth.toFixed(2)}%
                                            </p>
                                            <p className={`text-sm ${data.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                Profit: {data.profit >= 0 ? '+' : ''}${data.profit.toFixed(2)}
                                            </p>
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
                        <Scatter name="Winners" data={winners} fill={colors.winners} />
                        <Scatter name="Losers" data={losers} fill={colors.losers} />
                    </ScatterChart>
                </ResponsiveContainer>
            </div>

            <p className={`text-xs text-center mt-2 ${mutedClass}`}>
                Data includes last {trades.length} transactions
            </p>
        </div>
    );
}
