'use client';

import React, { useMemo } from 'react';
import { Trade } from '@/lib/types';
import { AlertTriangle } from 'lucide-react';
import AIAnalyzeButton from './AIAnalyzeButton';
import { MetricLabel } from './Tooltip';

interface RiskOfRuinProps {
    trades: Trade[];
    isDark?: boolean;
}

export default function RiskOfRuin({ trades, isDark = true }: RiskOfRuinProps) {
    const riskData = useMemo(() => {
        if (trades.length === 0) {
            return {
                lossLevels: [],
                maxConsecutiveLosses: 0
            };
        }

        // Calculate win rate and average win/loss ratio
        const wins = trades.filter(t => t.net_profit > 0);
        const losses = trades.filter(t => t.net_profit < 0);

        const winRate = trades.length > 0 ? wins.length / trades.length : 0.5;
        const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.net_profit, 0) / wins.length : 0;
        const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + t.net_profit, 0) / losses.length) : 1;

        // Risk to reward ratio
        const riskReward = avgLoss > 0 ? avgWin / avgLoss : 1;

        // Loss levels to calculate
        const lossLevels = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10];

        // Calculate consecutive losses needed for each loss level
        // Using geometric formula: initial * (1 - loss_per_trade)^n = remaining
        // Simplified: probability of ruin and consecutive losses
        const lossPerTradeAvg = avgLoss / 10000; // Assuming $10000 balance

        const results = lossLevels.map(lossPercent => {
            const remainingPercent = (100 - lossPercent) / 100;

            // Number of consecutive losses to reach this level (rough estimate)
            let consecutiveLosses = 0;
            if (lossPerTradeAvg > 0) {
                consecutiveLosses = Math.ceil(Math.log(remainingPercent) / Math.log(1 - lossPerTradeAvg));
            }
            if (consecutiveLosses < 0 || !isFinite(consecutiveLosses)) {
                consecutiveLosses = Math.ceil(lossPercent / (lossPerTradeAvg * 100));
            }

            // Probability of loss (simplified model)
            // P(ruin) = ((1-p)/p)^n where p is win rate, n is trades needed
            const lossRate = 1 - winRate;
            let probability = 0;

            if (winRate > 0.5) {
                probability = Math.pow(lossRate / winRate, consecutiveLosses) * 100;
            } else {
                // Higher probability for lower win rates
                probability = Math.pow(lossRate, consecutiveLosses / 10) * 100;
            }

            probability = Math.max(0, Math.min(100, probability));

            return {
                lossSize: lossPercent,
                probability: probability,
                consecutiveLosses: Math.max(1, consecutiveLosses)
            };
        });

        // Calculate max consecutive losses in actual history
        let maxConsLosses = 0;
        let currentStreak = 0;
        trades.forEach(t => {
            if (t.net_profit < 0) {
                currentStreak++;
                maxConsLosses = Math.max(maxConsLosses, currentStreak);
            } else {
                currentStreak = 0;
            }
        });

        return {
            lossLevels: results,
            maxConsecutiveLosses: maxConsLosses
        };
    }, [trades]);

    // Styles
    const containerClass = isDark
        ? 'bg-slate-900/50 border border-slate-800/50'
        : 'bg-white border border-gray-100 shadow-sm';
    const textClass = isDark ? 'text-slate-200' : 'text-gray-800';
    const mutedClass = isDark ? 'text-slate-400' : 'text-gray-500';
    const headerClass = isDark ? 'bg-slate-800/50' : 'bg-gray-50';

    const getProbabilityColor = (prob: number) => {
        if (prob < 0.1) return isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700';
        if (prob < 1) return isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700';
        if (prob < 10) return isDark ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-700';
        return isDark ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-100 text-rose-700';
    };

    if (trades.length === 0) {
        return (
            <div className={`rounded-2xl p-6 ${containerClass}`}>
                <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle size={18} className="text-amber-500" />
                    <h3 className={`font-semibold ${textClass}`}>Risk of Ruin</h3>
                </div>
                <div className={`text-center py-8 ${mutedClass}`}>
                    No trade data available
                </div>
            </div>
        );
    }

    return (
        <div className={`rounded-2xl overflow-hidden ${containerClass}`}>
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                    <AlertTriangle size={18} className="text-amber-500" />
                    <h3 className={`font-semibold ${textClass}`}>Risk of Ruin</h3>
                </div>
                <AIAnalyzeButton
                    sectionName="Risk of Ruin"
                    sectionData={riskData}
                    isDark={isDark}
                />
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className={headerClass}>
                            <th className={`px-4 py-3 text-left text-xs font-medium ${mutedClass}`}>
                                <MetricLabel label="Loss Size" isDark={isDark} />
                            </th>
                            {riskData.lossLevels.map(level => (
                                <th key={level.lossSize} className={`px-2 py-3 text-center text-xs font-medium ${mutedClass}`}>
                                    {level.lossSize}%
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        <tr className={`border-t ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
                            <td className={`px-4 py-3 text-sm ${textClass}`}>
                                <MetricLabel label="Probability of Loss" isDark={isDark} />
                            </td>
                            {riskData.lossLevels.map(level => (
                                <td key={level.lossSize} className="px-2 py-3 text-center">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${getProbabilityColor(level.probability)}`}>
                                        {level.probability < 0.01 ? '<0.01' : level.probability.toFixed(2)}%
                                    </span>
                                </td>
                            ))}
                        </tr>
                        <tr className={`border-t ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
                            <td className={`px-4 py-3 text-sm ${textClass}`}>
                                <MetricLabel label="Consecutive Losing Trades" isDark={isDark} />
                            </td>
                            {riskData.lossLevels.map(level => (
                                <td key={level.lossSize} className={`px-2 py-3 text-center text-sm ${textClass}`}>
                                    {level.consecutiveLosses}
                                </td>
                            ))}
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className={`px-4 py-3 border-t ${isDark ? 'border-slate-800 bg-slate-800/30' : 'border-gray-100 bg-gray-50'}`}>
                <p className={`text-xs ${mutedClass}`}>
                    Max consecutive losses in history: <span className="text-rose-400 font-medium">{riskData.maxConsecutiveLosses}</span>
                </p>
            </div>
        </div>
    );
}
