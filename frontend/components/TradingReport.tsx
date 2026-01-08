'use client';

import React, { useState, useMemo } from 'react';
import { Trade, Stats } from '@/lib/types';
import {
    FileText,
    TrendingUp,
    TrendingDown,
    BarChart3,
    PieChart,
    Shield,
    ArrowUpRight,
    ArrowDownRight,
    Clock,
    Activity,
    Target,
    Zap
} from 'lucide-react';
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    PieChart as RechartsPie,
    Pie,
    Cell,
    Legend,
    ComposedChart,
    CartesianGrid,
    ReferenceLine
} from 'recharts';

type ReportTab = 'summary' | 'pnl' | 'longshort' | 'symbols' | 'risks';

interface TradingReportProps {
    trades: Trade[];
    stats: Stats;
    initialBalance: number;
    isDark?: boolean;
}

// Helper: Format currency
const formatCurrency = (value: number): string => {
    return value >= 0
        ? `$${value.toFixed(2)}`
        : `-$${Math.abs(value).toFixed(2)}`;
};

// Helper: Format currency compact (for small spaces)
const formatCurrencyCompact = (value: number): string => {
    const absVal = Math.abs(value);
    if (absVal >= 1000) {
        return value >= 0 ? `$${(value / 1000).toFixed(1)}K` : `-$${(absVal / 1000).toFixed(1)}K`;
    }
    return value >= 0 ? `$${value.toFixed(0)}` : `-$${absVal.toFixed(0)}`;
};

// Helper: Format percentage
const formatPct = (value: number): string => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
};

