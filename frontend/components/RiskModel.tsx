'use client';

import React, { useMemo } from 'react';
import { Trade, Stats } from '@/lib/types';
import { Shield, TrendingUp, TrendingDown, Target, AlertTriangle, BarChart3, Percent } from 'lucide-react';
import AIAnalyzeButton from './AIAnalyzeButton';
import { MetricLabel } from './Tooltip';

interface RiskModelProps {
    trades: Trade[];
    stats: Stats;
    isDark?: boolean;
}

export default function RiskModel({ trades, stats, isDark = true }: RiskModelProps) {
    const riskMetrics = useMemo(() => {
        if (trades.length === 0 || !stats) {
            return null;
        }

        const initialBalance = stats.initial_balance;

        // Calculate % returns per trade
        const tradeReturns = trades.map(t => (t.net_profit / initialBalance) * 100);

        // Average return per trade (%)
        const avgReturnPct = tradeReturns.reduce((a, b) => a + b, 0) / tradeReturns.length;

        // Standard deviation of returns (%)
        const variance = tradeReturns.reduce((sum, r) => sum + Math.pow(r - avgReturnPct, 2), 0) / tradeReturns.length;
        const stdDevPct = Math.sqrt(variance);

        // Win/Loss returns
        const winReturns = tradeReturns.filter(r => r > 0);
        const lossReturns = tradeReturns.filter(r => r < 0);

        const avgWinPct = winReturns.length > 0 ? winReturns.reduce((a, b) => a + b, 0) / winReturns.length : 0;
        const avgLossPct = lossReturns.length > 0 ? Math.abs(lossReturns.reduce((a, b) => a + b, 0) / lossReturns.length) : 0;

        // Best/Worst trade (%)
        const bestTradePct = Math.max(...tradeReturns);
        const worstTradePct = Math.min(...tradeReturns);

        // Win Rate
        const winRate = (winReturns.length / trades.length) * 100;

        // Risk:Reward Ratio
        const riskRewardRatio = avgLossPct > 0 ? avgWinPct / avgLossPct : 0;

        // Expectancy (%)
        const expectancyPct = (winRate / 100 * avgWinPct) - ((1 - winRate / 100) * avgLossPct);

        // Kelly Criterion (optimal position size %)
        const kellyPct = avgLossPct > 0
            ? ((winRate / 100 * riskRewardRatio) - (1 - winRate / 100)) / riskRewardRatio * 100
            : 0;
        const kellyHalf = kellyPct / 2; // Conservative Kelly

        // Profit Factor
        const totalWins = winReturns.reduce((a, b) => a + b, 0);
        const totalLosses = Math.abs(lossReturns.reduce((a, b) => a + b, 0));
        const profitFactor = totalLosses > 0 ? totalWins / totalLosses : 0;

        // Payoff Ratio (avg win / avg loss)
        const payoffRatio = avgLossPct > 0 ? avgWinPct / avgLossPct : 0;

        // Break-even Win Rate
        const breakEvenWinRate = avgWinPct + avgLossPct > 0
            ? (avgLossPct / (avgWinPct + avgLossPct)) * 100
            : 50;

        // Edge (actual win rate - break-even win rate)
        const edge = winRate - breakEvenWinRate;

        // Consecutive losses needed for X% drawdown
        const drawdownLevels = [10, 20, 30, 50];
        const consecutiveLosses = drawdownLevels.map(dd => {
            if (avgLossPct <= 0) return { level: dd, trades: 999 };
            return {
                level: dd,
                trades: Math.ceil(dd / avgLossPct)
            };
        });

        // Risk of Ruin (simplified)
        const lossRate = 1 - winRate / 100;
        const ruinProbability = Math.pow(lossRate / (winRate / 100), 10) * 100;

        // CAGR approximation (based on average trade and frequency)
        const tradingDays = trades.length > 1
            ? Math.ceil((new Date(trades[0].time).getTime() - new Date(trades[trades.length - 1].time).getTime()) / (1000 * 60 * 60 * 24))
            : 30;
        const tradesPerYear = (trades.length / tradingDays) * 252;
        const annualizedReturn = expectancyPct * tradesPerYear;

        return {
            // Per Trade Metrics
            avgReturnPct,
            stdDevPct,
            avgWinPct,
            avgLossPct,
            bestTradePct,
            worstTradePct,

            // Risk Metrics
            winRate,
            riskRewardRatio,
            expectancyPct,
            profitFactor,
            payoffRatio,

            // Position Sizing
            kellyPct,
            kellyHalf,

            // Edge Analysis
            breakEvenWinRate,
            edge,

            // Risk Assessment
            consecutiveLosses,
            ruinProbability: Math.min(100, Math.max(0, ruinProbability)),

            // Annualized
            tradesPerYear,
            annualizedReturn,

            // Raw data for AI
            totalTrades: trades.length,
            winningTrades: winReturns.length,
            losingTrades: lossReturns.length
        };
    }, [trades, stats]);

    // Styles
    const containerClass = isDark
        ? 'bg-slate-900/50 border border-slate-800/50'
        : 'bg-white border border-gray-100 shadow-sm';
    const textClass = isDark ? 'text-slate-200' : 'text-gray-800';
    const mutedClass = isDark ? 'text-slate-400' : 'text-gray-500';
    const cardClass = isDark
        ? 'bg-slate-800/50 rounded-xl p-4'
        : 'bg-gray-50 rounded-xl p-4';
    const dividerClass = isDark ? 'divide-slate-700/50' : 'divide-gray-200';
    const borderClass = isDark ? 'border-slate-700/50' : 'border-gray-200';

    if (!riskMetrics) {
        return (
            <div className={`rounded-2xl p-6 ${containerClass}`}>
                <div className="text-center py-8">
                    <Shield className={`mx-auto mb-4 ${mutedClass}`} size={48} />
                    <p className={mutedClass}>ไม่มีข้อมูลสำหรับ Risk Model</p>
                </div>
            </div>
        );
    }

    const StatCard = ({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) => (
        <div className={cardClass}>
            <div className="flex items-center gap-2 mb-4">
                <Icon size={18} className="text-indigo-400" />
                <h4 className={`font-semibold ${textClass}`}>{title}</h4>
            </div>
            {children}
        </div>
    );

    const MetricRow = ({ label, value, color, highlight }: { label: string; value: string; color?: string; highlight?: boolean }) => (
        <div className={`flex justify-between items-center py-2 ${highlight ? 'font-semibold' : ''}`}>
            <span className={mutedClass}>
                <MetricLabel label={label} isDark={isDark} />
            </span>
            <span className={color || textClass}>{value}</span>
        </div>
    );

    const getKellyColor = (kelly: number) => {
        if (kelly <= 0) return 'text-rose-400';
        if (kelly < 5) return 'text-amber-400';
        if (kelly < 15) return 'text-emerald-400';
        return 'text-cyan-400';
    };

    const getEdgeColor = (edge: number) => {
        if (edge < 0) return 'text-rose-400';
        if (edge < 5) return 'text-amber-400';
        if (edge < 15) return 'text-emerald-400';
        return 'text-cyan-400';
    };

    return (
        <div className={`rounded-2xl overflow-hidden ${containerClass}`}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                    <Shield size={20} className="text-indigo-400" />
                    <h3 className={`font-semibold text-lg ${textClass}`}>Risk Model</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-600'}`}>
                        % Based
                    </span>
                </div>
                <AIAnalyzeButton
                    sectionName="Risk Model"
                    sectionData={riskMetrics}
                    isDark={isDark}
                />
            </div>

            <div className="p-4 space-y-4">
                {/* 🎯 RECOMMENDATION SECTION */}
                {(() => {
                    // Calculate recommended position size based on all metrics
                    const { kellyHalf, edge, winRate, profitFactor, expectancyPct, avgLossPct, stdDevPct, ruinProbability } = riskMetrics;

                    // Score-based recommendation (0-100)
                    let riskScore = 50; // Base score

                    // Adjust based on edge
                    if (edge > 15) riskScore += 20;
                    else if (edge > 10) riskScore += 15;
                    else if (edge > 5) riskScore += 10;
                    else if (edge > 0) riskScore += 5;
                    else riskScore -= 20;

                    // Adjust based on win rate
                    if (winRate >= 50) riskScore += 10;
                    else riskScore -= 10;

                    // Adjust based on profit factor
                    if (profitFactor >= 2) riskScore += 15;
                    else if (profitFactor >= 1.5) riskScore += 10;
                    else if (profitFactor >= 1.2) riskScore += 5;
                    else if (profitFactor < 1) riskScore -= 20;

                    // Adjust based on expectancy
                    if (expectancyPct > 0.5) riskScore += 10;
                    else if (expectancyPct > 0) riskScore += 5;
                    else riskScore -= 15;

                    // Adjust based on consistency (std dev)
                    if (stdDevPct < avgLossPct) riskScore += 5;
                    else if (stdDevPct > avgLossPct * 2) riskScore -= 10;

                    // Cap score
                    riskScore = Math.max(0, Math.min(100, riskScore));

                    // Determine recommended position size
                    let recommendedPct: number;
                    let riskLevel: 'conservative' | 'moderate' | 'aggressive';
                    let recommendation: string;
                    let additionalAdvice: string[] = [];

                    if (riskScore >= 75) {
                        // Strong system
                        recommendedPct = Math.min(kellyHalf, 5);
                        riskLevel = 'moderate';
                        recommendation = 'ระบบมีความแข็งแกร่ง สามารถใช้ Half-Kelly ได้';
                        if (profitFactor >= 2) additionalAdvice.push('✅ Profit Factor ยอดเยี่ยม (≥2)');
                        if (edge >= 10) additionalAdvice.push('✅ Edge สูง - มีความได้เปรียบชัดเจน');
                    } else if (riskScore >= 50) {
                        // Decent system
                        recommendedPct = Math.min(kellyHalf / 2, 3);
                        riskLevel = 'moderate';
                        recommendation = 'ระบบดี แต่ควรใช้ 1/4 Kelly เพื่อความปลอดภัย';
                        if (winRate < 50) additionalAdvice.push('⚠️ Win Rate ต่ำกว่า 50% - ต้องพึ่ง R:R');
                    } else if (riskScore >= 30) {
                        // Marginal system
                        recommendedPct = Math.min(1, kellyHalf / 4);
                        riskLevel = 'conservative';
                        recommendation = 'ระบบพอใช้ได้ แต่ต้องระวัง ใช้ position size เล็ก';
                        additionalAdvice.push('⚠️ ควรปรับปรุงระบบก่อนเพิ่ม position size');
                    } else {
                        // Weak system
                        recommendedPct = 0.5;
                        riskLevel = 'conservative';
                        recommendation = '⚠️ ระบบยังไม่แข็งแกร่งพอ ใช้ position size ต่ำมาก';
                        additionalAdvice.push('❌ ควรทบทวนและปรับปรุง strategy');
                        if (expectancyPct <= 0) additionalAdvice.push('❌ Expectancy ติดลบ - ระบบขาดทุนในระยะยาว');
                    }

                    // Additional specific advice
                    if (avgLossPct > 2) additionalAdvice.push('⚠️ Avg Loss สูง - ควรใช้ SL ที่แคบลง');
                    if (stdDevPct > 3) additionalAdvice.push('⚠️ ความผันผวนสูง - ผลลัพธ์ไม่สม่ำเสมอ');
                    if (ruinProbability > 5) additionalAdvice.push('🔴 Risk of Ruin สูง - ลด position size');

                    const riskLevelColors = {
                        conservative: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
                        moderate: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
                        aggressive: { bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/30' }
                    };

                    const colors = riskLevelColors[riskLevel];

                    return (
                        <div className={`rounded-xl p-5 border-2 ${colors.border} ${colors.bg}`}>
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0">
                                    <Target size={32} className={colors.text} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className={`text-lg font-bold ${textClass}`}>
                                            🎯 Trade ต่อไป: ใช้ <span className={colors.text}>{recommendedPct.toFixed(1)}%</span> ต่อไม้
                                        </h3>
                                        <span className={`text-xs px-2 py-1 rounded-full ${colors.bg} ${colors.text} border ${colors.border}`}>
                                            {riskLevel === 'conservative' ? 'Conservative' : riskLevel === 'moderate' ? 'Moderate' : 'Aggressive'}
                                        </span>
                                    </div>
                                    <p className={mutedClass}>{recommendation}</p>

                                    {additionalAdvice.length > 0 && (
                                        <div className="mt-3 space-y-1">
                                            {additionalAdvice.map((advice, i) => (
                                                <p key={i} className={`text-sm ${mutedClass}`}>{advice}</p>
                                            ))}
                                        </div>
                                    )}

                                    {/* Score indicator */}
                                    <div className="mt-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-xs ${mutedClass}`}>System Score</span>
                                            <span className={`text-xs font-semibold ${colors.text}`}>{riskScore}/100</span>
                                        </div>
                                        <div className="w-full bg-slate-700/50 rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full transition-all ${riskScore >= 75 ? 'bg-emerald-500' :
                                                    riskScore >= 50 ? 'bg-cyan-500' :
                                                        riskScore >= 30 ? 'bg-amber-500' : 'bg-rose-500'
                                                    }`}
                                                style={{ width: `${riskScore}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className={`${cardClass} text-center`}>
                        <p className={`text-xs ${mutedClass} mb-1`}>Avg Return/Trade</p>
                        <p className={`text-xl font-bold ${riskMetrics.avgReturnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {riskMetrics.avgReturnPct >= 0 ? '+' : ''}{riskMetrics.avgReturnPct.toFixed(3)}%
                        </p>
                    </div>
                    <div className={`${cardClass} text-center`}>
                        <p className={`text-xs ${mutedClass} mb-1`}>Expectancy</p>
                        <p className={`text-xl font-bold ${riskMetrics.expectancyPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {riskMetrics.expectancyPct >= 0 ? '+' : ''}{riskMetrics.expectancyPct.toFixed(3)}%
                        </p>
                    </div>
                    <div className={`${cardClass} text-center`}>
                        <p className={`text-xs ${mutedClass} mb-1`}>Kelly Criterion</p>
                        <p className={`text-xl font-bold ${getKellyColor(riskMetrics.kellyHalf)}`}>
                            {riskMetrics.kellyHalf.toFixed(1)}%
                        </p>
                    </div>
                    <div className={`${cardClass} text-center`}>
                        <p className={`text-xs ${mutedClass} mb-1`}>Edge</p>
                        <p className={`text-xl font-bold ${getEdgeColor(riskMetrics.edge)}`}>
                            {riskMetrics.edge >= 0 ? '+' : ''}{riskMetrics.edge.toFixed(1)}%
                        </p>
                    </div>
                </div>

                {/* Detailed Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Per Trade Returns */}
                    <StatCard title="Returns per Trade (%)" icon={Percent}>
                        <div className={`divide-y ${dividerClass}`}>
                            <MetricRow label="Average Return" value={`${riskMetrics.avgReturnPct >= 0 ? '+' : ''}${riskMetrics.avgReturnPct.toFixed(3)}%`}
                                color={riskMetrics.avgReturnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'} />
                            <MetricRow label="Std Deviation" value={`${riskMetrics.stdDevPct.toFixed(3)}%`} />
                            <MetricRow label="Avg Win" value={`+${riskMetrics.avgWinPct.toFixed(3)}%`} color="text-emerald-400" />
                            <MetricRow label="Avg Loss" value={`-${riskMetrics.avgLossPct.toFixed(3)}%`} color="text-rose-400" />
                            <MetricRow label="Best Trade" value={`+${riskMetrics.bestTradePct.toFixed(3)}%`} color="text-cyan-400" />
                            <MetricRow label="Worst Trade" value={`${riskMetrics.worstTradePct.toFixed(3)}%`} color="text-rose-400" />
                        </div>
                    </StatCard>

                    {/* Risk Ratios */}
                    <StatCard title="Risk Ratios" icon={BarChart3}>
                        <div className={`divide-y ${dividerClass}`}>
                            <MetricRow label="Win Rate" value={`${riskMetrics.winRate.toFixed(1)}%`}
                                color={riskMetrics.winRate >= 50 ? 'text-emerald-400' : 'text-amber-400'} />
                            <MetricRow label="Risk:Reward" value={`1:${riskMetrics.riskRewardRatio.toFixed(2)}`} />
                            <MetricRow label="Payoff Ratio" value={riskMetrics.payoffRatio.toFixed(2)} />
                            <MetricRow label="Profit Factor" value={riskMetrics.profitFactor.toFixed(2)}
                                color={riskMetrics.profitFactor >= 1.5 ? 'text-emerald-400' : riskMetrics.profitFactor >= 1 ? 'text-amber-400' : 'text-rose-400'} />
                            <MetricRow label="Break-Even WR" value={`${riskMetrics.breakEvenWinRate.toFixed(1)}%`} />
                            <MetricRow label="Edge" value={`${riskMetrics.edge >= 0 ? '+' : ''}${riskMetrics.edge.toFixed(1)}%`}
                                color={getEdgeColor(riskMetrics.edge)} highlight />
                        </div>
                    </StatCard>

                    {/* Position Sizing */}
                    <StatCard title="Position Sizing" icon={Target}>
                        <div className={`divide-y ${dividerClass}`}>
                            <MetricRow label="Kelly Full" value={`${riskMetrics.kellyPct.toFixed(1)}%`}
                                color={getKellyColor(riskMetrics.kellyPct)} />
                            <MetricRow label="Kelly Half (แนะนำ)" value={`${riskMetrics.kellyHalf.toFixed(1)}%`}
                                color={getKellyColor(riskMetrics.kellyHalf)} highlight />
                            <MetricRow label="Conservative (1/4 Kelly)" value={`${(riskMetrics.kellyPct / 4).toFixed(1)}%`} />
                        </div>
                        <div className={`mt-4 p-3 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-gray-100'}`}>
                            <p className={`text-xs ${mutedClass}`}>
                                💡 Kelly Criterion แนะนำ position size ที่เหมาะสม ใช้ Half-Kelly (÷2) เพื่อลดความเสี่ยง
                            </p>
                        </div>
                    </StatCard>
                </div>

                {/* Drawdown Risk Table */}
                <div className={cardClass}>
                    <div className="flex items-center gap-2 mb-4">
                        <AlertTriangle size={18} className="text-amber-400" />
                        <h4 className={`font-semibold ${textClass}`}>Drawdown Risk Analysis</h4>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className={isDark ? 'text-slate-400' : 'text-gray-500'}>
                                    <th className="text-left py-2">Drawdown Level</th>
                                    <th className="text-center py-2">Consecutive Losses</th>
                                    <th className="text-center py-2">Probability</th>
                                </tr>
                            </thead>
                            <tbody>
                                {riskMetrics.consecutiveLosses.map(({ level, trades }) => {
                                    const lossRate = 1 - riskMetrics.winRate / 100;
                                    const probability = Math.pow(lossRate, trades) * 100;
                                    return (
                                        <tr key={level} className={`border-t ${borderClass}`}>
                                            <td className={`py-2 ${textClass}`}>{level}% Drawdown</td>
                                            <td className="py-2 text-center text-amber-400">{trades} trades</td>
                                            <td className={`py-2 text-center ${probability < 1 ? 'text-emerald-400' : probability < 5 ? 'text-amber-400' : 'text-rose-400'}`}>
                                                {probability < 0.01 ? '<0.01%' : probability.toFixed(2) + '%'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Annualized Projections */}
                <div className={cardClass}>
                    <div className="flex items-center gap-2 mb-4">
                        <TrendingUp size={18} className="text-emerald-400" />
                        <h4 className={`font-semibold ${textClass}`}>Annualized Projections</h4>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                            <p className={`text-xs ${mutedClass}`}>Trades/Year (est.)</p>
                            <p className={`text-lg font-semibold ${textClass}`}>{riskMetrics.tradesPerYear.toFixed(0)}</p>
                        </div>
                        <div>
                            <p className={`text-xs ${mutedClass}`}>Expected Annual Return</p>
                            <p className={`text-lg font-semibold ${riskMetrics.annualizedReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {riskMetrics.annualizedReturn >= 0 ? '+' : ''}{riskMetrics.annualizedReturn.toFixed(1)}%
                            </p>
                        </div>
                        <div>
                            <p className={`text-xs ${mutedClass}`}>Risk of Ruin (10 trades)</p>
                            <p className={`text-lg font-semibold ${riskMetrics.ruinProbability < 1 ? 'text-emerald-400' : riskMetrics.ruinProbability < 10 ? 'text-amber-400' : 'text-rose-400'}`}>
                                {riskMetrics.ruinProbability < 0.01 ? '<0.01%' : riskMetrics.ruinProbability.toFixed(2) + '%'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
