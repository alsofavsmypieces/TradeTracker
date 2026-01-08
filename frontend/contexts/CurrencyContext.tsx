'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Exchange rate (fixed rate - can be updated or fetched from API)
const EXCHANGE_RATES: { [key: string]: number } = {
    USD: 1,
    THB: 34.50, // 1 USD = 34.50 THB (approximate)
};

type CurrencyType = 'USD' | 'THB';

interface CurrencyContextType {
    currency: CurrencyType;
    setCurrency: (currency: CurrencyType) => void;
    toggleCurrency: () => void;
    convertAmount: (amount: number, fromCurrency?: string) => number;
    formatCurrency: (amount: number, fromCurrency?: string) => string;
    symbol: string;
    rate: number;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
    const [currency, setCurrencyState] = useState<CurrencyType>('USD');

    // Load saved preference
    useEffect(() => {
        const saved = localStorage.getItem('preferred_currency') as CurrencyType | null;
        if (saved && (saved === 'USD' || saved === 'THB')) {
            setCurrencyState(saved);
        }
    }, []);

    const setCurrency = (newCurrency: CurrencyType) => {
        setCurrencyState(newCurrency);
        localStorage.setItem('preferred_currency', newCurrency);
    };

    const toggleCurrency = () => {
        const newCurrency = currency === 'USD' ? 'THB' : 'USD';
        setCurrency(newCurrency);
    };

    // Convert amount from source currency (default USD) to display currency
    const convertAmount = (amount: number, fromCurrency: string = 'USD'): number => {
        if (fromCurrency === currency) return amount;

        // Convert to USD first, then to target currency
        const amountInUSD = amount / (EXCHANGE_RATES[fromCurrency] || 1);
        return amountInUSD * EXCHANGE_RATES[currency];
    };

    // Format currency with symbol and proper formatting
    const formatCurrency = (amount: number, fromCurrency: string = 'USD'): string => {
        const converted = convertAmount(amount, fromCurrency);

        if (currency === 'THB') {
            return `฿${converted.toLocaleString('th-TH', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            })}`;
        }

        return `$${converted.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    };

    const symbol = currency === 'THB' ? '฿' : '$';
    const rate = EXCHANGE_RATES[currency];

    return (
        <CurrencyContext.Provider value={{
            currency,
            setCurrency,
            toggleCurrency,
            convertAmount,
            formatCurrency,
            symbol,
            rate
        }}>
            {children}
        </CurrencyContext.Provider>
    );
}

export function useCurrency() {
    const context = useContext(CurrencyContext);
    if (context === undefined) {
        throw new Error('useCurrency must be used within a CurrencyProvider');
    }
    return context;
}

// Export for use without context (for components that don't need reactivity)
export const formatCurrencySimple = (amount: number, currency: CurrencyType = 'USD'): string => {
    if (currency === 'THB') {
        const converted = amount * EXCHANGE_RATES.THB;
        return `฿${converted.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
