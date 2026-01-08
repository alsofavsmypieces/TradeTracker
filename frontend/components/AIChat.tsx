'use client';

import React, { useState, useRef, useEffect, createContext, useContext } from 'react';
import { MessageSquare, Send, X, Bot, User, Settings, Sparkles, Loader2, Maximize2, Minimize2, Trash2 } from 'lucide-react';
import { Stats, Trade } from '@/lib/types';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface AIChatProps {
    stats: Stats | null;
    trades: Trade[];
    isDark?: boolean;
    children?: React.ReactNode;
}

type AIProvider = 'openai' | 'gemini';

// Model options
const OPENAI_MODELS = [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'o3-mini', label: 'o3 Mini' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
];

const GEMINI_MODELS = [
    { value: 'gemini-2.5-pro-preview-06-05', label: 'Gemini 2.5 Pro' },
    { value: 'gemini-2.5-flash-preview-05-20', label: 'Gemini 2.5 Flash' },
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
];

const API_BASE = 'http://localhost:8000/api';

// Context for section analysis
interface AIContextType {
    analyzeSection: (sectionName: string, data: any) => void;
}

export const AIContext = createContext<AIContextType | null>(null);

export function useAI() {
    return useContext(AIContext);
}

export default function AIChat({ stats, trades, isDark = true, children }: AIChatProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // AI Settings
    const [provider, setProvider] = useState<AIProvider>('gemini');
    const [openaiModel, setOpenaiModel] = useState('gpt-4o-mini');
    const [geminiModel, setGeminiModel] = useState('gemini-2.0-flash');
    const [openaiKey, setOpenaiKey] = useState('');
    const [geminiKey, setGeminiKey] = useState('');

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Load settings from localStorage
    useEffect(() => {
        const savedOpenai = localStorage.getItem('openai_api_key') || '';
        const savedGemini = localStorage.getItem('gemini_api_key') || '';
        const savedProvider = localStorage.getItem('ai_provider') as AIProvider || 'gemini';
        const savedOpenaiModel = localStorage.getItem('openai_model') || 'gpt-4o-mini';
        const savedGeminiModel = localStorage.getItem('gemini_model') || 'gemini-2.0-flash';
        setOpenaiKey(savedOpenai);
        setGeminiKey(savedGemini);
        setProvider(savedProvider);
        setOpenaiModel(savedOpenaiModel);
        setGeminiModel(savedGeminiModel);
    }, []);

    // Save settings
    const saveSettings = () => {
        localStorage.setItem('openai_api_key', openaiKey);
        localStorage.setItem('gemini_api_key', geminiKey);
        localStorage.setItem('ai_provider', provider);
        localStorage.setItem('openai_model', openaiModel);
        localStorage.setItem('gemini_model', geminiModel);
        setShowSettings(false);
    };

    // Scroll to bottom when new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && !showSettings) {
            inputRef.current?.focus();
        }
    }, [isOpen, showSettings]);

    const getCurrentApiKey = () => {
        return provider === 'openai' ? openaiKey : geminiKey;
    };

    const getCurrentModel = () => {
        return provider === 'openai' ? openaiModel : geminiModel;
    };

    const buildTradingContext = () => {
        if (!stats) return null;

        return {
            // Main metrics (matching backend expected fields)
            total_trades: stats.total_trades,
            winning_trades: stats.winning_trades,
            losing_trades: stats.losing_trades,
            win_rate: stats.win_rate_pct,
            profit_factor: stats.profit_factor,
            total_profit: stats.total_profit,
            avg_win: stats.avg_win,
            avg_loss: stats.avg_loss,
            largest_win: stats.largest_win,
            largest_loss: stats.largest_loss,
            max_drawdown: stats.max_drawdown_pct,
            sharpe_ratio: stats.sharpe_ratio,
            absolute_gain: stats.absolute_gain_pct,
            final_balance: stats.final_balance,
            initial_balance: stats.initial_balance,
            // Additional metrics
            longWinRate: stats.long_win_rate,
            shortWinRate: stats.short_win_rate,
            expectancy: stats.expectancy,
            zScore: stats.z_score,
            // Recent trades for pattern analysis
            recentTrades: trades.slice(0, 10).map(t => ({
                symbol: t.symbol,
                type: t.type,
                profit: t.net_profit,
                volume: t.volume
            }))
        };
    };

    const sendMessage = async () => {
        const apiKey = getCurrentApiKey();
        if (!apiKey) {
            setShowSettings(true);
            return;
        }

        if (!input.trim() || isLoading) return;

        const userMessage: Message = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch(`${API_BASE}/ai/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, userMessage].map(m => ({
                        role: m.role,
                        content: m.content
                    })),
                    provider,
                    api_key: apiKey,
                    model: getCurrentModel(),
                    trading_context: buildTradingContext()
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to get response');
            }

            const data = await response.json();
            setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
        } catch (error: any) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `❌ Error: ${error.message}`
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // Analyze section - called from section buttons
    const analyzeSection = async (sectionName: string, sectionData: any) => {
        const apiKey = getCurrentApiKey();
        if (!apiKey) {
            setIsOpen(true);
            setShowSettings(true);
            return;
        }

        setIsOpen(true);
        setIsLoading(true);

        const question = `วิเคราะห์ข้อมูล "${sectionName}" ของฉัน และให้คำแนะนำในการปรับปรุง:\n\n${JSON.stringify(sectionData, null, 2)}`;
        setMessages(prev => [...prev, { role: 'user', content: `🔍 วิเคราะห์: ${sectionName}` }]);

        try {
            const response = await fetch(`${API_BASE}/ai/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider,
                    api_key: apiKey,
                    model: getCurrentModel(),
                    stats: { ...buildTradingContext(), sectionData, sectionName },
                    question
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to analyze');
            }

            const data = await response.json();
            setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
        } catch (error: any) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `❌ Error: ${error.message}`
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const quickAnalyze = async () => {
        const apiKey = getCurrentApiKey();
        if (!apiKey) {
            setShowSettings(true);
            return;
        }

        if (!stats) return;

        setIsLoading(true);
        setMessages(prev => [...prev, { role: 'user', content: '⚡ Quick Insights' }]);

        try {
            const response = await fetch(`${API_BASE}/ai/quick-insights`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider,
                    api_key: apiKey,
                    stats: buildTradingContext()
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to get insights');
            }

            const data = await response.json();
            // Show insights badges if available
            let responseContent = data.response;
            if (data.insights && data.insights.length > 0) {
                responseContent = `📊 **Auto-detected Insights:**\n${data.insights.join('\n')}\n\n---\n\n${data.response}`;
            }
            setMessages(prev => [...prev, { role: 'assistant', content: responseContent }]);
        } catch (error: any) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `❌ Error: ${error.message}`
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    // Comprehensive analysis
    const comprehensiveAnalysis = async () => {
        const apiKey = getCurrentApiKey();
        if (!apiKey) {
            setShowSettings(true);
            return;
        }

        if (!stats) return;

        setIsLoading(true);
        setMessages(prev => [...prev, { role: 'user', content: '📋 วิเคราะห์แบบครบถ้วน' }]);

        try {
            const response = await fetch(`${API_BASE}/ai/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider,
                    api_key: apiKey,
                    stats: buildTradingContext(),
                    analysis_type: 'comprehensive'
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to analyze');
            }

            const data = await response.json();
            setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
        } catch (error: any) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `❌ Error: ${error.message}`
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    // Risk assessment
    const riskAssessment = async () => {
        const apiKey = getCurrentApiKey();
        if (!apiKey) {
            setShowSettings(true);
            return;
        }

        if (!stats) return;

        setIsLoading(true);
        setMessages(prev => [...prev, { role: 'user', content: '⚠️ ประเมินความเสี่ยง' }]);

        try {
            const response = await fetch(`${API_BASE}/ai/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider,
                    api_key: apiKey,
                    stats: buildTradingContext(),
                    analysis_type: 'risk'
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to analyze');
            }

            const data = await response.json();
            setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
        } catch (error: any) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `❌ Error: ${error.message}`
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    // Clear chat and memory
    const clearChat = async () => {
        setMessages([]);
        // Also clear backend memory
        try {
            await fetch(`${API_BASE}/ai/memory/default`, { method: 'DELETE' });
        } catch (e) {
            // Ignore errors
        }
    };

    // Styles
    const panelClass = isDark
        ? 'bg-slate-900 border-slate-700'
        : 'bg-white border-gray-200';
    const headerClass = isDark
        ? 'bg-slate-800 border-slate-700'
        : 'bg-gray-50 border-gray-200';
    const inputClass = isDark
        ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-400'
        : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400';
    const textClass = isDark ? 'text-white' : 'text-gray-900';
    const mutedClass = isDark ? 'text-slate-400' : 'text-gray-500';

    const currentModels = provider === 'openai' ? OPENAI_MODELS : GEMINI_MODELS;
    const currentModelLabel = provider === 'openai'
        ? OPENAI_MODELS.find(m => m.value === openaiModel)?.label || openaiModel
        : GEMINI_MODELS.find(m => m.value === geminiModel)?.label || geminiModel;

    return (
        <AIContext.Provider value={{ analyzeSection }}>
            {/* Render children (page content) */}
            {children}

            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(true)}
                className={`fixed bottom-6 right-6 p-4 rounded-full shadow-lg transition-all hover:scale-110 z-50 ${isDark
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'
                    : 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white'
                    } ${isOpen ? 'hidden' : ''}`}
            >
                <MessageSquare size={24} />
            </button>

            {/* Chat Panel */}
            {isOpen && (
                <div className={`fixed ${isExpanded ? 'bottom-4 right-4 w-[700px] h-[85vh]' : 'bottom-6 right-6 w-[420px] h-[650px]'} rounded-2xl border shadow-2xl flex flex-col z-50 transition-all duration-300 ${panelClass}`}>
                    {/* Header */}
                    <div className={`flex items-center justify-between p-4 border-b rounded-t-2xl ${headerClass}`}>
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-500">
                                <Bot size={18} className="text-white" />
                            </div>
                            <div>
                                <h3 className={`font-semibold ${textClass}`}>AI Trading Assistant</h3>
                                <p className={`text-xs ${mutedClass}`}>
                                    {provider === 'openai' ? 'OpenAI' : 'Gemini'} • {currentModelLabel}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-200'}`}
                                title={isExpanded ? 'ย่อหน้าต่าง' : 'ขยายหน้าต่าง'}
                            >
                                {isExpanded ? (
                                    <Minimize2 size={18} className={mutedClass} />
                                ) : (
                                    <Maximize2 size={18} className={mutedClass} />
                                )}
                            </button>
                            {messages.length > 0 && (
                                <button
                                    onClick={clearChat}
                                    className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-200'}`}
                                    title="ล้างการสนทนา"
                                >
                                    <Trash2 size={18} className={mutedClass} />
                                </button>
                            )}
                            <button
                                onClick={() => setShowSettings(!showSettings)}
                                className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-200'}`}
                            >
                                <Settings size={18} className={mutedClass} />
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-200'}`}
                            >
                                <X size={18} className={mutedClass} />
                            </button>
                        </div>
                    </div>

                    {/* Settings Panel */}
                    {showSettings ? (
                        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                            <h4 className={`font-medium ${textClass}`}>⚙️ ตั้งค่า AI</h4>

                            {/* Provider */}
                            <div>
                                <label className={`text-sm ${mutedClass}`}>ผู้ให้บริการ AI</label>
                                <select
                                    value={provider}
                                    onChange={(e) => setProvider(e.target.value as AIProvider)}
                                    className={`w-full mt-1 px-3 py-2 rounded-lg border ${inputClass}`}
                                >
                                    <option value="gemini">Google Gemini</option>
                                    <option value="openai">OpenAI ChatGPT</option>
                                </select>
                            </div>

                            {/* Model Selection */}
                            <div>
                                <label className={`text-sm ${mutedClass}`}>โมเดล</label>
                                <select
                                    value={provider === 'openai' ? openaiModel : geminiModel}
                                    onChange={(e) => {
                                        if (provider === 'openai') {
                                            setOpenaiModel(e.target.value);
                                        } else {
                                            setGeminiModel(e.target.value);
                                        }
                                    }}
                                    className={`w-full mt-1 px-3 py-2 rounded-lg border ${inputClass}`}
                                >
                                    {currentModels.map(model => (
                                        <option key={model.value} value={model.value}>
                                            {model.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* OpenAI Key */}
                            <div>
                                <label className={`text-sm ${mutedClass}`}>OpenAI API Key</label>
                                <input
                                    type="password"
                                    value={openaiKey}
                                    onChange={(e) => setOpenaiKey(e.target.value)}
                                    placeholder="sk-..."
                                    className={`w-full mt-1 px-3 py-2 rounded-lg border ${inputClass}`}
                                />
                            </div>

                            {/* Gemini Key */}
                            <div>
                                <label className={`text-sm ${mutedClass}`}>Gemini API Key</label>
                                <input
                                    type="password"
                                    value={geminiKey}
                                    onChange={(e) => setGeminiKey(e.target.value)}
                                    placeholder="AIza..."
                                    className={`w-full mt-1 px-3 py-2 rounded-lg border ${inputClass}`}
                                />
                            </div>

                            <button
                                onClick={saveSettings}
                                className="w-full py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium"
                            >
                                💾 บันทึกการตั้งค่า
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {messages.length === 0 ? (
                                    <div className={`text-center py-8 ${mutedClass}`}>
                                        <Bot size={48} className="mx-auto mb-4 opacity-50" />
                                        <p className="text-sm">สวัสดีครับ! ฉันคือ AI Trading Assistant</p>
                                        <p className="text-xs mt-1">พร้อมช่วยวิเคราะห์และให้คำแนะนำ</p>

                                        {stats && (
                                            <div className="mt-4 space-y-2">
                                                <div className="flex flex-wrap gap-2 justify-center">
                                                    <button
                                                        onClick={quickAnalyze}
                                                        disabled={isLoading}
                                                        className="px-3 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs flex items-center gap-1.5 hover:opacity-90 transition"
                                                    >
                                                        <Sparkles size={14} />
                                                        Quick Insights
                                                    </button>
                                                    <button
                                                        onClick={comprehensiveAnalysis}
                                                        disabled={isLoading}
                                                        className={`px-3 py-2 rounded-lg text-xs flex items-center gap-1.5 transition ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-200 hover:bg-gray-300'}`}
                                                    >
                                                        📋 วิเคราะห์ครบถ้วน
                                                    </button>
                                                    <button
                                                        onClick={riskAssessment}
                                                        disabled={isLoading}
                                                        className={`px-3 py-2 rounded-lg text-xs flex items-center gap-1.5 transition ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-200 hover:bg-gray-300'}`}
                                                    >
                                                        ⚠️ ประเมินความเสี่ยง
                                                    </button>
                                                </div>
                                                <p className={`text-xs ${mutedClass} mt-3`}>
                                                    💡 หรือพิมพ์คำถามเกี่ยวกับการเทรดของคุณ
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    messages.map((msg, idx) => (
                                        <div
                                            key={idx}
                                            className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                        >
                                            {msg.role === 'assistant' && (
                                                <div className="p-1.5 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-500 h-fit">
                                                    <Bot size={14} className="text-white" />
                                                </div>
                                            )}
                                            <div
                                                className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${msg.role === 'user'
                                                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'
                                                    : isDark
                                                        ? 'bg-slate-800 text-slate-200'
                                                        : 'bg-gray-100 text-gray-800'
                                                    }`}
                                            >
                                                <div className="whitespace-pre-wrap">{msg.content}</div>
                                            </div>
                                            {msg.role === 'user' && (
                                                <div className="p-1.5 rounded-lg bg-slate-600 h-fit">
                                                    <User size={14} className="text-white" />
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}

                                {isLoading && (
                                    <div className="flex gap-2">
                                        <div className="p-1.5 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-500">
                                            <Bot size={14} className="text-white" />
                                        </div>
                                        <div className={`px-3 py-2 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
                                            <Loader2 size={16} className="animate-spin text-purple-500" />
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <div className={`p-4 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                                <div className="flex gap-2">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="ถามเกี่ยวกับการเทรด..."
                                        className={`flex-1 px-3 py-2 rounded-lg border ${inputClass}`}
                                        disabled={isLoading}
                                    />
                                    <button
                                        onClick={sendMessage}
                                        disabled={isLoading || !input.trim()}
                                        className="p-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white disabled:opacity-50"
                                    >
                                        <Send size={18} />
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
        </AIContext.Provider>
    );
}
