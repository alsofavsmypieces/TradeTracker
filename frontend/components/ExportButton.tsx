'use client';

import React, { useState } from 'react';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { Trade, Stats } from '@/lib/types';
import * as XLSX from 'xlsx';

interface ExportButtonProps {
    trades: Trade[];
    stats: Stats | null;
    isDark?: boolean;
}

export default function ExportButton({ trades, stats, isDark = true }: ExportButtonProps) {
    const [showMenu, setShowMenu] = useState(false);

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString();
    };

    const exportToCSV = () => {
        if (trades.length === 0) return;

        const headers = ['Ticket', 'Symbol', 'Type', 'Volume', 'Entry Time', 'Exit Time', 'Entry Price', 'Exit Price', 'Net Profit', 'Swap', 'Commission'];
        const rows = trades.map(t => [
            t.ticket,
            t.symbol,
            t.type,
            t.volume,
            t.entry_time || '',
            formatDate(t.time),
            t.entry_price || '',
            t.price,
            t.net_profit,
            t.swap,
            t.commission
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `trades_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        setShowMenu(false);
    };

    const exportToExcel = () => {
        if (trades.length === 0) return;

        // Create trades worksheet
        const tradesData = trades.map(t => ({
            'Ticket': t.ticket,
            'Symbol': t.symbol,
            'Type': t.type,
            'Volume': t.volume,
            'Entry Time': t.entry_time || '',
            'Exit Time': formatDate(t.time),
            'Entry Price': t.entry_price || '',
            'Exit Price': t.price,
            'Net Profit': t.net_profit,
            'Swap': t.swap,
            'Commission': t.commission
        }));

        const wb = XLSX.utils.book_new();

        // Trades sheet
        const tradesWs = XLSX.utils.json_to_sheet(tradesData);
        XLSX.utils.book_append_sheet(wb, tradesWs, 'Trades');

        // Stats sheet (if available)
        if (stats) {
            const statsData = [
                { 'Metric': 'Total Trades', 'Value': stats.total_trades },
                { 'Metric': 'Win Rate %', 'Value': stats.win_rate_pct.toFixed(2) },
                { 'Metric': 'Profit Factor', 'Value': stats.profit_factor.toFixed(2) },
                { 'Metric': 'Total Profit', 'Value': stats.total_profit.toFixed(2) },
                { 'Metric': 'Total Loss', 'Value': stats.total_loss.toFixed(2) },
                { 'Metric': 'Average Win', 'Value': stats.avg_win.toFixed(2) },
                { 'Metric': 'Average Loss', 'Value': stats.avg_loss.toFixed(2) },
                { 'Metric': 'Largest Win', 'Value': stats.largest_win.toFixed(2) },
                { 'Metric': 'Largest Loss', 'Value': stats.largest_loss.toFixed(2) },
                { 'Metric': 'Max Drawdown %', 'Value': stats.max_drawdown_pct.toFixed(2) },
                { 'Metric': 'Sharpe Ratio', 'Value': stats.sharpe_ratio.toFixed(2) },
                { 'Metric': 'Expectancy', 'Value': stats.expectancy.toFixed(2) },
            ];
            const statsWs = XLSX.utils.json_to_sheet(statsData);
            XLSX.utils.book_append_sheet(wb, statsWs, 'Statistics');
        }

        // Download
        XLSX.writeFile(wb, `trade_report_${new Date().toISOString().split('T')[0]}.xlsx`);
        setShowMenu(false);
    };

    const buttonClass = isDark
        ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
        : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200';

    const menuClass = isDark
        ? 'bg-slate-800 border-slate-700'
        : 'bg-white border-gray-200 shadow-lg';

    const menuItemClass = isDark
        ? 'hover:bg-slate-700 text-slate-200'
        : 'hover:bg-gray-100 text-gray-700';

    return (
        <div className="relative">
            <button
                onClick={() => setShowMenu(!showMenu)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${buttonClass}`}
            >
                <Download size={16} />
                <span className="text-sm font-medium">Export</span>
            </button>

            {showMenu && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                    <div className={`absolute right-0 top-full mt-2 w-48 rounded-xl border overflow-hidden z-50 ${menuClass}`}>
                        <button
                            onClick={exportToCSV}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm ${menuItemClass}`}
                        >
                            <FileText size={16} className="text-emerald-500" />
                            Export as CSV
                        </button>
                        <button
                            onClick={exportToExcel}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm border-t ${isDark ? 'border-slate-700' : 'border-gray-100'} ${menuItemClass}`}
                        >
                            <FileSpreadsheet size={16} className="text-green-500" />
                            Export as Excel
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
