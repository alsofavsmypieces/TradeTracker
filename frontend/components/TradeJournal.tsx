'use client';

import React, { useState, useEffect } from 'react';
import { BookOpen, X, Save, Tag, Plus, Trash2 } from 'lucide-react';
import { Trade } from '@/lib/types';

interface TradeNote {
    ticket: number;
    note: string;
    tags: string[];
    createdAt: string;
    updatedAt: string;
}

interface TradeJournalProps {
    trade: Trade;
    isDark?: boolean;
    onClose: () => void;
}

const STORAGE_KEY = 'trade_journal_notes';

// Helper to load notes from localStorage
const loadNotes = (): { [key: number]: TradeNote } => {
    if (typeof window === 'undefined') return {};
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
};

// Helper to save notes to localStorage
const saveNotes = (notes: { [key: number]: TradeNote }) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
};

export default function TradeJournal({ trade, isDark = true, onClose }: TradeJournalProps) {
    const [note, setNote] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [newTag, setNewTag] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Load existing note for this trade
    useEffect(() => {
        const notes = loadNotes();
        const existingNote = notes[trade.ticket];
        if (existingNote) {
            setNote(existingNote.note);
            setTags(existingNote.tags);
        }
    }, [trade.ticket]);

    const handleSave = () => {
        setIsSaving(true);
        const notes = loadNotes();

        notes[trade.ticket] = {
            ticket: trade.ticket,
            note,
            tags,
            createdAt: notes[trade.ticket]?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        saveNotes(notes);

        setTimeout(() => {
            setIsSaving(false);
            onClose();
        }, 300);
    };

    const handleAddTag = () => {
        if (newTag.trim() && !tags.includes(newTag.trim())) {
            setTags([...tags, newTag.trim()]);
            setNewTag('');
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setTags(tags.filter(t => t !== tagToRemove));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddTag();
        }
    };

    // Styles
    const overlayClass = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
    const modalClass = isDark
        ? 'bg-slate-900 border-slate-700'
        : 'bg-white border-gray-200';
    const inputClass = isDark
        ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-400'
        : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400';
    const textClass = isDark ? 'text-white' : 'text-gray-900';
    const mutedClass = isDark ? 'text-slate-400' : 'text-gray-500';

    // Suggested tags
    const suggestedTags = ['FOMO', 'Revenge', 'Plan Followed', 'Early Exit', 'Late Entry', 'News', 'Trend', 'Reversal', 'Scalp', 'Swing'];

    return (
        <div className={overlayClass} onClick={onClose}>
            <div
                className={`w-full max-w-lg rounded-2xl border shadow-2xl ${modalClass}`}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                    <div className="flex items-center gap-2">
                        <BookOpen size={20} className="text-purple-500" />
                        <h3 className={`font-semibold ${textClass}`}>Trade Journal</h3>
                    </div>
                    <button onClick={onClose} className={`p-1 rounded-lg ${isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-100'}`}>
                        <X size={20} className={mutedClass} />
                    </button>
                </div>

                {/* Trade Info */}
                <div className={`p-4 border-b ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-100 bg-gray-50'}`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className={`font-medium ${textClass}`}>{trade.symbol}</p>
                            <p className={`text-sm ${mutedClass}`}>Ticket: {trade.ticket}</p>
                        </div>
                        <div className="text-right">
                            <p className={`font-bold ${trade.net_profit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {trade.net_profit >= 0 ? '+' : ''}${trade.net_profit.toFixed(2)}
                            </p>
                            <p className={`text-sm ${mutedClass}`}>{trade.type} • {trade.volume} lot</p>
                        </div>
                    </div>
                </div>

                {/* Note Input */}
                <div className="p-4 space-y-4">
                    <div>
                        <label className={`block text-sm font-medium mb-2 ${textClass}`}>
                            📝 Notes
                        </label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Write your thoughts about this trade..."
                            rows={4}
                            className={`w-full px-4 py-3 rounded-xl border resize-none ${inputClass}`}
                        />
                    </div>

                    {/* Tags */}
                    <div>
                        <label className={`block text-sm font-medium mb-2 ${textClass}`}>
                            🏷️ Tags
                        </label>

                        {/* Current Tags */}
                        <div className="flex flex-wrap gap-2 mb-3">
                            {tags.map(tag => (
                                <span
                                    key={tag}
                                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${isDark ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-700'}`}
                                >
                                    {tag}
                                    <button onClick={() => handleRemoveTag(tag)} className="hover:text-red-400">
                                        <X size={14} />
                                    </button>
                                </span>
                            ))}
                        </div>

                        {/* Add Tag Input */}
                        <div className="flex gap-2 mb-3">
                            <input
                                type="text"
                                value={newTag}
                                onChange={(e) => setNewTag(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Add a tag..."
                                className={`flex-1 px-3 py-2 rounded-lg border text-sm ${inputClass}`}
                            />
                            <button
                                onClick={handleAddTag}
                                className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg"
                            >
                                <Plus size={18} />
                            </button>
                        </div>

                        {/* Suggested Tags */}
                        <div className="flex flex-wrap gap-2">
                            {suggestedTags.filter(t => !tags.includes(t)).slice(0, 5).map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => setTags([...tags, tag])}
                                    className={`px-2 py-1 rounded text-xs ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
                                >
                                    + {tag}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className={`flex items-center justify-end gap-3 p-4 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                    <button
                        onClick={onClose}
                        className={`px-4 py-2 rounded-lg ${isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-gray-100 text-gray-600'}`}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg disabled:opacity-50"
                    >
                        <Save size={16} />
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Helper component to show journal indicator
export function JournalIndicator({ ticket, isDark = true }: { ticket: number; isDark?: boolean }) {
    const [hasNote, setHasNote] = useState(false);

    useEffect(() => {
        const notes = loadNotes();
        setHasNote(!!notes[ticket]);
    }, [ticket]);

    if (!hasNote) return null;

    return (
        <span className={`p-1 rounded ${isDark ? 'bg-purple-500/20' : 'bg-purple-100'}`}>
            <BookOpen size={12} className="text-purple-500" />
        </span>
    );
}
