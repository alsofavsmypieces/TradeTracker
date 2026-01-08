'use client';

import React, { useState, useEffect } from 'react';
import {
    Calendar, RefreshCw, Filter, Clock, TrendingUp, TrendingDown,
    AlertCircle, ChevronDown, ChevronUp, ExternalLink
} from 'lucide-react';

interface NewsEvent {
    id: number;
    name: string;
    currency: string;
    category?: string;
    date: string;
    actual?: string | null;
    forecast?: string | null;
    previous?: string | null;
    impact?: string;
    outcome?: string;
}

interface NewsCalendarProps {
    isDark?: boolean;
}

const API_BASE = 'http://localhost:8000/api';

// Currency flag emojis
const CURRENCY_FLAGS: { [key: string]: string } = {
    'USD': '🇺🇸',
    'EUR': '🇪🇺',
    'GBP': '🇬🇧',
    'JPY': '🇯🇵',
    'AUD': '🇦🇺',
    'CAD': '🇨🇦',
    'CHF': '🇨🇭',
    'NZD': '🇳🇿',
    'CNY': '🇨🇳',
    'THB': '🇹🇭',
};

// Impact color classes
const getImpactColor = (impact: string | undefined, isDark: boolean) => {
    switch (impact?.toLowerCase()) {
        case 'high':
            return isDark ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-red-100 text-red-700 border-red-200';
        case 'medium':
            return isDark ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : 'bg-orange-100 text-orange-700 border-orange-200';
        case 'low':
            return isDark ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' : 'bg-yellow-100 text-yellow-700 border-yellow-200';
        default:
            return isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500';
    }
};

// Impact bar component (ForexFactory style)
const ImpactBar = ({ impact, isDark }: { impact: string | undefined, isDark: boolean }) => {
    const getBarColor = () => {
        switch (impact?.toLowerCase()) {
            case 'high': return 'bg-red-500';
            case 'medium': return 'bg-orange-500';
            case 'low': return 'bg-yellow-500';
            default: return 'bg-slate-500';
        }
    };

    const bars = impact?.toLowerCase() === 'high' ? 3 : impact?.toLowerCase() === 'medium' ? 2 : 1;

    return (
        <div className="flex gap-0.5 items-end h-4">
            {[1, 2, 3].map(i => (
                <div
                    key={i}
                    className={`w-1 rounded-sm ${i <= bars ? getBarColor() : isDark ? 'bg-slate-700' : 'bg-gray-200'}`}
                    style={{ height: `${i * 4 + 4}px` }}
                />
            ))}
        </div>
    );
};

