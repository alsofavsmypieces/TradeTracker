'use client';

import React, { useState } from 'react';
import { Percent, TrendingUp, TrendingDown, Target } from 'lucide-react';
import { MetricLabel } from './Tooltip';

interface WinRateCalcProps {
    isDark?: boolean;
    initialAvgWin?: number;
    initialAvgLoss?: number;
}

export default function WinRateCalc({ isDark = true, initialAvgWin = 100, initialAvgLoss = 50 }: WinRateCalcProps) {
    const [avgWin, setAvgWin] = useState(initialAvgWin);
    const [avgLoss, setAvgLoss] = useState(Math.abs(initialAvgLoss));

    // Calculate break-even win rate
    // Break-even: (WinRate * AvgWin) = ((1 - WinRate) * AvgLoss)
    // WinRate = AvgLoss / (AvgWin + AvgLoss)
    const breakEvenWinRate = avgLoss > 0 || avgWin > 0
        ? (avgLoss / (avgWin + avgLoss)) * 100
        : 50;

    // Calculate Risk:Reward Ratio
    const riskReward = avgLoss > 0 ? avgWin / avgLoss : 0;

    // Calculate expectancy at different win rates
    const calculateExpectancy = (winRate: number) => {
        return (winRate / 100) * avgWin - ((100 - winRate) / 100) * avgLoss;
    };

    // Styles
    const containerClass = isDark
        ? 'bg-slate-900/50 border border-slate-800/50'
        : 'bg-white border border-gray-100 shadow-sm';
    const inputClass = isDark
        ? 'bg-slate-800 border-slate-700 text-white'
        : 'bg-gray-50 border-gray-200 text-gray-900';
    const textClass = isDark ? 'text-white' : 'text-gray-900';
    const mutedClass = isDark ? 'text-slate-400' : 'text-gray-500';

    // Different win rate scenarios
    const winRates = [30, 40, 50, 60, 70, 80];

    return (
        <div className={`rounded-2xl p-6 ${containerClass}`}>
            <div className="flex items-center gap-2 mb-6">
                <div className={`p-2 rounded-lg ${isDark ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>
                    <Percent size={20} />
                </div>
                <h3 className={`font-semibold ${textClass}`}>Win Rate Calculator</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {/* Average Win */}
                <div>
                    <label className={`block text-sm mb-1 ${mutedClass}`}>
                        <TrendingUp size={14} className="inline mr-1 text-emerald-500" />
                        Average Win ($)
                    </label>
                    <input
                        type="number"
                        value={avgWin}
                        onChange={(e) => setAvgWin(parseFloat(e.target.value) || 0)}
                        className={`w-full px-3 py-2 rounded-lg border ${inputClass}`}
                    />
                </div>

                {/* Average Loss */}
                <div>
                    <label className={`block text-sm mb-1 ${mutedClass}`}>
                        <TrendingDown size={14} className="inline mr-1 text-rose-500" />
                        Average Loss ($)
                    </label>
                    <input
                        type="number"
                        value={avgLoss}
                        onChange={(e) => setAvgLoss(parseFloat(e.target.value) || 0)}
                        className={`w-full px-3 py-2 rounded-lg border ${inputClass}`}
                    />
                </div>
            </div>

            {/* Main Results */}
            <div className={`mt-6 p-4 rounded-xl ${isDark ? 'bg-slate-800/50' : 'bg-gray-50'}`}>
                <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                        <p className={`text-sm ${mutedClass}`}>
                            <MetricLabel label="Break-Even Win Rate" isDark={isDark} />
                        </p>
                        <p className={`text-2xl font-bold text-amber-500`}>
                            {breakEvenWinRate.toFixed(1)}%
                        </p>
                    </div>
                    <div>
                        <p className={`text-sm ${mutedClass}`}>
                            <MetricLabel label="Risk:Reward" isDark={isDark} />
                        </p>
                        <p className={`text-2xl font-bold text-purple-500`}>
                            1:{riskReward.toFixed(2)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Expectancy Table */}
            <div className="mt-4">
                <p className={`text-sm font-medium mb-2 ${textClass}`}>💡 Expectancy by Win Rate</p>
                <div className="grid grid-cols-6 gap-2">
                    {winRates.map(wr => {
                        const exp = calculateExpectancy(wr);
                        const isProfitable = exp > 0;
                        const isBreakEven = Math.abs(wr - breakEvenWinRate) < 5;
                        return (
                            <div
                                key={wr}
                                className={`p-2 rounded-lg text-center ${isBreakEven
                                    ? (isDark ? 'bg-amber-500/20 border border-amber-500/50' : 'bg-amber-100 border border-amber-300')
                                    : isProfitable
                                        ? (isDark ? 'bg-emerald-500/10' : 'bg-emerald-50')
                                        : (isDark ? 'bg-rose-500/10' : 'bg-rose-50')
                                    }`}
                            >
                                <p className={`text-xs ${mutedClass}`}>{wr}%</p>
                                <p className={`text-sm font-bold ${isProfitable ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {exp >= 0 ? '+' : ''}${exp.toFixed(0)}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>

            <p className={`text-xs text-center mt-4 ${mutedClass}`}>
                You need at least {breakEvenWinRate.toFixed(1)}% win rate to be profitable
            </p>
        </div>
    );
}
