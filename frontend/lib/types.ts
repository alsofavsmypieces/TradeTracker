// Trading data types

export interface Trade {
    ticket: number;
    position_id?: number;
    time: string;
    entry_time?: string;
    symbol: string;
    type: 'BUY' | 'SELL';
    volume: number;
    entry_price?: number | null;
    price: number;  // Close price
    sl?: number | null;
    tp?: number | null;
    profit: number;
    swap: number;
    commission: number;
    net_profit: number;
}

export interface Account {
    login: number | string;
    balance: number;
    equity: number;
    currency: string;
    server: string;
    company: string;
}

export interface Stats {
    initial_balance: number;
    final_balance: number;
    total_profit: number;
    absolute_gain_pct: number;
    max_drawdown_pct: number;
    profit_factor: number;
    sharpe_ratio: number;
    z_score: number;
    expectancy: number;
    total_trades: number;
    winning_trades: number;
    losing_trades: number;
    win_rate_pct: number;
    avg_win: number;
    avg_loss: number;
    largest_win: number;
    largest_loss: number;
    gross_profit: number;
    gross_loss: number;
    long_trades: number;
    long_wins: number;
    long_win_rate: number;
    short_trades: number;
    short_wins: number;
    short_win_rate: number;
    total_lots: number;
    monthly_returns: MonthlyReturn[];
}

export interface MonthlyReturn {
    period: string;
    profit: number;
    gain_pct: number;
}

export interface PeriodStats {
    gain: number;
    profit: number;
    trades: number;
    win_pct: number;
    lots: number;
}

export interface OHLC {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
}

export interface OrderMarker {
    time: number;
    position: 'aboveBar' | 'belowBar';
    color: string;
    shape: 'arrowUp' | 'arrowDown' | 'circle';
    text: string;
    size?: number;
}

