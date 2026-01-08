'use client';

import React, { useMemo } from 'react';
import { Stats, Trade } from '@/lib/types';
import {
    TrendingUp,
    Activity,
    Target,
    ShieldCheck,
    Clock,
    BarChart2
} from 'lucide-react';
import AIAnalyzeButton from './AIAnalyzeButton';
import { MetricLabel } from './Tooltip';

interface AdvancedStatsProps {
    stats: Stats;
    trades: Trade[];
    totalLots: number;
    isDark?: boolean;
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

export default function AdvancedStats({ stats, trades, totalLots, isDark = true }: AdvancedStatsProps) {
    // Calculate additional metrics
    const additionalMetrics = useMemo(() => {
        if (!trades || trades.length === 0) {
            return {
                totalPips: 0,
                avgWinPips: 0,
                avgLossPips: 0,
                bestTradePips: 0,
                worstTradePips: 0,
                avgTradeDuration: '0h 0m',
                ahpr: 0,
                ghpr: 0,
                stdDev: 0,
                profitabilityPct: 50
            };
        }

        // Pips calculations
        const pipsData = trades.map(t => ({
            pips: estimatePips(t),
            profit: t.net_profit
        }));

        const totalPips = pipsData.reduce((sum, t) => sum + t.pips, 0);

        const winningTrades = trades.filter(t => t.net_profit > 0);
        const losingTrades = trades.filter(t => t.net_profit < 0);

        const avgWinPips = winningTrades.length > 0
            ? winningTrades.reduce((sum, t) => sum + estimatePips(t), 0) / winningTrades.length
            : 0;
        const avgLossPips = losingTrades.length > 0
            ? losingTrades.reduce((sum, t) => sum + estimatePips(t), 0) / losingTrades.length
            : 0;

        // Best/Worst in pips
        const allPips = trades.map(t => estimatePips(t));
        const bestTradePips = Math.max(...allPips);
        const worstTradePips = Math.min(...allPips);

        // Trade duration (if we had entry_time)
        let avgDurationMinutes = 0;
        const tradesWithEntryTime = trades.filter(t => t.entry_time);
        if (tradesWithEntryTime.length > 0) {
            const totalMinutes = tradesWithEntryTime.reduce((sum, t) => {
                if (t.entry_time) {
                    const entry = new Date(t.entry_time);
                    const exit = new Date(t.time);
                    return sum + (exit.getTime() - entry.getTime()) / 60000;
                }
                return sum;
            }, 0);
            avgDurationMinutes = totalMinutes / tradesWithEntryTime.length;
        }

        const hours = Math.floor(avgDurationMinutes / 60);
        const minutes = Math.floor(avgDurationMinutes % 60);
        const avgTradeDuration = `${hours}h ${minutes}m`;

        // AHPR (Average Holding Period Return)
        const initialBalance = 10000; // Should come from account
        const returns = trades.map(t => t.net_profit / initialBalance);
        const ahpr = returns.length > 0
            ? (returns.reduce((sum, r) => sum + r, 0) / returns.length) * 100
            : 0;

        // GHPR (Geometric Holding Period Return)
        let ghpr = 0;
        if (returns.length > 0) {
            const product = returns.reduce((prod, r) => prod * (1 + r), 1);
            ghpr = (Math.pow(product, 1 / returns.length) - 1) * 100;
        }

        // Standard Deviation
        const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
        const stdDev = Math.sqrt(variance) * initialBalance;

        // Profitability (wins / total)
        const profitabilityPct = trades.length > 0
            ? (winningTrades.length / trades.length) * 100
            : 50;

        return {
            totalPips,
            avgWinPips,
            avgLossPips,
            bestTradePips,
            worstTradePips,
            avgTradeDuration,
            ahpr,
            ghpr,
            stdDev,
            profitabilityPct
        };
    }, [trades]);

    // Styles
    const containerClass = isDark
        ? 'bg-slate-900/50 border border-slate-800/50'
        : 'bg-white border border-gray-100 shadow-sm';
    const headerClass = isDark ? 'text-slate-100' : 'text-gray-900';
    const labelClass = isDark ? 'text-slate-400' : 'text-gray-500';
    const valueClass = isDark ? 'text-slate-200' : 'text-gray-700';
    const dividerClass = isDark ? 'border-slate-800' : 'border-gray-100';

    const StatItem = ({ label, value, color, highlight }: { label: string; value: string; color?: string; highlight?: boolean }) => (
        <div className={`flex justify-between items-center py-2.5 ${highlight ? (isDark ? 'bg-slate-800/30 -mx-4 px-4 rounded-lg' : 'bg-gray-50 -mx-4 px-4 rounded-lg') : 'border-b ' + dividerClass} last:border-0`}>
            <span className={`text-sm ${labelClass}`}>
                <MetricLabel label={label} isDark={isDark} />
            </span>
            <span className={`font-semibold text-sm ${color || valueClass}`}>{value}</span>
        </div>
    );

    const profitFactorDisplay = stats.profit_factor >= 999 ? '∞' : stats.profit_factor.toFixed(2);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Trading Column */}
            <div className={`rounded-2xl p-6 ${containerClass}`}>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg ${isDark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                            <Activity size={20} />
                        </div>
                        <h3 className={`font-semibold ${headerClass}`}>Trading Activity</h3>
                    </div>
                    <AIAnalyzeButton
                        sectionName="Trading Activity"
                        sectionData={{
                            trades: stats.total_trades,
                            profitability: additionalMetrics.profitabilityPct,
                            pips: additionalMetrics.totalPips,
                            avgWinPips: additionalMetrics.avgWinPips,
                            avgWin: stats.avg_win,
                            avgLossPips: additionalMetrics.avgLossPips,
                            avgLoss: stats.avg_loss,
                            lots: totalLots
                        }}
                        isDark={isDark}
                    />
                </div>

                <div className="space-y-0">
                    <StatItem label="Trades" value={stats.total_trades.toString()} />

                    {/* Profitability Bar */}
                    <div className="py-3 border-b border-slate-800">
                        <div className="flex justify-between items-center mb-2">
                            <span className={`text-sm ${labelClass}`}>Profitability</span>
                            <span className={`text-xs ${labelClass}`}>{additionalMetrics.profitabilityPct.toFixed(0)}%</span>
                        </div>
                        <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden flex">
                            <div
                                className="h-full bg-emerald-500"
                                style={{ width: `${additionalMetrics.profitabilityPct}%` }}
                            />
                            <div
                                className="h-full bg-rose-500"
                                style={{ width: `${100 - additionalMetrics.profitabilityPct}%` }}
                            />
                        </div>
                    </div>

                    <StatItem label="Pips" value={additionalMetrics.totalPips.toFixed(1)} />
                    <StatItem
                        label="Average Win"
                        value={`${additionalMetrics.avgWinPips.toFixed(1)} pips / $${stats.avg_win.toFixed(2)}`}
                        color="text-emerald-500"
                    />
                    <StatItem
                        label="Average Loss"
                        value={`${Math.abs(additionalMetrics.avgLossPips).toFixed(1)} pips / $${Math.abs(stats.avg_loss).toFixed(2)}`}
                        color="text-rose-500"
                    />
                    <StatItem label="Lots" value={totalLots.toFixed(2)} />
                </div>
            </div>

            {/* Performance Column */}
            <div className={`rounded-2xl p-6 ${containerClass}`}>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg ${isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                            <Target size={20} />
                        </div>
                        <h3 className={`font-semibold ${headerClass}`}>Performance</h3>
                    </div>
                    <AIAnalyzeButton
                        sectionName="Performance"
                        sectionData={{
                            longsWon: stats.long_wins,
                            longsTotal: stats.long_trades,
                            longWinRate: stats.long_win_rate,
                            shortsWon: stats.short_wins,
                            shortsTotal: stats.short_trades,
                            shortWinRate: stats.short_win_rate,
                            bestTrade: stats.largest_win,
                            worstTrade: stats.largest_loss,
                            bestTradePips: additionalMetrics.bestTradePips,
                            worstTradePips: additionalMetrics.worstTradePips,
                            avgTradeDuration: additionalMetrics.avgTradeDuration
                        }}
                        isDark={isDark}
                    />
                </div>

                <div className="space-y-0">
                    <StatItem
                        label="Longs Won"
                        value={`(${stats.long_wins}/${stats.long_trades}) ${stats.long_win_rate.toFixed(0)}%`}
                    />
                    <StatItem
                        label="Shorts Won"
                        value={`(${stats.short_wins}/${stats.short_trades}) ${stats.short_win_rate.toFixed(0)}%`}
                    />
                    <StatItem
                        label="Best Trade ($)"
                        value={`$${stats.largest_win.toFixed(2)}`}
                        color="text-emerald-500"
                    />
                    <StatItem
                        label="Worst Trade ($)"
                        value={`$${stats.largest_loss.toFixed(2)}`}
                        color="text-rose-500"
                    />
                    <StatItem
                        label="Best Trade (Pips)"
                        value={`${additionalMetrics.bestTradePips.toFixed(1)}`}
                        color="text-emerald-500"
                    />
                    <StatItem
                        label="Worst Trade (Pips)"
                        value={`${additionalMetrics.worstTradePips.toFixed(1)}`}
                        color="text-rose-500"
                    />
                    <StatItem
                        label="Avg. Trade Length"
                        value={additionalMetrics.avgTradeDuration}
                    />
                </div>
            </div>

            {/* Risk Metrics Column */}
            <div className={`rounded-2xl p-6 ${containerClass}`}>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg ${isDark ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>
                            <ShieldCheck size={20} />
                        </div>
                        <h3 className={`font-semibold ${headerClass}`}>Risk Metrics</h3>
                    </div>
                    <AIAnalyzeButton
                        sectionName="Risk Metrics"
                        sectionData={{
                            profitFactor: stats.profit_factor,
                            stdDev: additionalMetrics.stdDev,
                            sharpeRatio: stats.sharpe_ratio,
                            zScore: stats.z_score,
                            expectancy: stats.expectancy,
                            ahpr: additionalMetrics.ahpr,
                            ghpr: additionalMetrics.ghpr,
                            maxDrawdown: stats.max_drawdown_pct
                        }}
                        isDark={isDark}
                    />
                </div>

                <div className="space-y-0">
                    <StatItem label="Profit Factor" value={profitFactorDisplay} highlight />
                    <StatItem
                        label="Standard Deviation"
                        value={`$${additionalMetrics.stdDev.toFixed(2)}`}
                    />
                    <StatItem label="Sharpe Ratio" value={stats.sharpe_ratio.toFixed(2)} />
                    <StatItem
                        label="Z-Score (Probability)"
                        value={`${stats.z_score.toFixed(2)} (${Math.min(99.99, Math.abs(stats.z_score) * 15).toFixed(2)}%)`}
                    />
                    <StatItem
                        label="Expectancy"
                        value={`${(additionalMetrics.avgWinPips * stats.win_rate_pct / 100 + additionalMetrics.avgLossPips * (1 - stats.win_rate_pct / 100)).toFixed(1)} Pips / $${stats.expectancy.toFixed(2)}`}
                    />
                    <StatItem
                        label="AHPR"
                        value={`${additionalMetrics.ahpr.toFixed(2)}%`}
                        color={additionalMetrics.ahpr >= 0 ? 'text-emerald-400' : 'text-rose-400'}
                    />
                    <StatItem
                        label="GHPR"
                        value={`${additionalMetrics.ghpr.toFixed(2)}%`}
                        color={additionalMetrics.ghpr >= 0 ? 'text-emerald-400' : 'text-rose-400'}
                    />
                </div>
            </div>
        </div>
    );
}
