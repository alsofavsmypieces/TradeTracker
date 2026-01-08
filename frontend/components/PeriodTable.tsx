'use client';

import React from 'react';
import { PeriodStats } from '@/lib/types';

interface PeriodTableProps {
    periods: { [key: string]: PeriodStats };
    isDark?: boolean;
}

export default function PeriodTable({ periods, isDark = true }: PeriodTableProps) {
    const containerClass = isDark
        ? 'bg-slate-900/50 border border-slate-800/50'
        : 'bg-white border border-gray-100 shadow-sm';

    const textClass = isDark ? 'text-slate-300' : 'text-gray-600';
    const headerText = isDark ? 'text-slate-400' : 'text-gray-400';
    const rowHover = isDark ? 'hover:bg-slate-800/30' : 'hover:bg-gray-50';
    const borderClass = isDark ? 'border-slate-800/50' : 'border-gray-50';

    const periodOrder = ['today', 'week', 'month', 'year'];
    const periodLabels: { [key: string]: string } = {
        today: 'Today',
        week: 'This Week',
        month: 'This Month',
        year: 'This Year'
    };

    const formatValue = (value: number, prefix: string = '', suffix: string = '') => {
        const formatted = prefix + ' ' + (value > 0 ? '+' : '') + value.toFixed(2) + suffix;
        if (value > 0) return <span className="text-emerald-500 font-medium">{formatted}</span>;
        if (value < 0) return <span className="text-rose-500 font-medium">{formatted}</span>;
        return <span className={isDark ? 'text-slate-500' : 'text-gray-400'}>-</span>;
    };

    return (
        <div className={`rounded-2xl overflow-hidden ${containerClass}`}>
            <table className="w-full">
                <thead>
                    <tr className={`border-b ${borderClass}`}>
                        <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${headerText}`}>Period</th>
                        <th className={`px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider ${headerText}`}>Gain</th>
                        <th className={`px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider ${headerText}`}>Profit</th>
                        <th className={`px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider ${headerText}`}>Win%</th>
                        <th className={`px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider ${headerText}`}>Trades</th>
                        <th className={`px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider ${headerText}`}>Lots</th>
                    </tr>
                </thead>
                <tbody>
                    {periodOrder.map((key) => {
                        const stats = periods[key] || { gain: 0, profit: 0, trades: 0, win_pct: 0, lots: 0 };
                        return (
                            <tr key={key} className={`border-b last:border-0 ${borderClass} transition-colors ${rowHover}`}>
                                <td className={`px-6 py-4 text-sm font-medium ${textClass}`}>
                                    {periodLabels[key]}
                                </td>
                                <td className="px-6 py-4 text-sm text-right">{formatValue(stats.gain, '', '%')}</td>
                                <td className="px-6 py-4 text-sm text-right">{formatValue(stats.profit, '$')}</td>
                                <td className={`px-6 py-4 text-sm text-right ${textClass}`}>
                                    <div className="flex items-center justify-end gap-2">
                                        <div className="w-16 h-1.5 bg-gray-700/20 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${stats.win_pct >= 50 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                                style={{ width: `${Math.min(stats.win_pct, 100)}%` }}
                                            />
                                        </div>
                                        {stats.win_pct.toFixed(0)}%
                                    </div>
                                </td>
                                <td className={`px-6 py-4 text-sm text-right ${textClass}`}>{stats.trades}</td>
                                <td className={`px-6 py-4 text-sm text-right ${textClass}`}>{stats.lots.toFixed(2)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
