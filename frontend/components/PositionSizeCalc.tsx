'use client';

import React, { useState } from 'react';
import { Calculator, DollarSign, TrendingDown, Target, RefreshCw } from 'lucide-react';
import { MetricLabel } from './Tooltip';

interface PositionSizeCalcProps {
    isDark?: boolean;
    accountBalance?: number;
}

export default function PositionSizeCalc({ isDark = true, accountBalance = 10000 }: PositionSizeCalcProps) {
    const [balance, setBalance] = useState(accountBalance);
    const [riskPercent, setRiskPercent] = useState(1);
    const [stopLossPips, setStopLossPips] = useState(20);
    const [pipValue, setPipValue] = useState(10); // $10 per lot per pip for most pairs

    // Calculate position size
    const riskAmount = balance * (riskPercent / 100);
    const lotSize = stopLossPips > 0 ? riskAmount / (stopLossPips * pipValue) : 0;

    // Styles
    const containerClass = isDark
        ? 'bg-slate-900/50 border border-slate-800/50'
        : 'bg-white border border-gray-100 shadow-sm';
    const inputClass = isDark
        ? 'bg-slate-800 border-slate-700 text-white'
        : 'bg-gray-50 border-gray-200 text-gray-900';
    const textClass = isDark ? 'text-white' : 'text-gray-900';
    const mutedClass = isDark ? 'text-slate-400' : 'text-gray-500';

    return (
        <div className={`rounded-2xl p-6 ${containerClass}`}>
            <div className="flex items-center gap-2 mb-6">
                <div className={`p-2 rounded-lg ${isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                    <Calculator size={20} />
                </div>
                <h3 className={`font-semibold ${textClass}`}>Position Size Calculator</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {/* Account Balance */}
                <div>
                    <label className={`block text-sm mb-1 ${mutedClass}`}>
                        <DollarSign size={14} className="inline mr-1" />
                        Account Balance
                    </label>
                    <input
                        type="number"
                        value={balance}
                        onChange={(e) => setBalance(parseFloat(e.target.value) || 0)}
                        className={`w-full px-3 py-2 rounded-lg border ${inputClass}`}
                    />
                </div>

                {/* Risk % */}
                <div>
                    <label className={`block text-sm mb-1 ${mutedClass}`}>
                        <TrendingDown size={14} className="inline mr-1" />
                        Risk %
                    </label>
                    <input
                        type="number"
                        value={riskPercent}
                        onChange={(e) => setRiskPercent(parseFloat(e.target.value) || 0)}
                        step="0.5"
                        min="0.1"
                        max="10"
                        className={`w-full px-3 py-2 rounded-lg border ${inputClass}`}
                    />
                </div>

                {/* Stop Loss (Pips) */}
                <div>
                    <label className={`block text-sm mb-1 ${mutedClass}`}>
                        <Target size={14} className="inline mr-1" />
                        Stop Loss (Pips)
                    </label>
                    <input
                        type="number"
                        value={stopLossPips}
                        onChange={(e) => setStopLossPips(parseFloat(e.target.value) || 0)}
                        className={`w-full px-3 py-2 rounded-lg border ${inputClass}`}
                    />
                </div>

                {/* Pip Value */}
                <div>
                    <label className={`block text-sm mb-1 ${mutedClass}`}>
                        $ Pip Value / Lot
                    </label>
                    <select
                        value={pipValue}
                        onChange={(e) => setPipValue(parseFloat(e.target.value))}
                        className={`w-full px-3 py-2 rounded-lg border ${inputClass}`}
                    >
                        <option value={10}>$10 (Forex Pairs)</option>
                        <option value={1}>$1 (Gold XAUUSD)</option>
                        <option value={100}>$100 (Indices)</option>
                    </select>
                </div>
            </div>

            {/* Results */}
            <div className={`mt-6 p-4 rounded-xl ${isDark ? 'bg-slate-800/50' : 'bg-gray-50'}`}>
                <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                        <p className={`text-sm ${mutedClass}`}>
                            <MetricLabel label="Risk Amount" isDark={isDark} />
                        </p>
                        <p className={`text-2xl font-bold text-amber-500`}>
                            ${riskAmount.toFixed(2)}
                        </p>
                    </div>
                    <div>
                        <p className={`text-sm ${mutedClass}`}>
                            <MetricLabel label="Lot Size" isDark={isDark} />
                        </p>
                        <p className={`text-2xl font-bold text-emerald-500`}>
                            {lotSize.toFixed(2)}
                        </p>
                    </div>
                </div>
            </div>

            <p className={`text-xs text-center mt-4 ${mutedClass}`}>
                With {riskPercent}% risk, you can lose ${riskAmount.toFixed(2)} max per trade
            </p>
        </div>
    );
}
