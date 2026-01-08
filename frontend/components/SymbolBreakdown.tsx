'use client';

import React, { useMemo } from 'react';
import { Trade } from '@/lib/types';
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import AIAnalyzeButton from './AIAnalyzeButton';
import { MetricLabel } from './Tooltip';

interface SymbolBreakdownProps {
    trades: Trade[];
    isDark?: boolean;
}

interface SymbolData {
    symbol: string;
    // Longs
    longTrades: number;
    longPips: number;
    longProfit: number;
    // Shorts
    shortTrades: number;
    shortPips: number;
    shortProfit: number;
    // Total
    totalTrades: number;
    totalPips: number;
    totalProfit: number;
    wonPct: number;
    lostPct: number;
}

// Estimate pips from trade
const estimatePips = (trade: Trade): number => {
    const symbol = trade.symbol.toLowerCase();
    const volume = trade.volume;
    if (symbol.includes('xau')) {
        return (trade.net_profit / volume) / 10;
    }
    return (trade.net_profit / volume) * 10;
};

export default function SymbolBreakdown({ trades, isDark = true }: SymbolBreakdownProps) {
    // Calculate symbol breakdown
    const symbolData = useMemo((): SymbolData[] => {
        const bySymbol: { [key: string]: SymbolData } = {};

        trades.forEach(trade => {
            if (!bySymbol[trade.symbol]) {
                bySymbol[trade.symbol] = {
                    symbol: trade.symbol,
                    longTrades: 0,
                    longPips: 0,
                    longProfit: 0,
                    shortTrades: 0,
                    shortPips: 0,
                    shortProfit: 0,
                    totalTrades: 0,
                    totalPips: 0,
                    totalProfit: 0,
                    wonPct: 0,
                    lostPct: 0
                };
            }

            const s = bySymbol[trade.symbol];
            const pips = estimatePips(trade);

            s.totalTrades++;
            s.totalPips += pips;
            s.totalProfit += trade.net_profit;

            if (trade.type === 'BUY') {
                s.longTrades++;
                s.longPips += pips;
                s.longProfit += trade.net_profit;
            } else {
                s.shortTrades++;
                s.shortPips += pips;
                s.shortProfit += trade.net_profit;
            }
        });

        // Calculate win/loss rates
        Object.values(bySymbol).forEach(s => {
            const wins = trades.filter(t => t.symbol === s.symbol && t.net_profit > 0).length;
            const losses = trades.filter(t => t.symbol === s.symbol && t.net_profit < 0).length;
            s.wonPct = s.totalTrades > 0 ? (wins / s.totalTrades) * 100 : 0;
            s.lostPct = s.totalTrades > 0 ? (losses / s.totalTrades) * 100 : 0;
        });

        return Object.values(bySymbol).sort((a, b) => b.totalProfit - a.totalProfit);
    }, [trades]);

    // Styles
    const containerClass = isDark
        ? 'bg-slate-900/50 border border-slate-800/50'
        : 'bg-white border border-gray-100 shadow-sm';
    const textClass = isDark ? 'text-slate-200' : 'text-gray-800';
    const mutedClass = isDark ? 'text-slate-400' : 'text-gray-500';
    const headerClass = isDark ? 'bg-slate-800/50 border-slate-800' : 'bg-gray-50 border-gray-100';

    return (
        <div className={`rounded-2xl overflow-hidden ${containerClass}`}>
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${isDark ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>
                        <BarChart3 size={18} />
                    </div>
                    <h3 className={`font-semibold ${textClass}`}>Trades by Symbol</h3>
                </div>
                <div className="flex items-center gap-3">
                    <AIAnalyzeButton
                        sectionName="Trades by Symbol"
                        sectionData={symbolData}
                        isDark={isDark}
                    />
                    <span className={`text-sm ${mutedClass}`}>{symbolData.length} symbols</span>
                </div>
            </div>

            {symbolData.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className={headerClass}>
                                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${mutedClass}`} rowSpan={2}>
                                    <MetricLabel label="Currency" isDark={isDark} />
                                </th>
                                <th className={`px-2 py-2 text-center text-xs font-semibold uppercase text-emerald-400 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`} colSpan={3}>
                                    <MetricLabel label="Longs" isDark={isDark} />
                                </th>
                                <th className={`px-2 py-2 text-center text-xs font-semibold uppercase text-rose-400 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`} colSpan={3}>
                                    <MetricLabel label="Shorts" isDark={isDark} />
                                </th>
                                <th className={`px-2 py-2 text-center text-xs font-semibold uppercase ${mutedClass} border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`} colSpan={5}>
                                    Total
                                </th>
                            </tr>
                            <tr className={headerClass}>
                                <th className={`px-2 py-2 text-center text-xs ${mutedClass}`}>Trades</th>
                                <th className={`px-2 py-2 text-center text-xs ${mutedClass}`}>Pips</th>
                                <th className={`px-2 py-2 text-center text-xs ${mutedClass}`}>Profit</th>
                                <th className={`px-2 py-2 text-center text-xs ${mutedClass}`}>Trades</th>
                                <th className={`px-2 py-2 text-center text-xs ${mutedClass}`}>Pips</th>
                                <th className={`px-2 py-2 text-center text-xs ${mutedClass}`}>Profit</th>
                                <th className={`px-2 py-2 text-center text-xs ${mutedClass}`}>Trades</th>
                                <th className={`px-2 py-2 text-center text-xs ${mutedClass}`}>Pips</th>
                                <th className={`px-2 py-2 text-center text-xs ${mutedClass}`}>Profit</th>
                                <th className={`px-2 py-2 text-center text-xs ${mutedClass}`}><MetricLabel label="Won(%)" isDark={isDark} /></th>
                                <th className={`px-2 py-2 text-center text-xs ${mutedClass}`}><MetricLabel label="Lost(%)" isDark={isDark} /></th>
                            </tr>
                        </thead>
                        <tbody>
                            {symbolData.map((data) => (
                                <tr key={data.symbol} className={`border-t ${isDark ? 'border-slate-800 hover:bg-slate-800/30' : 'border-gray-100 hover:bg-gray-50'}`}>
                                    <td className={`px-4 py-3 text-sm font-medium ${textClass}`}>
                                        {data.symbol}
                                    </td>
                                    {/* Longs */}
                                    <td className={`px-2 py-3 text-center text-sm ${textClass}`}>{data.longTrades}</td>
                                    <td className={`px-2 py-3 text-center text-sm ${data.longPips >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {data.longPips.toFixed(1)}
                                    </td>
                                    <td className={`px-2 py-3 text-center text-sm ${data.longProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {data.longProfit.toFixed(2)}
                                    </td>
                                    {/* Shorts */}
                                    <td className={`px-2 py-3 text-center text-sm ${textClass}`}>{data.shortTrades}</td>
                                    <td className={`px-2 py-3 text-center text-sm ${data.shortPips >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {data.shortPips.toFixed(1)}
                                    </td>
                                    <td className={`px-2 py-3 text-center text-sm ${data.shortProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {data.shortProfit.toFixed(2)}
                                    </td>
                                    {/* Total */}
                                    <td className={`px-2 py-3 text-center text-sm font-medium ${textClass}`}>{data.totalTrades}</td>
                                    <td className={`px-2 py-3 text-center text-sm font-medium ${data.totalPips >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {data.totalPips.toFixed(1)}
                                    </td>
                                    <td className={`px-2 py-3 text-center text-sm font-medium ${data.totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {data.totalProfit.toFixed(2)}
                                    </td>
                                    <td className={`px-2 py-3 text-center text-sm text-emerald-400`}>
                                        {data.wonPct.toFixed(0)}%
                                    </td>
                                    <td className={`px-2 py-3 text-center text-sm text-rose-400`}>
                                        {data.lostPct.toFixed(0)}%
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className={`text-center py-12 ${mutedClass}`}>
                    No trades to analyze
                </div>
            )}
        </div>
    );
}