export default function NewsCalendar({ isDark = true }: NewsCalendarProps) {
    const [events, setEvents] = useState<NewsEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedCurrency, setSelectedCurrency] = useState<string>('all');
    const [selectedImpact, setSelectedImpact] = useState<string>('all');
    const [showFilters, setShowFilters] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [showApiInput, setShowApiInput] = useState(false);
    const [dataSource, setDataSource] = useState<'demo' | 'forexfactory' | 'jblanked'>('forexfactory');
    const [currentDate, setCurrentDate] = useState<string>('');

    // Load API key from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('news_api_key') || '';
        setApiKey(saved);
    }, []);

    // Fetch ForexFactory data on mount
    useEffect(() => {
        fetchForexFactoryEvents();
    }, []);

    const fetchDemoEvents = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE}/news/demo`);
            if (response.ok) {
                const data = await response.json();
                setEvents(data.events || []);
                setDataSource('demo');
            } else {
                throw new Error('Failed to fetch demo events');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchForexFactoryEvents = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE}/news/forexfactory`);
            if (response.ok) {
                const data = await response.json();
                setEvents(data.events || []);
                setDataSource('forexfactory');
                if (data.date) setCurrentDate(data.date);
            } else {
                throw new Error('Failed to fetch ForexFactory data');
            }
        } catch (err: any) {
            setError(err.message);
            // Fallback to demo if FF fails
            fetchDemoEvents();
        } finally {
            setLoading(false);
        }
    };

    const fetchLiveEvents = async () => {
        if (!apiKey) {
            setShowApiInput(true);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE}/news/calendar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    api_key: apiKey,
                    endpoint: 'calendar'
                })
            });

            if (response.ok) {
                const data = await response.json();
                setEvents(data.events || []);
                setDataSource('jblanked');
            } else {
                const err = await response.json();
                throw new Error(err.detail || 'Failed to fetch events');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const saveApiKey = () => {
        localStorage.setItem('news_api_key', apiKey);
        setShowApiInput(false);
        fetchLiveEvents();
    };

    // Filter events
    const filteredEvents = events.filter(event => {
        if (selectedCurrency !== 'all' && event.currency !== selectedCurrency) return false;
        if (selectedImpact !== 'all' && event.impact !== selectedImpact) return false;
        return true;
    });

    // Get unique currencies from events
    const currencies = ['all', ...new Set(events.map(e => e.currency))];

    // Parse and format date
    const formatTime = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
        } catch {
            return dateStr;
        }
    };

    const formatDate = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        } catch {
            return dateStr;
        }
    };

    // Determine outcome color
    const getOutcomeStyle = (actual: string | null | undefined, forecast: string | null | undefined) => {
        if (!actual || !forecast) return '';

        const actualNum = parseFloat(actual.replace(/[^0-9.-]/g, ''));
        const forecastNum = parseFloat(forecast.replace(/[^0-9.-]/g, ''));

        if (isNaN(actualNum) || isNaN(forecastNum)) return '';

        if (actualNum > forecastNum) return 'text-emerald-400';
        if (actualNum < forecastNum) return 'text-red-400';
        return 'text-slate-400';
    };

    // Check if event is in the past (Thai time)
    const isPastEvent = (dateStr: string) => {
        try {
            const eventTime = new Date(dateStr).getTime();
            const now = Date.now();
            return eventTime < now;
        } catch {
            return false;
        }
    };

    // Find the first upcoming event index
    const getUpNextIndex = () => {
        const now = Date.now();
        for (let i = 0; i < filteredEvents.length; i++) {
            try {
                const eventTime = new Date(filteredEvents[i].date).getTime();
                if (eventTime >= now) return i;
            } catch {
                continue;
            }
        }
        return -1;
    };

    const upNextIndex = getUpNextIndex();

    // Styles
    const bgClass = isDark ? 'bg-slate-900/50' : 'bg-white';
    const borderClass = isDark ? 'border-slate-700' : 'border-gray-200';
    const textClass = isDark ? 'text-slate-200' : 'text-gray-800';
    const mutedClass = isDark ? 'text-slate-400' : 'text-gray-500';
    const headerBg = isDark ? 'bg-slate-800/50' : 'bg-gray-50';
    const rowHover = isDark ? 'hover:bg-slate-800/30' : 'hover:bg-gray-50';
    const inputClass = isDark
        ? 'bg-slate-800 border-slate-700 text-slate-200'
        : 'bg-white border-gray-200 text-gray-800';

    return (
        <div className={`rounded-xl ${bgClass} border ${borderClass} overflow-hidden`}>
            {/* Header */}
            <div className={`flex items-center justify-between p-4 border-b ${borderClass} ${headerBg}`}>
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
                        <Calendar size={20} className="text-white" />
                    </div>
                    <div>
                        <h2 className={`font-semibold ${textClass}`}>
                            📅 Today: {currentDate ? new Date(currentDate).toLocaleDateString('th-TH', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                            }) : 'Economic Calendar'}
                        </h2>
                        <p className={`text-xs ${mutedClass}`}>
                            {filteredEvents.length} events •
                            {dataSource === 'forexfactory' ? ' 🔴 Live • เวลาไทย GMT+7' :
                                dataSource === 'jblanked' ? '✓ JBlanked API' : 'Demo Data'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`p-2 rounded-lg transition ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-200'}`}
                        title="Filters"
                    >
                        <Filter size={18} className={mutedClass} />
                    </button>
                    <button
                        onClick={fetchForexFactoryEvents}
                        disabled={loading}
                        className={`p-2 rounded-lg transition ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-200'}`}
                        title="Refresh from ForexFactory"
                    >
                        <RefreshCw size={18} className={`${mutedClass} ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => setShowApiInput(!showApiInput)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${apiKey
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            }`}
                    >
                        {apiKey ? '✓ API Connected' : 'Add API Key'}
                    </button>
                </div>
            </div>

            {/* API Key Input */}
            {showApiInput && (
                <div className={`p-4 border-b ${borderClass} ${isDark ? 'bg-slate-800/30' : 'bg-gray-50'}`}>
                    <label className={`text-xs ${mutedClass} mb-2 block`}>JBlanked News API Key</label>
                    <div className="flex gap-2">
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Enter your API key..."
                            className={`flex-1 px-3 py-2 rounded-lg border text-sm ${inputClass}`}
                        />
                        <button
                            onClick={saveApiKey}
                            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 transition"
                        >
                            Save
                        </button>
                    </div>
                    <a
                        href="https://www.jblanked.com/news/api/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:underline mt-2 inline-flex items-center gap-1"
                    >
                        Get API Key <ExternalLink size={10} />
                    </a>
                </div>
            )}

            {/* Filters */}
            {showFilters && (
                <div className={`p-4 border-b ${borderClass} flex flex-wrap gap-4`}>
                    <div>
                        <label className={`text-xs ${mutedClass} mb-1 block`}>Currency</label>
                        <select
                            value={selectedCurrency}
                            onChange={(e) => setSelectedCurrency(e.target.value)}
                            className={`px-3 py-1.5 rounded-lg border text-sm ${inputClass}`}
                        >
                            {currencies.map(c => (
                                <option key={c} value={c}>
                                    {c === 'all' ? 'All Currencies' : `${CURRENCY_FLAGS[c] || ''} ${c}`}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className={`text-xs ${mutedClass} mb-1 block`}>Impact</label>
                        <select
                            value={selectedImpact}
                            onChange={(e) => setSelectedImpact(e.target.value)}
                            className={`px-3 py-1.5 rounded-lg border text-sm ${inputClass}`}
                        >
                            <option value="all">All Impact</option>
                            <option value="high">🔴 High</option>
                            <option value="medium">🟠 Medium</option>
                            <option value="low">🟡 Low</option>
                        </select>
                    </div>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="p-4 bg-red-500/10 border-b border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className={headerBg}>
                        <tr className={`border-b ${borderClass}`}>
                            <th className={`px-4 py-3 text-left ${mutedClass} font-medium`}>Time</th>
                            <th className={`px-4 py-3 text-left ${mutedClass} font-medium`}>Currency</th>
                            <th className={`px-4 py-3 text-center ${mutedClass} font-medium`}>Impact</th>
                            <th className={`px-4 py-3 text-left ${mutedClass} font-medium`}>Event</th>
                            <th className={`px-4 py-3 text-right ${mutedClass} font-medium`}>Actual</th>
                            <th className={`px-4 py-3 text-right ${mutedClass} font-medium`}>Forecast</th>
                            <th className={`px-4 py-3 text-right ${mutedClass} font-medium`}>Previous</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={7} className="text-center py-12">
                                    <RefreshCw size={24} className={`mx-auto ${mutedClass} animate-spin mb-2`} />
                                    <p className={mutedClass}>Loading events...</p>
                                </td>
                            </tr>
                        ) : filteredEvents.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="text-center py-12">
                                    <Calendar size={24} className={`mx-auto ${mutedClass} mb-2`} />
                                    <p className={mutedClass}>No events found</p>
                                </td>
                            </tr>
                        ) : (
                            filteredEvents.map((event, idx) => {
                                const isPast = isPastEvent(event.date);
                                const isUpNext = idx === upNextIndex;

                                // Row styling based on past/upcoming
                                const rowClass = isPast
                                    ? `border-b ${borderClass} opacity-50`
                                    : isUpNext
                                        ? `border-b ${borderClass} ${isDark ? 'bg-amber-500/10 border-l-2 border-l-amber-500' : 'bg-amber-50 border-l-2 border-l-amber-500'}`
                                        : `border-b ${borderClass} ${rowHover}`;

                                return (
                                    <tr
                                        key={event.id || idx}
                                        className={`${rowClass} transition`}
                                    >
                                        {/* Time */}
                                        <td className={`px-4 py-3 ${isPast ? 'text-slate-600' : mutedClass}`}>
                                            <div className="flex items-center gap-2">
                                                <Clock size={12} />
                                                <span className={`${isUpNext ? 'font-bold text-amber-400' : ''}`}>
                                                    {formatTime(event.date)}
                                                </span>
                                                {isUpNext && (
                                                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-500 text-black rounded">
                                                        UP NEXT
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs opacity-60">{formatDate(event.date)}</div>
                                        </td>

                                        {/* Currency */}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg">{CURRENCY_FLAGS[event.currency] || '🏳️'}</span>
                                                <span className={`font-medium ${isPast ? 'text-slate-600' : textClass}`}>{event.currency}</span>
                                            </div>
                                        </td>

                                        {/* Impact */}
                                        <td className="px-4 py-3">
                                            <div className="flex justify-center">
                                                <ImpactBar impact={event.impact} isDark={isDark} />
                                            </div>
                                        </td>

                                        {/* Event Name */}
                                        <td className={`px-4 py-3 ${isPast ? 'text-slate-600' : textClass}`}>
                                            <div className={`font-medium ${isUpNext ? 'text-amber-400' : ''}`}>{event.name}</div>
                                            {event.category && (
                                                <div className={`text-xs ${mutedClass}`}>{event.category}</div>
                                            )}
                                        </td>

                                        {/* Actual */}
                                        <td className={`px-4 py-3 text-right font-mono ${getOutcomeStyle(event.actual, event.forecast) || (isPast ? 'text-slate-600' : textClass)}`}>
                                            {event.actual || '-'}
                                        </td>

                                        {/* Forecast */}
                                        <td className={`px-4 py-3 text-right font-mono ${isPast ? 'text-slate-600' : mutedClass}`}>
                                            {event.forecast || '-'}
                                        </td>

                                        {/* Previous */}
                                        <td className={`px-4 py-3 text-right font-mono ${isPast ? 'text-slate-600' : mutedClass}`}>
                                            {event.previous || '-'}
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer */}
            <div className={`px-4 py-3 border-t ${borderClass} ${headerBg} flex items-center justify-between`}>
                <p className={`text-xs ${mutedClass}`}>
                    Data: {dataSource === 'forexfactory' ? '🔴 ForexFactory Live' :
                        dataSource === 'jblanked' ? 'JBlanked News API' : 'Demo Data'}
                </p>
                <div className="flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                        High
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                        Medium
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                        Low
                    </span>
                </div>
            </div>
        </div>
    );
}
