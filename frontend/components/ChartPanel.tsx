'use client';

import React, { useState, useMemo } from 'react';
import {
    ComposedChart,
    Line,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    ReferenceLine,
    Area,
    Cell
} from 'recharts';
import { Trade } from '@/lib/types';
import { TrendingUp, Wallet, AlertTriangle, BarChart3 } from 'lucide-react';

interface ChartPanelProps {
    trades: Trade[];
    initialBalance: number;
    isDark?: boolean;
    timezoneOffset?: number;
}

type ChartTab = 'growth' | 'balance' | 'profit' | 'drawdown';

interface DayData {
    date: string;
    dateDisplay: string;
    profit: number;
    balance: number;
    growth: number;
    equityGrowth: number;
    drawdown: number;
    isProfit: boolean;
}

export default function ChartPanel({
    trades,
    initialBalance,
    isDark = true,
    timezoneOffset = 0
}: ChartPanelProps) {
    const [activeTab, setActiveTab] = useState<ChartTab>('growth');

    const chartData = useMemo(() => {
        if (trades.length === 0) return [];

        // Group trades by day
        const byDay: { [key: string]: { profit: number; trades: Trade[] } } = {};

        trades.forEach(trade => {
            const tradeDate = new Date(trade.time);
            tradeDate.setHours(tradeDate.getHours() + timezoneOffset);
            const dateKey = tradeDate.toISOString().split('T')[0];

            if (!byDay[dateKey]) {
                byDay[dateKey] = { profit: 0, trades: [] };
            }
            byDay[dateKey].profit += trade.net_profit;
            byDay[dateKey].trades.push(trade);
        });

        const sortedDates = Object.keys(byDay).sort();
        let cumProfit = 0;
        let balance = initialBalance;
        let peakBalance = initialBalance;

        const data: DayData[] = sortedDates.map(date => {
            cumProfit += byDay[date].profit;
            balance = initialBalance + cumProfit;
            peakBalance = Math.max(peakBalance, balance);

            const drawdown = peakBalance > 0
                ? ((peakBalance - balance) / peakBalance) * 100
                : 0;

            const growth = initialBalance > 0
                ? (cumProfit / initialBalance) * 100
                : 0;

            return {
                date,
                dateDisplay: new Date(date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: '2-digit'
                }),
                profit: byDay[date].profit,
                balance,
                growth,
                equityGrowth: growth * 0.95,
                drawdown,
                isProfit: byDay[date].profit >= 0
            };
        });

        return data;
    }, [trades, initialBalance, timezoneOffset]);

    const colors = {
        growth: '#f97316',
        equityGrowth: '#fbbf24',
        profit: '#22c55e',
        loss: '#ef4444',
        drawdown: '#f87171',
        balance: '#3b82f6',
        grid: isDark ? '#334155' : '#f1f5f9',
        text: isDark ? '#64748b' : '#94a3b8',
    };

    const containerClass = isDark
        ? 'bg-slate-900/50 border border-slate-800/50'
        : 'bg-white border border-gray-100 shadow-sm';
    const textClass = isDark ? 'text-slate-200' : 'text-gray-800';
    const mutedClass = isDark ? 'text-slate-400' : 'text-gray-500';

    const tabs: { id: ChartTab; label: string; icon: React.ReactNode }[] = [
        { id: 'growth', label: 'Growth', icon: <TrendingUp size={14} /> },
        { id: 'balance', label: 'Balance', icon: <Wallet size={14} /> },
        { id: 'profit', label: 'Profit', icon: <BarChart3 size={14} /> },
        { id: 'drawdown', label: 'Drawdown', icon: <AlertTriangle size={14} /> },
    ];

    const renderChart = () => {
        switch (activeTab) {
            case 'growth':
                return (
                    <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
                        <XAxis
                            dataKey="dateDisplay"
                            stroke={colors.text}
                            tick={{ fill: colors.text, fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke={colors.text}
                            tick={{ fill: colors.text, fontSize: 10 }}
                            tickFormatter={(v) => `${v.toFixed(0)}%`}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const data = payload[0].payload as DayData;
                                return (
                                    <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                                        <p className={`text-sm font-medium ${textClass}`}>{data.dateDisplay}</p>
                                        <p className="text-orange-400 text-sm">Growth: {data.growth.toFixed(2)}%</p>
                                        <p className="text-amber-400 text-sm">Equity: {data.equityGrowth.toFixed(2)}%</p>
                                        <p className={`text-sm ${data.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            Daily: {data.profit >= 0 ? '+' : ''}${data.profit.toFixed(2)}
                                        </p>
                                    </div>
                                );
                            }
                            return null;
                        }} />
                        <Legend formatter={(value) => <span className={mutedClass}>{value}</span>} />
                        <ReferenceLine y={0} stroke={colors.text} strokeDasharray="3 3" />
                        {/* Growth lines only - no profit bars to avoid scale issues */}
                        <Line
                            type="monotone"
                            dataKey="equityGrowth"
                            stroke={colors.equityGrowth}
                            strokeWidth={2}
                            dot={false}
                            name="Equity Growth"
                        />
                        <Line
                            type="monotone"
                            dataKey="growth"
                            stroke={colors.growth}
                            strokeWidth={2}
                            dot={{ fill: colors.growth, r: 3 }}
                            name="Growth"
                        />
                    </ComposedChart>
                );

            case 'balance':
                return (
                    <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
                        <XAxis
                            dataKey="dateDisplay"
                            stroke={colors.text}
                            tick={{ fill: colors.text, fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke={colors.text}
                            tick={{ fill: colors.text, fontSize: 10 }}
                            tickFormatter={(v) => `$${(v / 1000).toFixed(1)}K`}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const data = payload[0].payload as DayData;
                                return (
                                    <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                                        <p className={`text-sm font-medium ${textClass}`}>{data.dateDisplay}</p>
                                        <p className="text-blue-400 text-sm">Balance: ${data.balance.toFixed(2)}</p>
                                    </div>
                                );
                            }
                            return null;
                        }} />
                        <Area
                            type="monotone"
                            dataKey="balance"
                            stroke={colors.balance}
                            fill={`${colors.balance}30`}
                            strokeWidth={2}
                            name="Balance"
                        />
                    </ComposedChart>
                );

            case 'profit':
                return (
                    <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
                        <XAxis
                            dataKey="dateDisplay"
                            stroke={colors.text}
                            tick={{ fill: colors.text, fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke={colors.text}
                            tick={{ fill: colors.text, fontSize: 10 }}
                            tickFormatter={(v) => `$${v.toFixed(0)}`}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const data = payload[0].payload as DayData;
                                return (
                                    <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                                        <p className={`text-sm font-medium ${textClass}`}>{data.dateDisplay}</p>
                                        <p className={`text-sm ${data.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            P/L: {data.profit >= 0 ? '+' : ''}${data.profit.toFixed(2)}
                                        </p>
                                    </div>
                                );
                            }
                            return null;
                        }} />
                        <ReferenceLine y={0} stroke={colors.text} strokeDasharray="3 3" />
                        <Bar
                            dataKey="profit"
                            name="Daily Profit"
                            radius={[2, 2, 0, 0]}
                        >
                            {chartData.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.isProfit ? colors.profit : colors.loss}
                                />
                            ))}
                        </Bar>
                    </ComposedChart>
                );

            case 'drawdown':
                return (
                    <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
                        <XAxis
                            dataKey="dateDisplay"
                            stroke={colors.text}
                            tick={{ fill: colors.text, fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke={colors.text}
                            tick={{ fill: colors.text, fontSize: 10 }}
                            tickFormatter={(v) => `${v.toFixed(0)}%`}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const data = payload[0].payload as DayData;
                                return (
                                    <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                                        <p className={`text-sm font-medium ${textClass}`}>{data.dateDisplay}</p>
                                        <p className="text-rose-400 text-sm">Drawdown: {data.drawdown.toFixed(2)}%</p>
                                    </div>
                                );
                            }
                            return null;
                        }} />
                        <Bar
                            dataKey="drawdown"
                            fill={colors.drawdown}
                            name="Drawdown %"
                            radius={[2, 2, 0, 0]}
                        />
                    </ComposedChart>
                );
        }
    };

    if (chartData.length === 0) {
        return (
            <div className={`rounded-2xl p-6 ${containerClass}`}>
                <div className={`text-center py-12 ${mutedClass}`}>No trade data available</div>
            </div>
        );
    }

    return (
        <div className={`rounded-2xl overflow-hidden ${containerClass}`}>
            {/* Tab Header */}
            <div className={`flex items-center gap-1 p-2 border-b ${isDark ? 'border-slate-800 bg-slate-800/30' : 'border-gray-100 bg-gray-50'}`}>
                <span className={`px-3 py-1.5 text-sm font-medium ${textClass}`}>Chart</span>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
                            ? isDark
                                ? 'bg-slate-700 text-white'
                                : 'bg-white text-gray-900 shadow-sm'
                            : isDark
                                ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                            }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Chart */}
            <div className="p-4">
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        {renderChart()}
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
