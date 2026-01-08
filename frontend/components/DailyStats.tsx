'use client';

import React from 'react';
import { Trade } from '@/lib/types';
import {
    TrendingUp,
    TrendingDown,
    ArrowUpCircle,
    ArrowDownCircle,
    Activity,
    Zap
} from 'lucide-react';

interface DailyStatsProps {
    trades: Trade[];
    isDark?: boolean;
}

export default function DailyStats({ trades, isDark = true }: DailyStatsProps) {
    // Get today's trades
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todaysTrades = trades.filter(t => {
        const tradeDate = new Date(t.time);
        tradeDate.setHours(0, 0, 0, 0);
        return tradeDate.getTime() === today.getTime();
    });

    const yesterdaysTrades = trades.filter(t => {
        const tradeDate = new Date(t.time);
        tradeDate.setHours(0, 0, 0, 0);
        return tradeDate.getTime() === yesterday.getTime();
    });

    // Calculate metrics
    const todayProfit = todaysTrades.reduce((sum, t) => sum + t.net_profit, 0);
    const yesterdayProfit = yesterdaysTrades.reduce((sum, t) => sum + t.net_profit, 0);
    const profitChange = todayProfit - yesterdayProfit;

    const todayWins = todaysTrades.filter(t => t.net_profit > 0).length;
    const todayLosses = todaysTrades.filter(t => t.net_profit < 0).length;

    const bestTrade = todaysTrades.length > 0
        ? Math.max(...todaysTrades.map(t => t.net_profit))
        : 0;
    const worstTrade = todaysTrades.length > 0
        ? Math.min(...todaysTrades.map(t => t.net_profit))
        : 0;

    // Get unique symbols traded today
    const symbolsToday = [...new Set(todaysTrades.map(t => t.symbol))];
    const todayLots = todaysTrades.reduce((sum, t) => sum + t.volume, 0);

    // Styles
    const containerClass = isDark
        ? 'bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50'
        : 'bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-lg';
    const textClass = isDark ? 'text-slate-200' : 'text-gray-800';
    const mutedClass = isDark ? 'text-slate-400' : 'text-gray-500';
    const cardClass = isDark ? 'bg-slate-800/50' : 'bg-white/80';

    const StatCard = ({
        label,
        value,
        icon: Icon,
        trend,
        subValue
    }: {
        label: string;
        value: string;
        icon: any;
        trend?: 'up' | 'down' | 'neutral';
        subValue?: string;
    }) => (
        <div className={`${cardClass} rounded-xl p-4 backdrop-blur-sm`}>
            <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-medium uppercase tracking-wide ${mutedClass}`}>{label}</span>
                <Icon size={16} className={
                    trend === 'up' ? 'text-emerald-500' :
                        trend === 'down' ? 'text-rose-500' :
                            'text-indigo-400'
                } />
            </div>
            <div className={`text-xl font-bold ${trend === 'up' ? 'text-emerald-500' :
                    trend === 'down' ? 'text-rose-500' :
                        textClass
                }`}>
                {value}
            </div>
            {subValue && (
                <div className={`text-xs mt-1 ${mutedClass}`}>{subValue}</div>
            )}
        </div>
    );

    return (
        <div className={`rounded-2xl p-6 ${containerClass}`}>
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
                        <Activity className="text-emerald-500" size={22} />
                    </div>
                    <div>
                        <h3 className={`font-bold text-lg ${textClass}`}>Today's Performance</h3>
                        <p className={`text-sm ${mutedClass}`}>
                            {today.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                        </p>
                    </div>
                </div>
                <div className={`px-3 py-1.5 rounded-full text-sm font-medium ${todaysTrades.length > 0
                        ? (todayProfit >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500')
                        : (isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500')
                    }`}>
                    {todaysTrades.length} trades today
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <StatCard
                    label="Today P/L"
                    value={`${todayProfit >= 0 ? '+' : ''}$${todayProfit.toFixed(2)}`}
                    icon={todayProfit >= 0 ? TrendingUp : TrendingDown}
                    trend={todayProfit > 0 ? 'up' : todayProfit < 0 ? 'down' : 'neutral'}
                    subValue={profitChange !== 0 ? `${profitChange >= 0 ? '+' : ''}$${profitChange.toFixed(2)} vs yesterday` : undefined}
                />
                <StatCard
                    label="Win/Loss"
                    value={`${todayWins}/${todayLosses}`}
                    icon={Activity}
                    trend={todayWins > todayLosses ? 'up' : todayWins < todayLosses ? 'down' : 'neutral'}
                    subValue={todaysTrades.length > 0 ? `${((todayWins / todaysTrades.length) * 100).toFixed(0)}% win rate` : 'No trades'}
                />
                <StatCard
                    label="Best Trade"
                    value={bestTrade > 0 ? `+$${bestTrade.toFixed(2)}` : '-'}
                    icon={ArrowUpCircle}
                    trend={bestTrade > 0 ? 'up' : 'neutral'}
                />
                <StatCard
                    label="Worst Trade"
                    value={worstTrade < 0 ? `$${worstTrade.toFixed(2)}` : '-'}
                    icon={ArrowDownCircle}
                    trend={worstTrade < 0 ? 'down' : 'neutral'}
                />
            </div>

            {/* Symbols & Volume */}
            <div className={`flex items-center justify-between p-4 rounded-xl ${cardClass}`}>
                <div className="flex items-center gap-3">
                    <Zap size={18} className="text-amber-500" />
                    <span className={`text-sm font-medium ${textClass}`}>Active Symbols</span>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex gap-2">
                        {symbolsToday.length > 0 ? (
                            symbolsToday.slice(0, 5).map(symbol => (
                                <span key={symbol} className={`px-2 py-1 text-xs font-medium rounded-md ${isDark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
                                    }`}>
                                    {symbol}
                                </span>
                            ))
                        ) : (
                            <span className={mutedClass}>No trades today</span>
                        )}
                        {symbolsToday.length > 5 && (
                            <span className={`px-2 py-1 text-xs font-medium rounded-md ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500'
                                }`}>
                                +{symbolsToday.length - 5}
                            </span>
                        )}
                    </div>
                    <div className={`text-sm ${mutedClass}`}>
                        {todayLots.toFixed(2)} lots
                    </div>
                </div>
            </div>
        </div>
    );
}
