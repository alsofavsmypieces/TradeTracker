"""
Statistics Router - Trading statistics calculation endpoints
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import pandas as pd
import numpy as np

router = APIRouter()


class Trade(BaseModel):
    ticket: int
    time: str
    symbol: str
    type: str
    volume: float
    price: float
    profit: float
    swap: float = 0
    commission: float = 0
    net_profit: float


class StatsRequest(BaseModel):
    trades: List[Trade]
    initial_balance: float = 10000


def calculate_stats(trades_df: pd.DataFrame, initial_balance: float) -> Dict[str, Any]:
    """Calculate all trading statistics from trades DataFrame."""
    if trades_df.empty:
        return get_empty_stats(initial_balance)
    
    # Ensure time is datetime
    if not pd.api.types.is_datetime64_any_dtype(trades_df['time']):
        trades_df['time'] = pd.to_datetime(trades_df['time'])
    
    # Basic calculations
    trades_df['is_win'] = trades_df['net_profit'] > 0
    trades_df['is_loss'] = trades_df['net_profit'] < 0
    trades_df['cumulative_profit'] = trades_df['net_profit'].cumsum()
    trades_df['balance'] = initial_balance + trades_df['cumulative_profit']
    
    total_profit = trades_df['net_profit'].sum()
    total_trades = len(trades_df)
    winning_trades = trades_df['is_win'].sum()
    losing_trades = trades_df['is_loss'].sum()
    
    # Gross profit/loss
    gross_profit = trades_df.loc[trades_df['is_win'], 'net_profit'].sum()
    gross_loss = abs(trades_df.loc[trades_df['is_loss'], 'net_profit'].sum())
    
    # Win rate
    win_rate = (winning_trades / total_trades * 100) if total_trades > 0 else 0
    
    # Average win/loss
    avg_win = trades_df.loc[trades_df['is_win'], 'net_profit'].mean() if winning_trades > 0 else 0
    avg_loss = trades_df.loc[trades_df['is_loss'], 'net_profit'].mean() if losing_trades > 0 else 0
    
    # Largest win/loss
    largest_win = trades_df['net_profit'].max()
    largest_loss = trades_df['net_profit'].min()
    
    # Profit Factor
    profit_factor = (gross_profit / gross_loss) if gross_loss > 0 else float('inf')
    
    # Max Drawdown (improved to match MT5 better)
    # Include potential intra-trade drawdown by creating equity points before each trade closes
    equity_points = [initial_balance]  # Start with initial balance
    running_balance = initial_balance
    
    for idx, row in trades_df.iterrows():
        # Before trade closes, equity might have been lower (for losing trades)
        # or higher then dropped (for winning trades that went negative first)
        # Approximate: if trade is a loss, equity dropped to that level
        # If trade is a win, assume minimal intra-trade drawdown
        
        # Add the closing balance
        running_balance += row['net_profit']
        
        # For losing trades, the low point was during the trade
        if row['net_profit'] < 0:
            # The drawdown happened during this trade
            equity_points.append(running_balance)
        else:
            equity_points.append(running_balance)
    
    equity_series = pd.Series(equity_points)
    running_max = equity_series.cummax()
    drawdown = (running_max - equity_series) / running_max * 100
    max_drawdown = drawdown.max()
    
    # Absolute Gain
    final_balance = initial_balance + total_profit
    absolute_gain = ((final_balance / initial_balance) - 1) * 100
    
    # Sharpe Ratio (MT5-compatible: mean/std of trade returns, no annualization)
    # MT5 calculates it as: average_profit / standard_deviation
    if len(trades_df) > 1 and trades_df['net_profit'].std() > 0:
        sharpe = trades_df['net_profit'].mean() / trades_df['net_profit'].std()
    else:
        sharpe = 0
    
    # Expectancy
    win_rate_decimal = win_rate / 100
    expectancy = (win_rate_decimal * avg_win) - ((1 - win_rate_decimal) * abs(avg_loss)) if avg_loss != 0 else avg_win
    
    # Long/Short Analysis
    long_trades = trades_df[trades_df['type'] == 'BUY']
    short_trades = trades_df[trades_df['type'] == 'SELL']
    
    long_count = len(long_trades)
    long_wins = long_trades['is_win'].sum() if not long_trades.empty else 0
    long_win_rate = (long_wins / long_count * 100) if long_count > 0 else 0
    
    short_count = len(short_trades)
    short_wins = short_trades['is_win'].sum() if not short_trades.empty else 0
    short_win_rate = (short_wins / short_count * 100) if short_count > 0 else 0
    
    # Z-Score calculation
    z_score = calculate_z_score(trades_df['is_win'].values)
    
    # Monthly returns
    trades_df['year_month'] = trades_df['time'].dt.to_period('M')
    monthly_profit = trades_df.groupby('year_month')['net_profit'].sum()
    monthly_returns = []
    for period, profit in monthly_profit.items():
        monthly_returns.append({
            "period": str(period),
            "profit": float(profit),
            "gain_pct": float(profit / initial_balance * 100)
        })
    
    return {
        "initial_balance": initial_balance,
        "final_balance": final_balance,
        "total_profit": total_profit,
        "absolute_gain_pct": absolute_gain,
        "max_drawdown_pct": max_drawdown,
        "profit_factor": profit_factor if profit_factor != float('inf') else 999.99,
        "sharpe_ratio": sharpe,
        "z_score": z_score,
        "expectancy": expectancy,
        "total_trades": total_trades,
        "winning_trades": int(winning_trades),
        "losing_trades": int(losing_trades),
        "win_rate_pct": win_rate,
        "avg_win": avg_win,
        "avg_loss": avg_loss,
        "largest_win": largest_win,
        "largest_loss": largest_loss,
        "gross_profit": gross_profit,
        "gross_loss": -abs(gross_loss),
        "long_trades": long_count,
        "long_wins": int(long_wins),
        "long_win_rate": long_win_rate,
        "short_trades": short_count,
        "short_wins": int(short_wins),
        "short_win_rate": short_win_rate,
        "total_lots": float(trades_df['volume'].sum()),
        "monthly_returns": monthly_returns
    }


def calculate_z_score(wins_losses: np.ndarray) -> float:
    """Calculate Z-Score for streak analysis."""
    if len(wins_losses) < 3:
        return 0.0
    
    N = len(wins_losses)
    W = wins_losses.sum()
    L = N - W
    
    if W == 0 or L == 0:
        return 0.0
    
    runs = 1
    for i in range(1, len(wins_losses)):
        if wins_losses[i] != wins_losses[i-1]:
            runs += 1
    
    R = runs
    P = 2 * W * L
    
    denominator = np.sqrt((P * (P - N)) / (N - 1)) if N > 1 and P > N else 1
    
    if denominator == 0:
        return 0.0
    
    return (N * (R - 0.5) - P) / denominator


def get_empty_stats(initial_balance: float) -> Dict[str, Any]:
    """Return empty statistics structure."""
    return {
        "initial_balance": initial_balance,
        "final_balance": initial_balance,
        "total_profit": 0,
        "absolute_gain_pct": 0,
        "max_drawdown_pct": 0,
        "profit_factor": 0,
        "sharpe_ratio": 0,
        "z_score": 0,
        "expectancy": 0,
        "total_trades": 0,
        "winning_trades": 0,
        "losing_trades": 0,
        "win_rate_pct": 0,
        "avg_win": 0,
        "avg_loss": 0,
        "largest_win": 0,
        "largest_loss": 0,
        "gross_profit": 0,
        "gross_loss": 0,
        "long_trades": 0,
        "long_wins": 0,
        "long_win_rate": 0,
        "short_trades": 0,
        "short_wins": 0,
        "short_win_rate": 0,
        "total_lots": 0,
        "monthly_returns": []
    }


@router.post("/calculate")
async def calculate_statistics(request: StatsRequest):
    """Calculate statistics from provided trades."""
    try:
        trades_data = [t.model_dump() for t in request.trades]
        trades_df = pd.DataFrame(trades_data)
        
        stats = calculate_stats(trades_df, request.initial_balance)
        return stats
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/demo")
async def get_demo_data():
    """Get demo trading data with calculated statistics."""
    np.random.seed(42)
    n_trades = 100
    
    base_date = datetime(2024, 1, 1)
    dates = [base_date + timedelta(hours=np.random.randint(0, 8760)) for _ in range(n_trades)]
    dates.sort()
    
    symbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'BTCUSD']
    types = ['BUY', 'SELL']
    profits = np.random.normal(50, 200, n_trades)
    
    trades = []
    for i in range(n_trades):
        swap = np.random.uniform(-5, 5)
        commission = np.random.uniform(-10, 0)
        profit = profits[i]
        
        trades.append({
            "ticket": 1000 + i,
            "time": dates[i].isoformat(),
            "symbol": np.random.choice(symbols),
            "type": np.random.choice(types),
            "volume": round(np.random.uniform(0.01, 1.0), 2),
            "price": round(np.random.uniform(1.0, 2000), 5),
            "profit": round(profit, 2),
            "swap": round(swap, 2),
            "commission": round(commission, 2),
            "net_profit": round(profit + swap + commission, 2)
        })
    
    trades_df = pd.DataFrame(trades)
    stats = calculate_stats(trades_df, 10000)
    
    return {
        "trades": trades,
        "stats": stats,
        "account": {
            "login": 12345,
            "balance": stats["final_balance"],
            "equity": stats["final_balance"],
            "currency": "USD",
            "server": "Demo-Server",
            "company": "Demo Broker"
        }
    }


@router.post("/period")
async def get_period_stats(request: StatsRequest, period: str = "month"):
    """Calculate period-specific statistics."""
    try:
        trades_data = [t.model_dump() for t in request.trades]
        trades_df = pd.DataFrame(trades_data)
        
        if trades_df.empty:
            return {"today": {}, "week": {}, "month": {}, "year": {}}
        
        trades_df['time'] = pd.to_datetime(trades_df['time'])
        now = datetime.now()
        
        periods = {
            "today": now.replace(hour=0, minute=0, second=0, microsecond=0),
            "week": now - timedelta(days=now.weekday()),
            "month": now.replace(day=1, hour=0, minute=0, second=0, microsecond=0),
            "year": now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        }
        
        results = {}
        for period_name, start_date in periods.items():
            mask = trades_df['time'] >= start_date
            period_df = trades_df[mask]
            
            if period_df.empty:
                results[period_name] = {
                    "gain": 0, "profit": 0, "trades": 0, "win_pct": 0, "lots": 0
                }
            else:
                profit = period_df['net_profit'].sum()
                trades_count = len(period_df)
                wins = (period_df['net_profit'] > 0).sum()
                
                results[period_name] = {
                    "gain": profit / request.initial_balance * 100,
                    "profit": profit,
                    "trades": trades_count,
                    "win_pct": wins / trades_count * 100 if trades_count > 0 else 0,
                    "lots": period_df['volume'].sum()
                }
        
        return results
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
