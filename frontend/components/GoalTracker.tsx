'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Target, Trophy, Calendar, TrendingUp, Edit2, Check, X } from 'lucide-react';
import { Trade } from '@/lib/types';

interface GoalTrackerProps {
    trades: Trade[];
    isDark?: boolean;
}

interface Goal {
    id: string;
    type: 'daily' | 'weekly' | 'monthly';
    target: number;
    createdAt: string;
}

const STORAGE_KEY = 'trade_goals';

const loadGoals = (): Goal[] => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [
        { id: '1', type: 'daily', target: 100, createdAt: new Date().toISOString() },
        { id: '2', type: 'weekly', target: 500, createdAt: new Date().toISOString() },
        { id: '3', type: 'monthly', target: 2000, createdAt: new Date().toISOString() },
    ];
};

const saveGoals = (goals: Goal[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
};

export default function GoalTracker({ trades, isDark = true }: GoalTrackerProps) {
    const [goals, setGoals] = useState<Goal[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');

    useEffect(() => {
        setGoals(loadGoals());
    }, []);

    // Calculate profits for each period
    const profits = useMemo(() => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Week start (Monday)
        const dayOfWeek = now.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() + mondayOffset);

        // Month start
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const dailyProfit = trades
            .filter(t => new Date(t.time) >= today)
            .reduce((sum, t) => sum + t.net_profit, 0);

        const weeklyProfit = trades
            .filter(t => new Date(t.time) >= weekStart)
            .reduce((sum, t) => sum + t.net_profit, 0);

        const monthlyProfit = trades
            .filter(t => new Date(t.time) >= monthStart)
            .reduce((sum, t) => sum + t.net_profit, 0);

        return { daily: dailyProfit, weekly: weeklyProfit, monthly: monthlyProfit };
    }, [trades]);

    const handleEdit = (goal: Goal) => {
        setEditingId(goal.id);
        setEditValue(goal.target.toString());
    };

    const handleSave = (id: string) => {
        const newGoals = goals.map(g =>
            g.id === id ? { ...g, target: parseFloat(editValue) || 0 } : g
        );
        setGoals(newGoals);
        saveGoals(newGoals);
        setEditingId(null);
    };

    const handleCancel = () => {
        setEditingId(null);
    };

    // Styles
    const containerClass = isDark
        ? 'bg-slate-900/50 border border-slate-800/50'
        : 'bg-white border border-gray-100 shadow-sm';
    const textClass = isDark ? 'text-white' : 'text-gray-900';
    const mutedClass = isDark ? 'text-slate-400' : 'text-gray-500';
    const inputClass = isDark
        ? 'bg-slate-800 border-slate-700 text-white'
        : 'bg-gray-50 border-gray-200 text-gray-900';

    const getGoalIcon = (type: string) => {
        switch (type) {
            case 'daily': return <Calendar size={16} className="text-blue-500" />;
            case 'weekly': return <TrendingUp size={16} className="text-purple-500" />;
            case 'monthly': return <Trophy size={16} className="text-amber-500" />;
            default: return <Target size={16} />;
        }
    };

    const getProgress = (type: 'daily' | 'weekly' | 'monthly', target: number) => {
        const current = profits[type];
        const percentage = target > 0 ? Math.min(100, (current / target) * 100) : 0;
        const isAchieved = current >= target;
        return { current, percentage, isAchieved };
    };

    return (
        <div className={`rounded-2xl p-6 ${containerClass}`}>
            <div className="flex items-center gap-2 mb-6">
                <div className={`p-2 rounded-lg ${isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
                    <Target size={20} />
                </div>
                <h3 className={`font-semibold ${textClass}`}>Goal Tracker</h3>
            </div>

            <div className="space-y-4">
                {goals.map(goal => {
                    const { current, percentage, isAchieved } = getProgress(goal.type, goal.target);
                    const isEditing = editingId === goal.id;

                    return (
                        <div key={goal.id} className={`p-4 rounded-xl ${isDark ? 'bg-slate-800/50' : 'bg-gray-50'}`}>
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    {getGoalIcon(goal.type)}
                                    <span className={`text-sm font-medium capitalize ${textClass}`}>
                                        {goal.type} Goal
                                    </span>
                                    {isAchieved && (
                                        <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full">
                                            🎉 Achieved!
                                        </span>
                                    )}
                                </div>

                                {isEditing ? (
                                    <div className="flex items-center gap-1">
                                        <span className={mutedClass}>$</span>
                                        <input
                                            type="number"
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            className={`w-20 px-2 py-1 rounded text-sm ${inputClass}`}
                                            autoFocus
                                        />
                                        <button
                                            onClick={() => handleSave(goal.id)}
                                            className="p-1 text-emerald-500 hover:bg-emerald-500/20 rounded"
                                        >
                                            <Check size={14} />
                                        </button>
                                        <button
                                            onClick={handleCancel}
                                            className="p-1 text-rose-500 hover:bg-rose-500/20 rounded"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => handleEdit(goal)}
                                        className={`flex items-center gap-1 text-sm ${mutedClass} hover:text-white`}
                                    >
                                        <span>${goal.target}</span>
                                        <Edit2 size={12} />
                                    </button>
                                )}
                            </div>

                            {/* Progress Bar */}
                            <div className={`h-3 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
                                <div
                                    className={`h-full transition-all duration-500 ${isAchieved
                                            ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                                            : current >= 0
                                                ? 'bg-gradient-to-r from-blue-600 to-purple-500'
                                                : 'bg-gradient-to-r from-rose-600 to-rose-400'
                                        }`}
                                    style={{ width: `${Math.max(0, percentage)}%` }}
                                />
                            </div>

                            {/* Stats */}
                            <div className="flex items-center justify-between mt-2">
                                <span className={`text-sm ${current >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {current >= 0 ? '+' : ''}${current.toFixed(2)}
                                </span>
                                <span className={`text-sm ${mutedClass}`}>
                                    {percentage.toFixed(1)}%
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <p className={`text-xs text-center mt-4 ${mutedClass}`}>
                Click target amount to edit • Goals reset automatically
            </p>
        </div>
    );
}
