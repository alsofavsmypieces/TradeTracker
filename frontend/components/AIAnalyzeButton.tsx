'use client';

import React from 'react';
import { Sparkles, MessageSquare } from 'lucide-react';
import { useAI } from './AIChat';

interface AIAnalyzeButtonProps {
    sectionName: string;
    sectionData: any;
    isDark?: boolean;
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
}

export default function AIAnalyzeButton({
    sectionName,
    sectionData,
    isDark = true,
    size = 'sm',
    showLabel = true
}: AIAnalyzeButtonProps) {
    const ai = useAI();

    if (!ai) return null;

    const handleClick = () => {
        ai.analyzeSection(sectionName, sectionData);
    };

    const sizeClasses = {
        sm: 'px-2 py-1 text-xs',
        md: 'px-3 py-1.5 text-sm',
        lg: 'px-4 py-2 text-sm'
    };

    const iconSize = {
        sm: 12,
        md: 14,
        lg: 16
    };

    return (
        <button
            onClick={handleClick}
            className={`${sizeClasses[size]} rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white transition-all flex items-center gap-1.5 shadow-md hover:shadow-lg hover:scale-105`}
            title={`คุยกับ AI เกี่ยวกับ ${sectionName}`}
        >
            <MessageSquare size={iconSize[size]} />
            {showLabel && <span>AI</span>}
        </button>
    );
}

