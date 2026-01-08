'use client';

import React, { useMemo } from 'react';
import { Trade } from '@/lib/types';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import AIAnalyzeButton from './AIAnalyzeButton';
import { MetricLabel } from './Tooltip';

interface PeriodsComparisonProps {
    trades: Trade[];
    isDark?: boolean;
}

interface PeriodData {
    label: string;
    gainPct: number;
    profit: number;
    pips: number;
    winPct: number;
    trades: number;
    lots: number;
    prevGainPct: number;
    prevProfit: number;
    prevPips: number;
    prevWinPct: number;
    prevTrades: number;
    prevLots: number;
}

// Estimate pips from profit (rough calculation for gold/forex)
const estimatePips = (trade: Trade): number => {
    const symbol = trade.symbol.toLowerCase();
    const volume = trade.volume;

    // Gold: 1 pip = $0.10 per 0.01 lot
    if (symbol.includes('xau')) {
        return (trade.net_profit / volume) / 10;
    }
    // Forex: approximate based on typical pip values
    return (trade.net_profit / volume) * 10;
};

export default function PeriodsComparison({ trades, isDark = true }: PeriodsComparisonProps) {
    const periodsData = useMemo(() => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Week boundaries (Monday-based)
        const dayOfWeek = now.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const thisWeekStart = new Date(today);
        thisWeekStart.setDate(today.getDate() + mondayOffset);
        const lastWeekStart = new Date(thisWeekStart);
        lastWeekStart.setDate(lastWeekStart.getDate() - 7);

        // Month boundaries
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

        // Year boundaries
        const thisYearStart = new Date(now.getFullYear(), 0, 1);
        const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);

        const calculatePeriod = (start: Date, end: Date): { profit: number; pips: number; wins: number; total: number; lots: number } => {
            const periodTrades = trades.filter(t => {
                const d = new Date(t.time);
                return d >= start && d < end;
            });

            const wins = periodTrades.filter(t => t.net_profit > 0).length;
            const profit = periodTrades.reduce((sum, t) => sum + t.net_profit, 0);
            const pips = periodTrades.reduce((sum, t) => sum + estimatePips(t), 0);
            const lots = periodTrades.reduce((sum, t) => sum + t.volume, 0);

            return { profit, pips, wins, total: periodTrades.length, lots };
        };

        // Assuming initial balance of $10000 for gain percentage (should be from account)
        const initialBalance = 10000;

        const periods: PeriodData[] = [
            {
                label: 'Today',
                ...(() => {
                    const current = calculatePeriod(today, new Date(today.getTime() + 86400000));
                    const yesterday = new Date(today);
                    yesterday.setDate(yesterday.getDate() - 1);
                    const prev = calculatePeriod(yesterday, today);
                    return {
                        gainPct: (current.profit / initialBalance) * 100,
                        profit: current.profit,
                        pips: current.pips,
                        winPct: current.total > 0 ? (current.wins / current.total) * 100 : 0,
                        trades: current.total,
                        lots: current.lots,
                        prevGainPct: (prev.profit / initialBalance) * 100,
                        prevProfit: prev.profit,
                        prevPips: prev.pips,
                        prevWinPct: prev.total > 0 ? (prev.wins / prev.total) * 100 : 0,
                        prevTrades: prev.total,
                        prevLots: prev.lots,
                    };
                })()
            },
            {
                label: 'This Week',
                ...(() => {
                    const current = calculatePeriod(thisWeekStart, now);
                    const prev = calculatePeriod(lastWeekStart, thisWeekStart);
                    return {
                        gainPct: (current.profit / initialBalance) * 100,
                        profit: current.profit,
                        pips: current.pips,
                        winPct: current.total > 0 ? (current.wins / current.total) * 100 : 0,
                        trades: current.total,
                        lots: current.lots,
                        prevGainPct: (prev.profit / initialBalance) * 100,
                        prevProfit: prev.profit,
                        prevPips: prev.pips,
                        prevWinPct: prev.total > 0 ? (prev.wins / prev.total) * 100 : 0,
                        prevTrades: prev.total,
                        prevLots: prev.lots,
                    };
                })()
            },
            {
                label: 'This Month',
                ...(() => {
                    const current = calculatePeriod(thisMonthStart, now);
                    const prev = calculatePeriod(lastMonthStart, thisMonthStart);
                    return {
                        gainPct: (current.profit / initialBalance) * 100,
                        profit: current.profit,
                        pips: current.pips,
                        winPct: current.total > 0 ? (current.wins / current.total) * 100 : 0,
                        trades: current.total,
                        lots: current.lots,
                        prevGainPct: (prev.profit / initialBalance) * 100,
                        prevProfit: prev.profit,
                        prevPips: prev.pips,
                        prevWinPct: prev.total > 0 ? (prev.wins / prev.total) * 100 : 0,
                        prevTrades: prev.total,
                        prevLots: prev.lots,
                    };
                })()
            },
            {
                label: 'This Year',
                ...(() => {
                    const current = calculatePeriod(thisYearStart, now);
                    const prev = calculatePeriod(lastYearStart, thisYearStart);
                    return {
                        gainPct: (current.profit / initialBalance) * 100,
                        profit: current.profit,
                        pips: current.pips,
                        winPct: current.total > 0 ? (current.wins / current.total) * 100 : 0,
                        trades: current.total,
                        lots: current.lots,
                        prevGainPct: (prev.profit / initialBalance) * 100,
                        prevProfit: prev.profit,
                        prevPips: prev.pips,
                        prevWinPct: prev.total > 0 ? (prev.wins / prev.total) * 100 : 0,
                        prevTrades: prev.total,
                        prevLots: prev.lots,
                    };
                })()
            }
        ];

        return periods;
    }, [trades]);

    // Styles
    const containerClass = isDark
        ? 'bg-slate-900/50 border border-slate-800/50'
        : 'bg-white border border-gray-100 shadow-sm';
    const headerClass = isDark ? 'border-slate-800 bg-slate-800/50' : 'border-gray-100 bg-gray-50';
    const textClass = isDark ? 'text-slate-300' : 'text-gray-600';
    const mutedClass = isDark ? 'text-slate-500' : 'text-gray-400';
    const rowBg = isDark ? 'hover:bg-slate-800/50' : 'hover:bg-gray-50';

    const formatDiff = (current: number, prev: number, prefix: string = '', suffix: string = '') => {
        const diff = current - prev;
        if (diff === 0 || (current === 0 && prev === 0)) return null;
        const isPositive = diff > 0;
        return (
            <span className={`text-xs ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                ({isPositive ? '+' : ''}{prefix}{diff.toFixed(2)}{suffix})
            </span>
        );
    };

    const ValueCell = ({ value, prev, prefix = '', suffix = '', decimals = 2 }:
        { value: number; prev: number; prefix?: string; suffix?: string; decimals?: number }) => (
        <td className={`px-4 py-3 text-sm ${value > 0 ? 'text-emerald-400' : value < 0 ? 'text-rose-400' : textClass}`}>
            <div className="flex flex-col">
                <span className="font-medium">
                    {value > 0 ? '+' : ''}{prefix}{value.toFixed(decimals)}{suffix}
                </span>
                {formatDiff(value, prev, prefix, suffix)}
            </div>
        </td>
    );

    return (
        <div className={`rounded-2xl overflow-hidden ${containerClass}`}>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className={`${headerClass}`}>
                            <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${mutedClass}`}>
                                <div className="flex items-center gap-2">
                                    Period
                                    <AIAnalyzeButton
                                        sectionName="Periods Comparison"
                                        sectionData={periodsData.map(p => ({
                                            period: p.label,
                                            gainPct: p.gainPct,
                                            profit: p.profit,
                                            pips: p.pips,
                                            winPct: p.winPct,
                                            trades: p.trades,
                                            lots: p.lots
                                        }))}
                                        isDark={isDark}
                                    />
                                </div>
                            </th>
                            <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${mutedClass}`}>
                                <MetricLabel label="GAIN" isDark={isDark} />
                            </th>
                            <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${mutedClass}`}>
                                <MetricLabel label="PROFIT" isDark={isDark} />
                            </th>
                            <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${mutedClass}`}>
                                <MetricLabel label="PIPS" isDark={isDark} />
                            </th>
                            <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${mutedClass}`}>
                                <MetricLabel label="WIN%" isDark={isDark} />
                            </th>
                            <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${mutedClass}`}>
                                <MetricLabel label="Trades" isDark={isDark} />
                            </th>
                            <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${mutedClass}`}>
                                <MetricLabel label="Lots" isDark={isDark} />
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {periodsData.map((period, idx) => (
                            <tr key={period.label} className={`border-t ${isDark ? 'border-slate-800' : 'border-gray-100'} ${rowBg}`}>
                                <td className={`px-4 py-3 text-sm font-medium ${textClass}`}>
                                    {period.label}
                                </td>
                                <ValueCell value={period.gainPct} prev={period.prevGainPct} suffix="%" />
                                <ValueCell value={period.profit} prev={period.prevProfit} prefix="$" />
                                <ValueCell value={period.pips} prev={period.prevPips} decimals={1} />
                                <td className={`px-4 py-3 text-sm ${textClass}`}>
                                    <div className="flex flex-col">
                                        <span>{period.winPct.toFixed(0)}%</span>
                                        {formatDiff(period.winPct, period.prevWinPct, '', '%')}
                                    </div>
                                </td>
                                <td className={`px-4 py-3 text-sm ${textClass}`}>
                                    <div className="flex flex-col">
                                        <span>{period.trades}</span>
                                        {period.trades !== period.prevTrades && (
                                            <span className={`text-xs ${period.trades > period.prevTrades ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                ({period.trades > period.prevTrades ? '+' : ''}{period.trades - period.prevTrades})
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className={`px-4 py-3 text-sm ${textClass}`}>
                                    <div className="flex flex-col">
                                        <span>{period.lots.toFixed(2)}</span>
                                        {formatDiff(period.lots, period.prevLots, '', '')}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