// Donut Chart Component
const DonutChart = ({
    grossProfit,
    grossLoss,
    isDark
}: {
    grossProfit: number;
    grossLoss: number;
    isDark: boolean
}) => {
    const total = grossProfit + Math.abs(grossLoss);
    const netPL = grossProfit + grossLoss;
    const data = [
        { name: 'Profit', value: grossProfit, color: '#22c55e' },
        { name: 'Loss', value: Math.abs(grossLoss), color: '#f97316' }
    ];

    return (
        <div className="relative w-48 h-48 mx-auto">
            <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={2}
                        dataKey="value"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                </RechartsPie>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-sm font-bold ${netPL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {netPL >= 0 ? '$' : '-$'}{Math.abs(netPL).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </span>
                <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-400'}`}>Total</span>
            </div>
        </div>
    );
};

// Metric Bar Component
const MetricBar = ({
    label,
    value,
    min,
    max,
    displayValue,
    color = 'indigo',
    isDark
}: {
    label: string;
    value: number;
    min: number;
    max: number;
    displayValue: string;
    color?: string;
    isDark: boolean;
}) => {
    const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
    const colorMap: Record<string, string> = {
        indigo: 'bg-indigo-500',
        emerald: 'bg-emerald-500',
        amber: 'bg-amber-500',
        rose: 'bg-rose-500',
        purple: 'bg-purple-500'
    };

    return (
        <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
                <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{label}</span>
                <span className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>{displayValue}</span>
            </div>
            <div className={`h-2 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
                <div
                    className={`h-full rounded-full ${colorMap[color]}`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
            <div className="flex justify-between mt-1">
                <span className={`text-[10px] ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>{min}</span>
                <span className={`text-[10px] ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>{max}</span>
            </div>
        </div>
    );
};

// Stat Card Component
const StatCard = ({
    label,
    value,
    subValue,
    icon: Icon,
    color,
    isDark
}: {
    label: string;
    value: string;
    subValue?: string;
    icon?: any;
    color?: string;
    isDark: boolean;
}) => (
    <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-800/50' : 'bg-gray-50'}`}>
        <div className="flex items-center gap-2 mb-2">
            {Icon && <Icon size={16} className={color || (isDark ? 'text-slate-400' : 'text-gray-500')} />}
            <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{label}</span>
        </div>
        <div className={`text-lg font-bold ${color || (isDark ? 'text-slate-200' : 'text-gray-800')}`}>{value}</div>
        {subValue && <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{subValue}</div>}
    </div>
);

// Comparison Bar Component
const ComparisonBar = ({
    label,
    longValue,
    shortValue,
    longLabel,
    shortLabel,
    isDark,
    formatFn = (v: number) => v.toFixed(2)
}: {
    label: string;
    longValue: number;
    shortValue: number;
    longLabel?: string;
    shortLabel?: string;
    isDark: boolean;
    formatFn?: (v: number) => string;
}) => {
    const maxVal = Math.max(Math.abs(longValue), Math.abs(shortValue), 0.01);
    const longPct = (Math.abs(longValue) / maxVal) * 50;
    const shortPct = (Math.abs(shortValue) / maxVal) * 50;

    return (
        <div className="mb-4">
            <div className={`text-xs mb-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{label}</div>
            <div className="flex items-center gap-2">
                <div className={`text-xs w-20 text-right ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                    {formatFn(longValue)}
                </div>
                <div className="flex-1 flex h-4 overflow-hidden">
                    <div className={`flex-1 flex justify-end ${isDark ? 'bg-slate-700/50' : 'bg-gray-100'} rounded-l`}>
                        <div
                            className="bg-blue-500 h-full rounded-l"
                            style={{ width: `${longPct}%` }}
                        />
                    </div>
                    <div className={`flex-1 ${isDark ? 'bg-slate-700/50' : 'bg-gray-100'} rounded-r`}>
                        <div
                            className="bg-orange-500 h-full rounded-r"
                            style={{ width: `${shortPct}%` }}
                        />
                    </div>
                </div>
                <div className={`text-xs w-20 ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                    {formatFn(shortValue)}
                </div>
            </div>
        </div>
    );
};

export default function TradingReport({ trades, stats, initialBalance, isDark = true }: TradingReportProps) {
    const [activeTab, setActiveTab] = useState<ReportTab>('summary');

    // Compute all metrics
    const metrics = useMemo(() => {
        if (!trades || trades.length === 0) {
            return {
                grossProfit: 0,
                grossLoss: 0,
                netPL: 0,
                totalSwaps: 0,
                totalCommissions: 0,
                sharpeRatio: 0,
                profitFactor: 0,
                recoveryFactor: 0,
                maxDrawdown: 0,
                maxDepositLoad: 0,
                tradesPerWeek: 0,
                avgHoldTime: '0h 0m',
                balanceData: [],
                dailyPnL: [],
                weekdayPnL: [],
                longTrades: [],
                shortTrades: [],
                symbolStats: {},
                yearlyData: [],
                consecutiveWins: 0,
                consecutiveLosses: 0,
                maxConsecutiveProfit: 0,
                maxConsecutiveLoss: 0,
                maeMfeData: []
            };
        }

        // Basic sums
        const grossProfit = trades.filter(t => t.net_profit > 0).reduce((sum, t) => sum + t.net_profit, 0);
        const grossLoss = trades.filter(t => t.net_profit < 0).reduce((sum, t) => sum + t.net_profit, 0);
        const netPL = grossProfit + grossLoss;
        const totalSwaps = trades.reduce((sum, t) => sum + t.swap, 0);
        const totalCommissions = trades.reduce((sum, t) => sum + t.commission, 0);

        // Balance over time
        let runningBalance = initialBalance;
        const balanceData = trades
            .slice()
            .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
            .map(t => {
                runningBalance += t.net_profit;
                return {
                    date: new Date(t.time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    fullDate: t.time,
                    balance: Math.round(runningBalance * 100) / 100,
                    profit: Math.round(t.net_profit * 100) / 100
                };
            });

        // Calculate drawdown
        let peak = initialBalance;
        let maxDD = 0;
        runningBalance = initialBalance;
        trades.slice().sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()).forEach(t => {
            runningBalance += t.net_profit;
            if (runningBalance > peak) peak = runningBalance;
            const dd = ((peak - runningBalance) / peak) * 100;
            if (dd > maxDD) maxDD = dd;
        });

        // Daily P/L
        const dailyMap: Record<string, number> = {};
        trades.forEach(t => {
            const date = new Date(t.time).toISOString().split('T')[0];
            dailyMap[date] = (dailyMap[date] || 0) + t.net_profit;
        });
        const dailyPnL = Object.entries(dailyMap)
            .map(([date, profit]) => ({ date, profit }))
            .sort((a, b) => a.date.localeCompare(b.date));

        // Weekday P/L
        const weekdayMap: Record<number, { profit: number; count: number }> = {};
        trades.forEach(t => {
            const day = new Date(t.time).getDay();
            if (!weekdayMap[day]) weekdayMap[day] = { profit: 0, count: 0 };
            weekdayMap[day].profit += t.net_profit;
            weekdayMap[day].count++;
        });
        const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        const weekdayPnL = weekdays.map((name, i) => ({
            day: name,
            profit: weekdayMap[i]?.profit || 0,
            count: weekdayMap[i]?.count || 0
        }));

        // Long/Short splits
        const longTrades = trades.filter(t => t.type === 'BUY');
        const shortTrades = trades.filter(t => t.type === 'SELL');

        // Symbol stats
        const symbolStats: Record<string, { profit: number; count: number; fees: number }> = {};
        trades.forEach(t => {
            if (!symbolStats[t.symbol]) symbolStats[t.symbol] = { profit: 0, count: 0, fees: 0 };
            symbolStats[t.symbol].profit += t.net_profit;
            symbolStats[t.symbol].count++;
            symbolStats[t.symbol].fees += Math.abs(t.commission) + Math.abs(t.swap);
        });

        // Yearly data
        const yearlyMap: Record<string, number> = {};
        trades.forEach(t => {
            const year = new Date(t.time).getFullYear().toString();
            yearlyMap[year] = (yearlyMap[year] || 0) + t.net_profit;
        });
        const yearlyData = Object.entries(yearlyMap).map(([year, profit]) => ({ year, profit }));

        // Consecutive wins/losses
        let currentStreak = 0;
        let maxWinStreak = 0;
        let maxLossStreak = 0;
        let currentStreakProfit = 0;
        let maxConsecutiveProfit = 0;
        let maxConsecutiveLoss = 0;
        let lastWasWin: boolean | null = null;

        trades.slice().sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()).forEach(t => {
            const isWin = t.net_profit > 0;
            if (lastWasWin === null || isWin === lastWasWin) {
                currentStreak++;
                currentStreakProfit += t.net_profit;
            } else {
                if (lastWasWin && currentStreak > maxWinStreak) maxWinStreak = currentStreak;
                if (!lastWasWin && currentStreak > maxLossStreak) maxLossStreak = currentStreak;
                if (lastWasWin && currentStreakProfit > maxConsecutiveProfit) maxConsecutiveProfit = currentStreakProfit;
                if (!lastWasWin && currentStreakProfit < maxConsecutiveLoss) maxConsecutiveLoss = currentStreakProfit;
                currentStreak = 1;
                currentStreakProfit = t.net_profit;
            }
            lastWasWin = isWin;
        });
        if (lastWasWin && currentStreak > maxWinStreak) maxWinStreak = currentStreak;
        if (!lastWasWin && currentStreak > maxLossStreak) maxLossStreak = currentStreak;

        // Average hold time
        let totalMinutes = 0;
        let countWithTime = 0;
        trades.forEach(t => {
            if (t.entry_time) {
                const entry = new Date(t.entry_time);
                const exit = new Date(t.time);
                totalMinutes += (exit.getTime() - entry.getTime()) / 60000;
                countWithTime++;
            }
        });
        const avgMinutes = countWithTime > 0 ? totalMinutes / countWithTime : 0;
        const hours = Math.floor(avgMinutes / 60);
        const minutes = Math.floor(avgMinutes % 60);
        const avgHoldTime = `${hours}h ${minutes}m`;

        // Trades per week
        if (trades.length > 0) {
            const sortedTrades = trades.slice().sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
            const firstDate = new Date(sortedTrades[0].time);
            const lastDate = new Date(sortedTrades[sortedTrades.length - 1].time);
            const weeks = Math.max(1, (lastDate.getTime() - firstDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
            var tradesPerWeek = trades.length / weeks;
        } else {
            var tradesPerWeek = 0;
        }

        // Recovery Factor
        const recoveryFactor = maxDD > 0 ? Math.abs(netPL) / (initialBalance * maxDD / 100) : 0;

        return {
            grossProfit,
            grossLoss,
            netPL,
            totalSwaps,
            totalCommissions,
            sharpeRatio: stats.sharpe_ratio,
            profitFactor: stats.profit_factor,
            recoveryFactor,
            maxDrawdown: maxDD,
            maxDepositLoad: (maxDD / 100) * 400, // Approximate
            tradesPerWeek,
            avgHoldTime,
            balanceData,
            dailyPnL,
            weekdayPnL,
            longTrades,
            shortTrades,
            symbolStats,
            yearlyData,
            consecutiveWins: maxWinStreak,
            consecutiveLosses: maxLossStreak,
            maxConsecutiveProfit,
            maxConsecutiveLoss,
            maeMfeData: trades.map(t => ({
                profit: t.net_profit,
                mae: -Math.abs(t.net_profit) * (t.net_profit < 0 ? 1 : 0.3),
                mfe: Math.abs(t.net_profit) * (t.net_profit > 0 ? 1 : 0.3)
            }))
        };
    }, [trades, stats, initialBalance]);

    // Tab configuration
    const tabs: { id: ReportTab; label: string; icon: any }[] = [
        { id: 'summary', label: 'Summary', icon: PieChart },
        { id: 'pnl', label: 'Profit & Loss', icon: BarChart3 },
        { id: 'longshort', label: 'Long & Short', icon: Activity },
        { id: 'symbols', label: 'Symbols', icon: Target },
        { id: 'risks', label: 'Risks', icon: Shield }
    ];

    // Styles
    const containerClass = isDark ? 'bg-slate-900/50 border-slate-800/50' : 'bg-white border-gray-100';
    const textClass = isDark ? 'text-slate-200' : 'text-gray-800';
    const mutedClass = isDark ? 'text-slate-400' : 'text-gray-500';

    return (
        <div className="space-y-6">
            {/* Sub-tabs */}
            <div className={`flex gap-1 p-1 rounded-xl border ${containerClass}`}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${activeTab === tab.id
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                            : isDark
                                ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Summary Tab */}
            {activeTab === 'summary' && (
                <div className="space-y-6">
                    {/* Top Row: Donut + Metrics */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Donut Chart */}
                        <div className={`rounded-2xl p-6 border ${containerClass}`}>
                            <DonutChart
                                grossProfit={metrics.grossProfit}
                                grossLoss={metrics.grossLoss}
                                isDark={isDark}
                            />
                            <div className="flex justify-around mt-4 text-sm">
                                <div className="text-center">
                                    <div className="flex items-center gap-1 text-emerald-500">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                        Gross Profit
                                    </div>
                                    <div className="font-bold text-emerald-400">{formatCurrency(metrics.grossProfit)}</div>
                                </div>
                                <div className="text-center">
                                    <div className="flex items-center gap-1 text-orange-500">
                                        <div className="w-2 h-2 rounded-full bg-orange-500" />
                                        Gross Loss
                                    </div>
                                    <div className="font-bold text-orange-400">{formatCurrency(metrics.grossLoss)}</div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-4 text-center text-xs">
                                <div>
                                    <div className={mutedClass}>Swaps</div>
                                    <div className={textClass}>{formatCurrency(metrics.totalSwaps)}</div>
                                </div>
                                <div>
                                    <div className={mutedClass}>Commissions</div>
                                    <div className={textClass}>{formatCurrency(metrics.totalCommissions)}</div>
                                </div>
                            </div>
                        </div>

                        {/* Metric Bars */}
                        <div className={`rounded-2xl p-6 border ${containerClass}`}>
                            <MetricBar label="Sharpe Ratio" value={metrics.sharpeRatio} min={-1} max={3} displayValue={metrics.sharpeRatio.toFixed(2)} color="indigo" isDark={isDark} />
                            <MetricBar label="Profit Factor" value={metrics.profitFactor} min={0} max={4} displayValue={metrics.profitFactor >= 999 ? '∞' : metrics.profitFactor.toFixed(2)} color="emerald" isDark={isDark} />
                            <MetricBar label="Recovery Factor" value={metrics.recoveryFactor} min={0} max={10} displayValue={metrics.recoveryFactor.toFixed(2)} color="amber" isDark={isDark} />
                        </div>

                        {/* Risk Metrics */}
                        <div className={`rounded-2xl p-6 border ${containerClass}`}>
                            <MetricBar label="Max Drawdown" value={metrics.maxDrawdown} min={0} max={100} displayValue={`${metrics.maxDrawdown.toFixed(2)}%`} color="rose" isDark={isDark} />
                            <MetricBar label="Max Deposit Load" value={metrics.maxDepositLoad} min={0} max={400} displayValue={`${metrics.maxDepositLoad.toFixed(2)}%`} color="purple" isDark={isDark} />
                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <StatCard label="Trades/Week" value={metrics.tradesPerWeek.toFixed(1)} icon={Zap} isDark={isDark} />
                                <StatCard label="Avg Hold Time" value={metrics.avgHoldTime} icon={Clock} isDark={isDark} />
                            </div>
                        </div>
                    </div>

                    {/* Balance Chart */}
                    <div className={`rounded-2xl p-6 border ${containerClass}`}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className={`flex items-center gap-2 ${textClass}`}>
                                    <span className="font-bold text-lg">{formatCurrency(initialBalance + metrics.netPL)}</span>
                                    <span className={mutedClass}>Balance</span>
                                </div>
                            </div>
                        </div>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={metrics.balanceData}>
                                    <defs>
                                        <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                            <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="date" stroke={isDark ? '#475569' : '#9ca3af'} fontSize={10} />
                                    <YAxis stroke={isDark ? '#475569' : '#9ca3af'} fontSize={10} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: isDark ? '#1e293b' : '#fff',
                                            border: `1px solid ${isDark ? '#334155' : '#e5e7eb'}`,
                                            borderRadius: '8px'
                                        }}
                                        labelStyle={{ color: isDark ? '#e2e8f0' : '#1f2937' }}
                                        formatter={(value: number | undefined) => value !== undefined ? [`$${value.toFixed(2)}`, 'Balance'] : ['', 'Balance']}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="balance"
                                        stroke="#8b5cf6"
                                        fill="url(#balanceGradient)"
                                        strokeWidth={2}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Yearly Summary */}
                    {metrics.yearlyData.length > 0 && (
                        <div className={`rounded-2xl p-6 border ${containerClass}`}>
                            <h3 className={`font-semibold mb-4 ${textClass}`}>Yearly Summary</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className={mutedClass}>
                                            <th className="text-left py-2">Year</th>
                                            <th className="text-right py-2">Profit/Loss</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {metrics.yearlyData.map(y => (
                                            <tr key={y.year} className={`border-t ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
                                                <td className={`py-2 ${textClass}`}>{y.year}</td>
                                                <td className={`py-2 text-right font-medium ${y.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    {formatCurrency(y.profit)}
                                                </td>
                                            </tr>
                                        ))}
                                        <tr className={`border-t-2 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                                            <td className={`py-2 font-bold ${textClass}`}>Total</td>
                                            <td className={`py-2 text-right font-bold ${metrics.netPL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {formatCurrency(metrics.netPL)}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Profit & Loss Tab */}
            {activeTab === 'pnl' && (
                <div className="space-y-6">
                    {/* P/L Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <StatCard label="Profit" value={formatCurrency(metrics.grossProfit)} color="text-emerald-400" isDark={isDark} />
                        <StatCard label="Dividends" value="$0.00" isDark={isDark} />
                        <StatCard label="Swaps" value={formatCurrency(metrics.totalSwaps)} isDark={isDark} />
                        <StatCard label="Loss" value={formatCurrency(Math.abs(metrics.grossLoss))} color="text-rose-400" isDark={isDark} />
                        <StatCard label="Commissions" value={formatCurrency(metrics.totalCommissions)} isDark={isDark} />
                    </div>

                    {/* Daily P/L Chart */}
                    <div className={`rounded-2xl p-6 border ${containerClass}`}>
                        <h3 className={`font-semibold mb-4 ${textClass}`}>Daily Profit/Loss</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={metrics.dailyPnL}>
                                    <XAxis dataKey="date" stroke={isDark ? '#475569' : '#9ca3af'} fontSize={10} />
                                    <YAxis stroke={isDark ? '#475569' : '#9ca3af'} fontSize={10} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: isDark ? '#1e293b' : '#fff',
                                            border: `1px solid ${isDark ? '#334155' : '#e5e7eb'}`,
                                            borderRadius: '8px'
                                        }}
                                    />
                                    <ReferenceLine y={0} stroke={isDark ? '#475569' : '#9ca3af'} />
                                    <Bar
                                        dataKey="profit"
                                        fill="#22c55e"
                                        radius={[2, 2, 0, 0]}
                                    >
                                        {metrics.dailyPnL.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? '#22c55e' : '#ef4444'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* P/L by Day of Week + Donut */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className={`rounded-2xl p-6 border ${containerClass}`}>
                            <DonutChart grossProfit={metrics.grossProfit} grossLoss={metrics.grossLoss} isDark={isDark} />
                        </div>
                        <div className={`rounded-2xl p-6 border ${containerClass}`}>
                            <h3 className={`font-semibold mb-4 ${textClass}`}>P/L by Day of Week</h3>
                            <div className="h-48">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={metrics.weekdayPnL}>
                                        <XAxis dataKey="day" stroke={isDark ? '#475569' : '#9ca3af'} fontSize={12} />
                                        <YAxis stroke={isDark ? '#475569' : '#9ca3af'} fontSize={10} />
                                        <Tooltip />
                                        <ReferenceLine y={0} stroke={isDark ? '#475569' : '#9ca3af'} />
                                        <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
                                            {metrics.weekdayPnL.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? '#22c55e' : '#ef4444'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Long & Short Tab */}
            {activeTab === 'longshort' && (
                <div className="space-y-6">
                    {/* Long/Short Summary */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className={`rounded-2xl p-6 border ${containerClass} text-center`}>
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <ArrowUpRight className="text-blue-500" size={20} />
                                <span className={`${textClass} font-medium`}>Long</span>
                            </div>
                            <div className="text-3xl font-bold text-blue-400">{metrics.longTrades.length}</div>
                            <div className={mutedClass}>({((metrics.longTrades.length / trades.length) * 100).toFixed(2)}%)</div>
                        </div>
                        <div className={`rounded-2xl p-6 border ${containerClass} text-center`}>
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <ArrowDownRight className="text-orange-500" size={20} />
                                <span className={`${textClass} font-medium`}>Short</span>
                            </div>
                            <div className="text-3xl font-bold text-orange-400">{metrics.shortTrades.length}</div>
                            <div className={mutedClass}>({((metrics.shortTrades.length / trades.length) * 100).toFixed(2)}%)</div>
                        </div>
                    </div>

                    {/* Trades by Day Chart */}
                    <div className={`rounded-2xl p-6 border ${containerClass}`}>
                        <h3 className={`font-semibold mb-4 ${textClass}`}>Trades by Day of Week</h3>
                        <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={metrics.weekdayPnL}>
                                    <XAxis dataKey="day" stroke={isDark ? '#475569' : '#9ca3af'} fontSize={12} />
                                    <YAxis stroke={isDark ? '#475569' : '#9ca3af'} fontSize={10} />
                                    <Tooltip />
                                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Comparison Bars */}
                    <div className={`rounded-2xl p-6 border ${containerClass}`}>
                        <h3 className={`font-semibold mb-4 ${textClass}`}>Long vs Short Comparison</h3>
                        <div className="flex items-center gap-4 mb-4 text-xs">
                            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-500 rounded" /> Long</div>
                            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-orange-500 rounded" /> Short</div>
                        </div>
                        <ComparisonBar
                            label="Net P/L"
                            longValue={metrics.longTrades.reduce((sum, t) => sum + t.net_profit, 0)}
                            shortValue={metrics.shortTrades.reduce((sum, t) => sum + t.net_profit, 0)}
                            isDark={isDark}
                            formatFn={formatCurrency}
                        />
                        <ComparisonBar
                            label="Average P/L"
                            longValue={metrics.longTrades.length > 0 ? metrics.longTrades.reduce((sum, t) => sum + t.net_profit, 0) / metrics.longTrades.length : 0}
                            shortValue={metrics.shortTrades.length > 0 ? metrics.shortTrades.reduce((sum, t) => sum + t.net_profit, 0) / metrics.shortTrades.length : 0}
                            isDark={isDark}
                            formatFn={formatCurrency}
                        />
                        <ComparisonBar
                            label="Win Rate %"
                            longValue={stats.long_win_rate}
                            shortValue={stats.short_win_rate}
                            isDark={isDark}
                            formatFn={(v) => `${v.toFixed(1)}%`}
                        />
                    </div>

                    {/* Trading Source */}
                    <div className={`rounded-2xl p-6 border ${containerClass}`}>
                        <h3 className={`font-semibold mb-4 ${textClass}`}>Trading Source</h3>
                        <div className="flex justify-center">
                            <div className="relative w-32 h-32">
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-gray-400">{trades.length}</div>
                                        <div className={`text-xs ${mutedClass}`}>Manual Trading</div>
                                    </div>
                                </div>
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="64" cy="64" r="56" fill="none" stroke={isDark ? '#334155' : '#e5e7eb'} strokeWidth="8" />
                                    <circle cx="64" cy="64" r="56" fill="none" stroke="#6b7280" strokeWidth="8" strokeDasharray="352" strokeDashoffset="0" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Symbols Tab */}
            {activeTab === 'symbols' && (
                <div className="space-y-6">
                    {/* Symbol Stats Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.entries(metrics.symbolStats).slice(0, 4).map(([symbol, data]) => (
                            <div key={symbol} className={`rounded-2xl p-4 border ${containerClass}`}>
                                <div className={`text-xs ${mutedClass}`}>{symbol}</div>
                                <div className={`text-lg font-bold ${data.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {formatCurrency(data.profit)}
                                </div>
                                <div className={`text-xs ${mutedClass}`}>{data.count} trades</div>
                            </div>
                        ))}
                    </div>

                    {/* Symbol Distribution */}
                    <div className={`rounded-2xl p-6 border ${containerClass}`}>
                        <h3 className={`font-semibold mb-4 ${textClass}`}>Symbol Distribution</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {Object.entries(metrics.symbolStats).map(([symbol, data]) => {
                                const symbolColors: Record<string, string> = {
                                    'XAUUSDc': '#f59e0b',
                                    'BTCUSDc': '#3b82f6',
                                    'default': '#8b5cf6'
                                };
                                const color = symbolColors[symbol] || symbolColors.default;
                                return (
                                    <div key={symbol} className="text-center">
                                        <div className="relative w-24 h-24 mx-auto mb-2">
                                            <svg className="w-full h-full transform -rotate-90">
                                                <circle cx="48" cy="48" r="40" fill="none" stroke={isDark ? '#334155' : '#e5e7eb'} strokeWidth="6" />
                                                <circle cx="48" cy="48" r="40" fill="none" stroke={color} strokeWidth="6"
                                                    strokeDasharray="251"
                                                    strokeDashoffset={251 - (251 * data.count / trades.length)}
                                                />
                                            </svg>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <span className={`text-lg font-bold ${textClass}`}>{data.count}</span>
                                            </div>
                                        </div>
                                        <div className={`text-sm ${textClass}`}>{symbol}</div>
                                        <div className={mutedClass}>{((data.count / trades.length) * 100).toFixed(1)}%</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Profit/Fees by Symbol */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className={`rounded-2xl p-6 border ${containerClass}`}>
                            <h3 className={`font-semibold mb-4 ${textClass}`}>Net Profit by Symbol</h3>
                            {Object.entries(metrics.symbolStats).map(([symbol, data]) => {
                                const maxProfit = Math.max(...Object.values(metrics.symbolStats).map(s => Math.abs(s.profit)));
                                const width = (Math.abs(data.profit) / maxProfit) * 100;
                                return (
                                    <div key={symbol} className="mb-3">
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className={mutedClass}>{symbol}</span>
                                            <span className={data.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                                {formatCurrency(data.profit)}
                                            </span>
                                        </div>
                                        <div className={`h-2 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
                                            <div
                                                className={`h-full rounded-full ${data.profit >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                                style={{ width: `${width}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className={`rounded-2xl p-6 border ${containerClass}`}>
                            <h3 className={`font-semibold mb-4 ${textClass}`}>Fees by Symbol</h3>
                            {Object.entries(metrics.symbolStats).map(([symbol, data]) => {
                                const maxFees = Math.max(...Object.values(metrics.symbolStats).map(s => s.fees));
                                const width = maxFees > 0 ? (data.fees / maxFees) * 100 : 0;
                                return (
                                    <div key={symbol} className="mb-3">
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className={mutedClass}>{symbol}</span>
                                            <span className={textClass}>{formatCurrency(data.fees)}</span>
                                        </div>
                                        <div className={`h-2 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
                                            <div
                                                className="h-full rounded-full bg-purple-500"
                                                style={{ width: `${width}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Risks Tab */}
            {activeTab === 'risks' && (
                <div className="space-y-6">
                    {/* Drawdown Chart */}
                    <div className={`rounded-2xl p-6 border ${containerClass}`}>
                        <div className="flex items-center gap-4 mb-4">
                            <span className={`font-semibold ${textClass}`}>Balance & Drawdown</span>
                            <span className={mutedClass}>Balance: {formatCurrency(initialBalance + metrics.netPL)}</span>
                        </div>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={metrics.balanceData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e5e7eb'} />
                                    <XAxis dataKey="date" stroke={isDark ? '#475569' : '#9ca3af'} fontSize={10} />
                                    <YAxis yAxisId="left" stroke={isDark ? '#475569' : '#9ca3af'} fontSize={10} />
                                    <YAxis yAxisId="right" orientation="right" stroke={isDark ? '#475569' : '#9ca3af'} fontSize={10} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: isDark ? '#1e293b' : '#fff',
                                            border: `1px solid ${isDark ? '#334155' : '#e5e7eb'}`,
                                            borderRadius: '8px'
                                        }}
                                    />
                                    <Area yAxisId="left" type="monotone" dataKey="balance" stroke="#8b5cf6" fill="url(#balanceGradient)" strokeWidth={2} />
                                    <Line yAxisId="right" type="monotone" dataKey="profit" stroke="#f97316" strokeWidth={1} dot={false} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Streak Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard
                            label="Best Trade"
                            value={formatCurrency(stats.largest_win)}
                            color="text-emerald-400"
                            isDark={isDark}
                        />
                        <StatCard
                            label="Worst Trade"
                            value={formatCurrency(stats.largest_loss)}
                            color="text-rose-400"
                            isDark={isDark}
                        />
                        <StatCard
                            label="Max Consecutive Wins"
                            value={metrics.consecutiveWins.toString()}
                            subValue={formatCurrency(metrics.maxConsecutiveProfit)}
                            color="text-emerald-400"
                            isDark={isDark}
                        />
                        <StatCard
                            label="Max Consecutive Losses"
                            value={metrics.consecutiveLosses.toString()}
                            subValue={formatCurrency(metrics.maxConsecutiveLoss)}
                            color="text-rose-400"
                            isDark={isDark}
                        />
                    </div>

                    {/* Summary Stats */}
                    <div className={`rounded-2xl p-6 border ${containerClass}`}>
                        <h3 className={`font-semibold mb-4 ${textClass}`}>Risk Summary</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div>
                                <div className={`text-xs ${mutedClass}`}>Max Drawdown</div>
                                <div className="text-xl font-bold text-rose-400">{metrics.maxDrawdown.toFixed(2)}%</div>
                            </div>
                            <div>
                                <div className={`text-xs ${mutedClass}`}>Profit Factor</div>
                                <div className={`text-xl font-bold ${textClass}`}>
                                    {metrics.profitFactor >= 999 ? '∞' : metrics.profitFactor.toFixed(2)}
                                </div>
                            </div>
                            <div>
                                <div className={`text-xs ${mutedClass}`}>Recovery Factor</div>
                                <div className={`text-xl font-bold ${textClass}`}>{metrics.recoveryFactor.toFixed(2)}</div>
                            </div>
                            <div>
                                <div className={`text-xs ${mutedClass}`}>Sharpe Ratio</div>
                                <div className={`text-xl font-bold ${textClass}`}>{metrics.sharpeRatio.toFixed(2)}</div>
                            </div>
                        </div>
                    </div>

                    {/* MAE/MFE Chart */}
                    <div className={`rounded-2xl p-6 border ${containerClass}`}>
                        <h3 className={`font-semibold mb-4 ${textClass}`}>Trade Distribution (MAE/MFE)</h3>
                        <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={metrics.dailyPnL.slice(-30)}>
                                    <XAxis dataKey="date" stroke={isDark ? '#475569' : '#9ca3af'} fontSize={10} />
                                    <YAxis stroke={isDark ? '#475569' : '#9ca3af'} fontSize={10} />
                                    <Tooltip />
                                    <ReferenceLine y={0} stroke={isDark ? '#475569' : '#9ca3af'} />
                                    <Bar dataKey="profit" radius={[2, 2, 0, 0]}>
                                        {metrics.dailyPnL.slice(-30).map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? '#22c55e' : '#ef4444'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
