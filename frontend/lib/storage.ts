// Storage utilities for credentials and settings

const STORAGE_KEYS = {
    CREDENTIALS: 'tradetracker_credentials',
    SETTINGS: 'tradetracker_settings',
};

export interface SavedCredentials {
    login: string;
    server: string;
    // Note: password is NOT saved for security
}

export interface AppSettings {
    isDark: boolean;
    defaultDateRange: string;
    customStartDate?: string;
    customEndDate?: string;
}

// Default server as requested
export const DEFAULT_SERVER = 'Exness-MT5Real36';

// Credentials management
export const saveCredentials = (login: string, server: string): void => {
    if (typeof window === 'undefined') return;
    const data: SavedCredentials = { login, server };
    localStorage.setItem(STORAGE_KEYS.CREDENTIALS, JSON.stringify(data));
};

export const loadCredentials = (): SavedCredentials => {
    if (typeof window === 'undefined') {
        return { login: '', server: DEFAULT_SERVER };
    }
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.CREDENTIALS);
        if (stored) {
            const parsed = JSON.parse(stored);
            return {
                login: parsed.login || '',
                server: parsed.server || DEFAULT_SERVER,
            };
        }
    } catch (e) {
        console.error('Failed to load credentials:', e);
    }
    return { login: '', server: DEFAULT_SERVER };
};

export const clearCredentials = (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEYS.CREDENTIALS);
};

// Settings management
export const saveSettings = (settings: AppSettings): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
};

export const loadSettings = (): AppSettings => {
    if (typeof window === 'undefined') {
        return { isDark: true, defaultDateRange: '30' };
    }
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.error('Failed to load settings:', e);
    }
    return { isDark: true, defaultDateRange: '30' };
};
