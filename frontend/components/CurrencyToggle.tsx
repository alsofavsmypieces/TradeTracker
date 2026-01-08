'use client';

import React from 'react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { RefreshCw } from 'lucide-react';

interface CurrencyToggleProps {
    isDark?: boolean;
}

export default function CurrencyToggle({ isDark = true }: CurrencyToggleProps) {
    const { currency, toggleCurrency, rate } = useCurrency();

    return (
        <button
            onClick={toggleCurrency}
            className={`
                flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
                transition-all duration-200 border
                ${isDark
                    ? 'bg-slate-800/50 border-slate-700 hover:bg-slate-700/50 text-slate-200'
                    : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-800'
                }
            `}
            title={`Switch to ${currency === 'USD' ? 'THB' : 'USD'}`}
        >
            <span className={`text-lg ${currency === 'USD' ? 'opacity-100' : 'opacity-40'}`}>
                🇺🇸
            </span>
            <RefreshCw size={14} className="opacity-50" />
            <span className={`text-lg ${currency === 'THB' ? 'opacity-100' : 'opacity-40'}`}>
                🇹🇭
            </span>
            <span className={`ml-1 text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                {currency === 'THB' ? `฿${rate.toFixed(2)}` : 'USD'}
            </span>
        </button>
    );
}
