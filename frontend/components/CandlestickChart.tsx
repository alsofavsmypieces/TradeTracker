'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Trade, OHLC } from '@/lib/types';
import { mt5Api } from '@/lib/api';
import {
    TrendingUp,
    RefreshCw,
    ChevronDown,
    Maximize2
} from 'lucide-react';

// Import lightweight-charts v5
import {
    createChart,
    ColorType,
    CandlestickSeries,
    createSeriesMarkers
} from 'lightweight-charts';

interface Position {
    position_id: number;
    symbol: string;
    type: string;
    volume: number;
    entry_time: number | null;
    entry_price: number | null;
    exit_time: number;
    exit_price: number;
    profit: number;
    net_profit: number;
}

interface CandlestickChartProps {
    trades: Trade[];
    isDark?: boolean;
    defaultSymbol?: string;
}

const TIMEFRAMES = [
    { value: 'M1', label: '1m' },
    { value: 'M5', label: '5m' },
    { value: 'M15', label: '15m' },
    { value: 'M30', label: '30m' },
    { value: 'H1', label: '1H' },
    { value: 'H4', label: '4H' },
    { value: 'D1', label: '1D' },
];

export default function CandlestickChart({ trades, isDark = true, defaultSymbol }: CandlestickChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<any>(null);
    const candleSeriesRef = useRef<any>(null);
    const markersRef = useRef<any>(null);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [candles, setCandles] = useState<OHLC[]>([]);
    const [positions, setPositions] = useState<Position[]>([]);
    const [selectedSymbol, setSelectedSymbol] = useState(defaultSymbol || 'EURUSD');
    const [selectedTimeframe, setSelectedTimeframe] = useState('M15');
    const [symbols, setSymbols] = useState<string[]>([]);
    const [showSymbolDropdown, setShowSymbolDropdown] = useState(false);
    const [chartReady, setChartReady] = useState(false);
    const [barCount, setBarCount] = useState(1000);
    const [showMarkers, setShowMarkers] = useState(true);

    // Get unique symbols from trades
    const tradeSymbols = useMemo(() => {
        return [...new Set(trades.map(t => t.symbol))];
    }, [trades]);

    // Create order markers from positions for selected symbol
    const orderMarkers = useMemo(() => {
        if (!showMarkers) return [];

        const symbolPositions = positions.filter(p => p.symbol === selectedSymbol);
        const markers: any[] = [];

        symbolPositions.forEach(pos => {
            // Entry marker - simplified text
            if (pos.entry_time && pos.entry_price) {
                markers.push({
                    time: pos.entry_time as any,
                    position: pos.type === 'BUY' ? 'belowBar' : 'aboveBar',
                    color: '#3b82f6',
                    shape: pos.type === 'BUY' ? 'arrowUp' : 'arrowDown',
                    text: '',  // No text for entry - cleaner
                    size: 1
                });
            }

            // Exit marker - only show profit amount
            markers.push({
                time: pos.exit_time as any,
                position: pos.type === 'BUY' ? 'aboveBar' : 'belowBar',
                color: pos.net_profit >= 0 ? '#22c55e' : '#ef4444',
                shape: pos.type === 'BUY' ? 'arrowDown' : 'arrowUp',
                text: `${pos.net_profit >= 0 ? '+' : ''}${pos.net_profit.toFixed(0)}`,
                size: 1
            });
        });

        // Sort by time
        markers.sort((a, b) => a.time - b.time);

        return markers;
    }, [positions, selectedSymbol, showMarkers]);

    // Fetch symbols and positions on mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await mt5Api.getSymbols();
                if (res.data.symbols && res.data.symbols.length > 0) {
                    setSymbols(res.data.symbols);
                }
            } catch (err) {
                setSymbols(tradeSymbols);
            }

            // Fetch positions with entry+exit data
            try {
                const posRes = await mt5Api.getPositions(30);
                if (posRes.data.positions) {
                    setPositions(posRes.data.positions);
                }
            } catch (err) {
                console.error('Failed to fetch positions:', err);
            }
        };
        fetchData();
    }, [tradeSymbols]);

    // Set default symbol from trades
    useEffect(() => {
        if (!defaultSymbol && tradeSymbols.length > 0) {
            setSelectedSymbol(tradeSymbols[0]);
        }
    }, [tradeSymbols, defaultSymbol]);

    // Fetch candles when symbol/timeframe changes
    useEffect(() => {
        const fetchCandles = async () => {
            if (!selectedSymbol) return;

            setLoading(true);
            setError(null);
            try {
                const res = await mt5Api.getOHLC(selectedSymbol, selectedTimeframe, barCount);
                if (res.data.candles) {
                    setCandles(res.data.candles);
                }
            } catch (err: any) {
                setError(err.response?.data?.detail || 'Failed to fetch candle data');
                setCandles([]);
            } finally {
                setLoading(false);
            }
        };

        fetchCandles();
    }, [selectedSymbol, selectedTimeframe, barCount]);

    // Initialize chart
    useEffect(() => {
        if (!chartContainerRef.current) return;

        try {
            const chart = createChart(chartContainerRef.current, {
                width: chartContainerRef.current.clientWidth,
                height: 550,
                layout: {
                    background: { type: ColorType.Solid, color: isDark ? '#0B1121' : '#ffffff' },
                    textColor: isDark ? '#9ca3af' : '#374151',
                },
                grid: {
                    vertLines: { color: isDark ? '#1f2937' : '#e5e7eb' },
                    horzLines: { color: isDark ? '#1f2937' : '#e5e7eb' },
                },
                crosshair: {
                    mode: 1,
                    vertLine: {
                        color: isDark ? '#6366f1' : '#4f46e5',
                        width: 1,
                        style: 2,
                        labelBackgroundColor: isDark ? '#6366f1' : '#4f46e5',
                    },
                    horzLine: {
                        color: isDark ? '#6366f1' : '#4f46e5',
                        width: 1,
                        style: 2,
                        labelBackgroundColor: isDark ? '#6366f1' : '#4f46e5',
                    },
                },
                rightPriceScale: {
                    borderColor: isDark ? '#374151' : '#d1d5db',
                },
                timeScale: {
                    borderColor: isDark ? '#374151' : '#d1d5db',
                    timeVisible: true,
                    secondsVisible: false,
                },
            });

            // v5 API: use addSeries with CandlestickSeries type
            const candleSeries = chart.addSeries(CandlestickSeries, {
                upColor: '#22c55e',
                downColor: '#ef4444',
                borderUpColor: '#22c55e',
                borderDownColor: '#ef4444',
                wickUpColor: '#22c55e',
                wickDownColor: '#ef4444',
            });

            chartRef.current = chart;
            candleSeriesRef.current = candleSeries;
            setChartReady(true);
            setError(null);

            // Handle resize
            const handleResize = () => {
                if (chartContainerRef.current) {
                    chart.applyOptions({
                        width: chartContainerRef.current.clientWidth,
                    });
                }
            };

            window.addEventListener('resize', handleResize);

            return () => {
                window.removeEventListener('resize', handleResize);
                if (markersRef.current) {
                    try { markersRef.current.detach(); } catch { }
                }
                chart.remove();
                chartRef.current = null;
                candleSeriesRef.current = null;
                markersRef.current = null;
                setChartReady(false);
            };
        } catch (err) {
            console.error('Chart init error:', err);
            setError('Failed to initialize chart');
        }
    }, [isDark]);

    // Update candle data and markers
    useEffect(() => {
        if (candleSeriesRef.current && candles.length > 0 && chartReady) {
            candleSeriesRef.current.setData(candles);

            // Add markers using v5 createSeriesMarkers
            if (orderMarkers.length > 0) {
                if (markersRef.current) {
                    try { markersRef.current.detach(); } catch { }
                }

                try {
                    markersRef.current = createSeriesMarkers(candleSeriesRef.current, orderMarkers);
                } catch (err) {
                    console.error('Failed to create markers:', err);
                }
            }

            // Fit content
            chartRef.current?.timeScale().fitContent();
        }
    }, [candles, orderMarkers, chartReady]);

    // Styles
    const containerClass = isDark
        ? 'bg-slate-900/50 border border-slate-800/50'
        : 'bg-white border border-gray-100 shadow-sm';
    const textClass = isDark ? 'text-slate-200' : 'text-gray-800';
    const mutedClass = isDark ? 'text-slate-400' : 'text-gray-500';
    const buttonClass = isDark
        ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
        : 'bg-gray-100 hover:bg-gray-200 text-gray-700';
    const activeButtonClass = 'bg-indigo-600 hover:bg-indigo-500 text-white';
    const dropdownClass = isDark
        ? 'bg-slate-800 border-slate-700'
        : 'bg-white border-gray-200 shadow-lg';

    const handleRefresh = async () => {
        setLoading(true);
        try {
            const [candleRes, posRes] = await Promise.all([
                mt5Api.getOHLC(selectedSymbol, selectedTimeframe, barCount),
                mt5Api.getPositions(30)
            ]);
            if (candleRes.data.candles) {
                setCandles(candleRes.data.candles);
            }
            if (posRes.data.positions) {
                setPositions(posRes.data.positions);
            }
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to refresh');
        } finally {
            setLoading(false);
        }
    };

    const handleFitContent = () => {
        chartRef.current?.timeScale().fitContent();
    };

    const symbolPositionCount = positions.filter(p => p.symbol === selectedSymbol).length;

    return (
        <div className={`rounded-2xl overflow-hidden ${containerClass}`}>
            {/* Header */}
            <div className={`p-4 border-b ${isDark ? 'border-slate-800' : 'border-gray-100'} flex flex-wrap items-center justify-between gap-4`}>
                <div className="flex items-center gap-4">
                    {/* Symbol Selector */}
                    <div className="relative">
                        <button
                            onClick={() => setShowSymbolDropdown(!showSymbolDropdown)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${buttonClass}`}
                        >
                            <TrendingUp size={16} className="text-indigo-500" />
                            {selectedSymbol}
                            <ChevronDown size={16} />
                        </button>

                        {showSymbolDropdown && (
                            <div className={`absolute top-full left-0 mt-1 w-48 max-h-64 overflow-auto rounded-lg border z-50 ${dropdownClass}`}>
                                {(symbols.length > 0 ? symbols : tradeSymbols).map(symbol => (
                                    <button
                                        key={symbol}
                                        onClick={() => {
                                            setSelectedSymbol(symbol);
                                            setShowSymbolDropdown(false);
                                        }}
                                        className={`w-full px-4 py-2 text-left text-sm hover:bg-indigo-500/10 ${symbol === selectedSymbol ? 'text-indigo-500 font-medium' : textClass
                                            }`}
                                    >
                                        {symbol}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Timeframe Selector */}
                    <div className="flex gap-1">
                        {TIMEFRAMES.map(tf => (
                            <button
                                key={tf.value}
                                onClick={() => setSelectedTimeframe(tf.value)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${selectedTimeframe === tf.value ? activeButtonClass : buttonClass
                                    }`}
                            >
                                {tf.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Position count badge */}
                    {symbolPositionCount > 0 && (
                        <button
                            onClick={() => setShowMarkers(!showMarkers)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${showMarkers
                                    ? (isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600')
                                    : (isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-200 text-gray-500')
                                }`}
                            title={showMarkers ? 'Hide trade markers' : 'Show trade markers'}
                        >
                            {symbolPositionCount} positions {showMarkers ? '👁' : '👁‍🗨'}
                        </button>
                    )}

                    <button
                        onClick={handleFitContent}
                        className={`p-2 rounded-lg ${buttonClass}`}
                        title="Fit content"
                    >
                        <Maximize2 size={16} />
                    </button>

                    <button
                        onClick={handleRefresh}
                        disabled={loading}
                        className={`p-2 rounded-lg ${buttonClass}`}
                        title="Refresh"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Error / Info */}
            {error && (
                <div className="p-4 bg-amber-500/10 border-b border-amber-500/20 text-amber-500 text-sm">
                    ⚠️ {error}
                </div>
            )}

            {/* Chart */}
            <div className="relative">
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-10">
                        <RefreshCw size={32} className="animate-spin text-indigo-500" />
                    </div>
                )}
                <div
                    ref={chartContainerRef}
                    className="w-full"
                    style={{ height: '550px' }}
                />

                {/* No data message */}
                {candles.length === 0 && !loading && !error && chartReady && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <TrendingUp size={48} className={`mb-4 ${mutedClass}`} />
                        <p className={`text-lg font-medium ${textClass}`}>No candle data</p>
                        <p className={`text-sm ${mutedClass}`}>Waiting for data...</p>
                    </div>
                )}
            </div>

            {/* Legend */}
            <div className={`p-3 border-t ${isDark ? 'border-slate-800' : 'border-gray-100'} flex items-center justify-center gap-6 text-sm ${mutedClass}`}>
                <div className="flex items-center gap-2">
                    <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[10px] border-b-blue-500" />
                    <span>Entry (BUY)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[10px] border-t-blue-500" />
                    <span>Entry (SELL)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[10px] border-t-emerald-500" />
                    <span>Exit (Profit)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[10px] border-t-rose-500" />
                    <span>Exit (Loss)</span>
                </div>
            </div>
        </div>
    );
}
