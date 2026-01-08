'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, RefreshCw, Activity } from 'lucide-react';

interface Position {
    ticket: number;
    symbol: string;
    type: string;
    volume: number;
    entry_price: number;
    current_price: number;
    profit: number;
    swap: number;
    time: string;
}

interface OpenPositionsProps {
    isDark?: boolean;
}

const API_BASE = 'http://localhost:8000/api';

export default function OpenPositions({ isDark = true }: OpenPositionsProps) {
    const [positions, setPositions] = useState<Position[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(true);

    const fetchPositions = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE}/mt5/positions`);
            if (!res.ok) throw new Error('Failed to fetch positions');
            const data = await res.json();
            setPositions(data.positions || []);
            setLastUpdate(new Date());
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Auto refresh every 5 seconds
    useEffect(() => {
        fetchPositions();

        let interval: NodeJS.Timeout | null = null;
        if (autoRefresh) {
            interval = setInterval(fetchPositions, 5000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [autoRefresh]);

    // Styles
    const containerClass = isDark
        ? 'bg-slate-900/50 border border-slate-800/50'
        : 'bg-white border border-gray-100 shadow-sm';
    const textClass = isDark ? 'text-slate-200' : 'text-gray-800';
    const mutedClass = isDark ? 'text-slate-400' : 'text-gray-500';
    const headerClass = isDark ? 'bg-slate-800/50' : 'bg-gray-50';

    const totalProfit = positions.reduce((sum, p) => sum + p.profit, 0);

    return (
        <div className={`rounded-2xl overflow-hidden ${containerClass}`}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                        <Activity size={18} />
                    </div>
                    <div>
                        <h3 className={`font-semibold ${textClass}`}>Open Positions</h3>
                        <p className={`text-xs ${mutedClass}`}>
                            {positions.length} position{positions.length !== 1 ? 's' : ''} •
                            {lastUpdate && ` Updated ${lastUpdate.toLocaleTimeString()}`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                            className="rounded"
                        />
                        <span className={`text-xs ${mutedClass}`}>Auto</span>
                    </label>
                    <button
                        onClick={fetchPositions}
                        disabled={loading}
                        className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}
                    >
                        <RefreshCw size={16} className={`${mutedClass} ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Floating P&L */}
            {positions.length > 0 && (
                <div className={`px-4 py-3 ${headerClass}`}>
                    <div className="flex items-center justify-between">
                        <span className={`text-sm ${mutedClass}`}>Floating P&L</span>
                        <span className={`text-lg font-bold ${totalProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(2)}
                        </span>
                    </div>
                </div>
            )}

            {/* Table */}
            {error ? (
                <div className={`p-8 text-center ${mutedClass}`}>
                    <p>⚠️ {error}</p>
                    <button
                        onClick={fetchPositions}
                        className="mt-2 text-sm text-blue-500 hover:underline"
                    >
                        Try again
                    </button>
                </div>
            ) : positions.length === 0 ? (
                <div className={`p-8 text-center ${mutedClass}`}>
                    <Activity size={32} className="mx-auto mb-2 opacity-50" />
                    <p>No open positions</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className={headerClass}>
                                <th className={`px-4 py-2 text-left text-xs font-medium ${mutedClass}`}>Symbol</th>
                                <th className={`px-4 py-2 text-left text-xs font-medium ${mutedClass}`}>Type</th>
                                <th className={`px-4 py-2 text-right text-xs font-medium ${mutedClass}`}>Volume</th>
                                <th className={`px-4 py-2 text-right text-xs font-medium ${mutedClass}`}>Entry</th>
                                <th className={`px-4 py-2 text-right text-xs font-medium ${mutedClass}`}>Current</th>
                                <th className={`px-4 py-2 text-right text-xs font-medium ${mutedClass}`}>P&L</th>
                            </tr>
                        </thead>
                        <tbody>
                            {positions.map(pos => (
                                <tr key={pos.ticket} className={`border-t ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
                                    <td className={`px-4 py-3 font-medium ${textClass}`}>{pos.symbol}</td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium
                                            ${pos.type.toLowerCase() === 'buy'
                                                ? 'bg-emerald-500/20 text-emerald-400'
                                                : 'bg-rose-500/20 text-rose-400'}`}
                                        >
                                            {pos.type.toLowerCase() === 'buy'
                                                ? <TrendingUp size={12} />
                                                : <TrendingDown size={12} />}
                                            {pos.type}
                                        </span>
                                    </td>
                                    <td className={`px-4 py-3 text-right text-sm ${textClass}`}>{pos.volume}</td>
                                    <td className={`px-4 py-3 text-right text-sm ${mutedClass}`}>{pos.entry_price}</td>
                                    <td className={`px-4 py-3 text-right text-sm ${textClass}`}>{pos.current_price}</td>
                                    <td className={`px-4 py-3 text-right text-sm font-medium ${pos.profit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {pos.profit >= 0 ? '+' : ''}${pos.profit.toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
