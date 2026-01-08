'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
    label: string;
    value: string;
    subValue?: string;
    icon?: LucideIcon;
    trend?: 'up' | 'down' | 'neutral';
    isDark?: boolean;
}

export default function KPICard({ label, value, subValue, icon: Icon, trend, isDark = true }: KPICardProps) {
    // Ultra-clean glass/modern styles
    const cardStyles = isDark
        ? 'bg-slate-900/50 backdrop-blur-md border border-slate-800/50 shadow-xl'
        : 'bg-white border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]';

    const labelColor = isDark ? 'text-slate-400' : 'text-gray-500';
    const valueColor = isDark ? 'text-slate-100' : 'text-gray-900';
    const subValueColor = isDark ? 'text-slate-500' : 'text-gray-400';
    const iconBg = isDark ? 'bg-slate-800/50 text-slate-400' : 'bg-gray-50 text-gray-400';

    let trendColor = '';
    if (trend === 'up') trendColor = 'text-emerald-500';
    if (trend === 'down') trendColor = 'text-rose-500';
    if (trend === 'neutral') trendColor = isDark ? 'text-slate-400' : 'text-gray-400';

    return (
        <div className={`rounded-2xl p-6 transition-all duration-300 hover:translate-y-[-2px] ${cardStyles}`}>
            <div className="flex items-start justify-between mb-4">
                <div className={`text-sm font-medium tracking-wide ${labelColor}`}>
                    {label}
                </div>
                {Icon && (
                    <div className={`p-2 rounded-xl ${iconBg}`}>
                        <Icon size={18} strokeWidth={2} />
                    </div>
                )}
            </div>

            <div className="flex items-baseline gap-2">
                <h3 className={`text-3xl font-bold tracking-tight ${trendColor || valueColor}`}>
                    {value}
                </h3>
                {subValue && (
                    <span className={`text-xs font-medium ${subValueColor}`}>
                        {subValue}
                    </span>
                )}
            </div>
        </div>
    );
}
