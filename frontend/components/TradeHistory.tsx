'use client';

import React, { useState, useMemo } from 'react';
import { Trade } from '@/lib/types';
import {
    ChevronUp,
    ChevronDown,
    Search,
    ArrowUpRight,
    ArrowDownRight
} from 'lucide-react';

interface TradeHistoryProps {
    trades: Trade[];
    isDark?: boolean;
}

type SortField = 'time' | 'symbol' | 'profit' | 'volume';
type SortDir = 'asc' | 'desc';

export default function TradeHistory({ trades, isDark = true }: TradeHistoryProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'wins' | 'losses'>('all');
    const [sortField, setSortField] = useState<SortField>('time');
    const [sortDir, setSortDir] = useState<SortDir>('desc');
    const [page, setPage] = useState(1);
    const perPage = 15;

    // Filtered and sorted trades
    const filteredTrades = useMemo(() => {
        let result = [...trades];

        // Search filter
        if (searchTerm) {
            result = result.filter(t =>
                t.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.ticket.toString().includes(searchTerm)
            );
        }

        // Win/loss filter
        if (filterType === 'wins') {
            result = result.filter(t => t.net_profit > 0);
        } else if (filterType === 'losses') {
            result = result.filter(t => t.net_profit < 0);
        }

        // Sort
        result.sort((a, b) => {
            let cmp = 0;
            switch (sortField) {
                case 'time':
                    cmp = new Date(a.time).getTime() - new Date(b.time).getTime();
                    break;
                case 'symbol':
                    cmp = a.symbol.localeCompare(b.symbol);
                    break;
                case 'profit':
                    cmp = a.net_profit - b.net_profit;
                    break;
                case 'volume':
                    cmp = a.volume - b.volume;
                    break;
            }
            return sortDir === 'desc' ? -cmp : cmp;
        });

        return result;
    }, [trades, searchTerm, filterType, sortField, sortDir]);

    const pageCount = Math.ceil(filteredTrades.length / perPage);
    const paginatedTrades = filteredTrades.slice((page - 1) * perPage, page * perPage);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('desc');
        }
    };

    // Format price for display
    const formatPrice = (price: number | null | undefined, symbol: string): string => {
        if (price === null || price === undefined) return '-';
        // Gold and indices usually have 2 decimal places, forex has 5
        const isGold = symbol.toLowerCase().includes('xau');
        const decimals = isGold ? 2 : 5;
        return price.toFixed(decimals);
    };

    // Styles
    const containerClass = isDark
        ? 'bg-slate-900/50 border border-slate-800/50'
        : 'bg-white border border-gray-100 shadow-sm';
    const headerClass = isDark ? 'border-slate-800' : 'border-gray-100';
    const textClass = isDark ? 'text-slate-300' : 'text-gray-600';
    const mutedClass = isDark ? 'text-slate-500' : 'text-gray-400';
    const rowBg = isDark ? 'hover:bg-slate-800/50' : 'hover:bg-gray-50';
    const inputClass = isDark
        ? 'bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500'
        : 'bg-gray-50 border-gray-200 text-gray-800 placeholder:text-gray-400';

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return null;
        return sortDir === 'desc' ? <ChevronDown size={14} /> : <ChevronUp size={14} />;
    };

    return (
        <div className={`rounded-2xl overflow-hidden ${containerClass}`}>
            {/* Header with filters */}
            <div className={`p-4 border-b ${headerClass} flex flex-col sm:flex-row gap-4`}>
                <div className="flex-1 relative">
                    <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${mutedClass}`} />
                    <input
                        type="text"
                        placeholder="Search symbol or ticket..."
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                        className={`w-full pl-10 pr-4 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 ${inputClass}`}
                    />
                </div>
                <div className="flex gap-2">
                    {(['all', 'wins', 'losses'] as const).map(type => (
                        <button
                            key={type}
                            onClick={() => { setFilterType(type); setPage(1); }}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterType === type
                                ? 'bg-indigo-500 text-white'
                                : isDark
                                    ? 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {type === 'all' ? 'All' : type === 'wins' ? '🟢 Wins' : '🔴 Losses'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className={`border-b ${headerClass}`}>
                            <th
                                onClick={() => handleSort('time')}
                                className={`px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer hover:text-indigo-400 ${mutedClass}`}
                            >
                                <div className="flex items-center gap-1">
                                    Date/Time
                                    <SortIcon field="time" />
                                </div>
                            </th>
                            <th
                                onClick={() => handleSort('symbol')}
                                className={`px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer hover:text-indigo-400 ${mutedClass}`}
                            >
                                <div className="flex items-center gap-1">
                                    Symbol
                                    <SortIcon field="symbol" />
                                </div>
                            </th>
                            <th className={`px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider ${mutedClass}`}>
                                Type
                            </th>
                            <th
                                onClick={() => handleSort('volume')}
                                className={`px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer hover:text-indigo-400 ${mutedClass}`}
                            >
                                <div className="flex items-center gap-1">
                                    Lots
                                    <SortIcon field="volume" />
                                </div>
                            </th>
                            <th className={`px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider ${mutedClass}`}>
                                Entry
                            </th>
                            <th className={`px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider ${mutedClass}`}>
                                S/L
                            </th>
                            <th className={`px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider ${mutedClass}`}>
                                T/P
                            </th>
                            <th className={`px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider ${mutedClass}`}>
                                Exit
                            </th>
                            <th
                                onClick={() => handleSort('profit')}
                                className={`px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer hover:text-indigo-400 ${mutedClass}`}
                            >
                                <div className="flex items-center gap-1">
                                    Profit
                                    <SortIcon field="profit" />
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedTrades.length > 0 ? (
                            paginatedTrades.map((trade) => (
                                <tr key={trade.ticket} className={`border-b last:border-0 ${headerClass} transition-colors ${rowBg}`}>
                                    <td className={`px-3 py-3 text-sm ${textClass}`}>
                                        {new Date(trade.time).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </td>
                                    <td className={`px-3 py-3 text-sm font-medium ${textClass}`}>
                                        {trade.symbol}
                                    </td>
                                    <td className="px-3 py-3">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${trade.type === 'BUY'
                                            ? 'bg-emerald-500/10 text-emerald-500'
                                            : 'bg-rose-500/10 text-rose-500'
                                            }`}>
                                            {trade.type === 'BUY' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                            {trade.type}
                                        </span>
                                    </td>
                                    <td className={`px-3 py-3 text-sm ${textClass}`}>
                                        {trade.volume.toFixed(2)}
                                    </td>
                                    <td className={`px-3 py-3 text-sm ${textClass}`}>
                                        {formatPrice(trade.entry_price, trade.symbol)}
                                    </td>
                                    <td className={`px-3 py-3 text-sm ${trade.sl ? 'text-rose-400' : mutedClass}`}>
                                        {formatPrice(trade.sl, trade.symbol)}
                                    </td>
                                    <td className={`px-3 py-3 text-sm ${trade.tp ? 'text-emerald-400' : mutedClass}`}>
                                        {formatPrice(trade.tp, trade.symbol)}
                                    </td>
                                    <td className={`px-3 py-3 text-sm ${textClass}`}>
                                        {formatPrice(trade.price, trade.symbol)}
                                    </td>
                                    <td className={`px-3 py-3 text-sm font-semibold ${trade.net_profit > 0 ? 'text-emerald-500' :
                                        trade.net_profit < 0 ? 'text-rose-500' :
                                            textClass
                                        }`}>
                                        {trade.net_profit >= 0 ? '+' : ''}${trade.net_profit.toFixed(2)}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={9} className={`px-4 py-12 text-center ${mutedClass}`}>
                                    No trades found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {pageCount > 1 && (
                <div className={`p-4 border-t ${headerClass} flex items-center justify-between`}>
                    <span className={`text-sm ${mutedClass}`}>
                        Showing {(page - 1) * perPage + 1}-{Math.min(page * perPage, filteredTrades.length)} of {filteredTrades.length}
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className={`px-3 py-1 rounded text-sm ${isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-gray-100 hover:bg-gray-200'
                                } disabled:opacity-50`}
                        >
                            Prev
                        </button>
                        <button
                            onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                            disabled={page === pageCount}
                            className={`px-3 py-1 rounded text-sm ${isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-gray-100 hover:bg-gray-200'
                                } disabled:opacity-50`}
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
