"""
Trading Statistics Engine
=========================
Calculates advanced trading metrics for performance analysis.
Uses vectorized Pandas/NumPy operations for efficiency.

Metrics Categories:
- Growth: Absolute Gain, Daily/Monthly Returns
- Risk: Max Drawdown, Sharpe Ratio, Profit Factor, Z-Score
- Trade Analysis: Win Rate, Avg Win/Loss, Long vs Short Performance
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, Tuple
import logging

logger = logging.getLogger(__name__)


class TradingStats:
    """
    Calculate comprehensive trading statistics from trade data.
    
    All calculations are done using vectorized operations for performance.
    
    Usage:
        stats = TradingStats(trades_df, initial_balance=10000)
        summary = stats.get_summary()
        monthly_returns = stats.get_monthly_returns()
    """
    
    def __init__(
        self, 
        trades_df: pd.DataFrame, 
        initial_balance: float,
        deposits: float = 0,
        withdrawals: float = 0
    ):
        """
        Initialize with trade data.
        
        Args:
            trades_df: DataFrame from MT5Handler.get_trades_dataframe()
            initial_balance: Starting account balance
            deposits: Total deposits during period
            withdrawals: Total withdrawals during period
        """
        self.trades = trades_df.copy() if not trades_df.empty else pd.DataFrame()
        self.initial_balance = initial_balance
        self.deposits = deposits
        self.withdrawals = withdrawals
        
        # Pre-calculate common values if we have trades
        if not self.trades.empty:
            self._prepare_data()
    
    def _prepare_data(self):
        """Prepare derived columns for calculations."""
        # Ensure time is datetime
        if not pd.api.types.is_datetime64_any_dtype(self.trades['time']):
            self.trades['time'] = pd.to_datetime(self.trades['time'])
        
        # Add date column for grouping
        self.trades['date'] = self.trades['time'].dt.date
        
        # Calculate cumulative balance
        self.trades['cumulative_profit'] = self.trades['net_profit'].cumsum()
        self.trades['balance'] = self.initial_balance + self.trades['cumulative_profit']
        
        # Win/Loss flags
        self.trades['is_win'] = self.trades['net_profit'] > 0
        self.trades['is_loss'] = self.trades['net_profit'] < 0
    
    # =========================================================================
    # GROWTH METRICS
    # =========================================================================
    
    def get_total_profit(self) -> float:
        """Total net profit from all trades."""
        if self.trades.empty:
            return 0.0
        return self.trades['net_profit'].sum()
    
    def get_absolute_gain(self) -> float:
        """
        Calculate absolute gain percentage.
        
        Formula: ((Ending Balance - Deposits + Withdrawals) / Starting Balance - 1) * 100
        
        This accounts for deposits/withdrawals to show true trading performance.
        """
        if self.trades.empty:
            return 0.0
        
        ending_balance = self.initial_balance + self.get_total_profit()
        
        # Adjust for deposits and withdrawals
        adjusted_ending = ending_balance - self.deposits + self.withdrawals
        
        if self.initial_balance == 0:
            return 0.0
        
        return ((adjusted_ending / self.initial_balance) - 1) * 100
    
    def get_daily_returns(self) -> pd.Series:
        """
        Get daily returns as percentage.
        
        Returns:
            Series indexed by date with daily return percentages
        """
        if self.trades.empty:
            return pd.Series(dtype=float)
        
        # Group by date and sum profits
        daily_pnl = self.trades.groupby('date')['net_profit'].sum()
        
        # Calculate running balance for each day
        cumulative = daily_pnl.cumsum()
        running_balance = self.initial_balance + cumulative.shift(1, fill_value=0)
        
        # Daily return = daily_pnl / starting_balance_that_day * 100
        daily_returns = (daily_pnl / running_balance) * 100
        
        return daily_returns
    
    def get_monthly_returns(self) -> pd.DataFrame:
        """
        Calculate monthly returns as a pivot table.
        
        Returns:
            DataFrame with Years as rows, Months as columns, values as return %
        """
        if self.trades.empty:
            return pd.DataFrame()
        
        # Create year-month grouping
        self.trades['year'] = self.trades['time'].dt.year
        self.trades['month'] = self.trades['time'].dt.month
        
        # Sum profit by month
        monthly_profit = self.trades.groupby(['year', 'month'])['net_profit'].sum().reset_index()
        
        # Calculate monthly return % relative to running balance
        # First, get starting balance for each month
        monthly_profit = monthly_profit.sort_values(['year', 'month'])
        monthly_profit['cumulative'] = monthly_profit['net_profit'].cumsum()
        monthly_profit['start_balance'] = self.initial_balance + monthly_profit['cumulative'].shift(1, fill_value=0)
        monthly_profit['return_pct'] = (monthly_profit['net_profit'] / monthly_profit['start_balance']) * 100
        
        # Pivot to get year x month matrix
        pivot = monthly_profit.pivot(index='year', columns='month', values='return_pct')
        
        # Rename columns to month names
        month_names = {
            1: 'Jan', 2: 'Feb', 3: 'Mar', 4: 'Apr',
            5: 'May', 6: 'Jun', 7: 'Jul', 8: 'Aug',
            9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dec'
        }
        pivot.columns = [month_names.get(m, m) for m in pivot.columns]
        
        return pivot.round(2)
    
    # =========================================================================
    # RISK METRICS
    # =========================================================================
    
    def get_max_drawdown(self) -> Tuple[float, datetime, datetime]:
        """
        Calculate Maximum Drawdown (MDD) based on running equity peaks.
        
        Max Drawdown measures the largest peak-to-trough decline.
        
        Formula: MDD = (Peak - Trough) / Peak * 100
        
        Returns:
            Tuple of (max_drawdown_pct, peak_date, trough_date)
        """
        if self.trades.empty:
            return 0.0, None, None
        
        balance = self.trades['balance']
        time = self.trades['time']
        
        # Calculate running maximum (peak)
        running_max = balance.cummax()
        
        # Calculate drawdown at each point
        drawdown = (running_max - balance) / running_max * 100
        
        # Find maximum drawdown
        max_dd_idx = drawdown.idxmax()
        max_dd = drawdown.loc[max_dd_idx]
        
        # Find peak date (last peak before max drawdown)
        peak_idx = balance[:max_dd_idx + 1].idxmax()
        peak_date = time.loc[peak_idx]
        trough_date = time.loc[max_dd_idx]
        
        return max_dd, peak_date, trough_date
    
    def get_drawdown_series(self) -> pd.DataFrame:
        """
        Get drawdown percentage over time for charting.
        
        Returns:
            DataFrame with time and drawdown_pct columns
        """
        if self.trades.empty:
            return pd.DataFrame(columns=['time', 'drawdown_pct'])
        
        balance = self.trades['balance']
        running_max = balance.cummax()
        drawdown_pct = (running_max - balance) / running_max * 100
        
        return pd.DataFrame({
            'time': self.trades['time'],
            'drawdown_pct': drawdown_pct
        })
    
    def get_profit_factor(self) -> float:
        """
        Calculate Profit Factor.
        
        Formula: Gross Profit / Gross Loss
        
        A PF > 1 means profitable, > 2 is considered very good.
        
        Returns:
            Profit factor ratio (returns inf if no losses)
        """
        if self.trades.empty:
            return 0.0
        
        gross_profit = self.trades.loc[self.trades['net_profit'] > 0, 'net_profit'].sum()
        gross_loss = abs(self.trades.loc[self.trades['net_profit'] < 0, 'net_profit'].sum())
        
        if gross_loss == 0:
            return float('inf') if gross_profit > 0 else 0.0
        
        return gross_profit / gross_loss
    
    def get_sharpe_ratio(self, risk_free_rate: float = 0.02) -> float:
        """
        Calculate annualized Sharpe Ratio.
        
        Formula: (Annualized Return - Risk Free Rate) / Annualized Volatility
        
        Where:
        - Annualized Return = Mean Daily Return * 252
        - Annualized Volatility = Std Dev of Daily Returns * sqrt(252)
        
        Args:
            risk_free_rate: Annual risk-free rate (default 2%)
            
        Returns:
            Sharpe ratio (higher is better, >1 is good, >2 is very good)
        """
        daily_returns = self.get_daily_returns()
        
        if daily_returns.empty or len(daily_returns) < 2:
            return 0.0
        
        # Convert from percentage to decimal
        daily_returns_decimal = daily_returns / 100
        
        # Annualize
        mean_daily = daily_returns_decimal.mean()
        std_daily = daily_returns_decimal.std()
        
        if std_daily == 0:
            return 0.0
        
        annualized_return = mean_daily * 252
        annualized_vol = std_daily * np.sqrt(252)
        
        sharpe = (annualized_return - risk_free_rate) / annualized_vol
        
        return sharpe
    
    def get_sortino_ratio(self, risk_free_rate: float = 0.02) -> float:
        """
        Calculate Sortino Ratio (like Sharpe but only considers downside volatility).
        
        Formula: (Annualized Return - Risk Free Rate) / Downside Deviation
        
        Returns:
            Sortino ratio
        """
        daily_returns = self.get_daily_returns()
        
        if daily_returns.empty or len(daily_returns) < 2:
            return 0.0
        
        daily_returns_decimal = daily_returns / 100
        
        # Only consider negative returns for downside deviation
        downside_returns = daily_returns_decimal[daily_returns_decimal < 0]
        
        if downside_returns.empty:
            return float('inf')  # No downside = perfect
        
        downside_std = downside_returns.std()
        
        if downside_std == 0:
            return 0.0
        
        mean_daily = daily_returns_decimal.mean()
        annualized_return = mean_daily * 252
        annualized_downside = downside_std * np.sqrt(252)
        
        sortino = (annualized_return - risk_free_rate) / annualized_downside
        
        return sortino
    
    def get_z_score(self) -> float:
        """
        Calculate Z-Score for win/loss streak analysis.
        
        Z-Score measures the probability of the observed win/loss sequence.
        
        Formula: Z = (N * (R - 0.5) - P) / sqrt((P * (P - N)) / (N - 1))
        
        Where:
        - N = Total number of trades
        - R = Number of runs (consecutive wins or losses)
        - P = 2 * W * L (expected number of runs)
        - W = Number of wins
        - L = Number of losses
        
        Interpretation:
        - Z > 2 or Z < -2: Significant streaking pattern
        - |Z| > 3: Very significant pattern
        
        Returns:
            Z-score value
        """
        if self.trades.empty or len(self.trades) < 3:
            return 0.0
        
        # Get win/loss sequence
        wins_losses = self.trades['is_win'].astype(int).values
        
        N = len(wins_losses)
        W = wins_losses.sum()  # Number of wins
        L = N - W  # Number of losses
        
        if W == 0 or L == 0:
            return 0.0  # All wins or all losses = no meaningful Z-score
        
        # Count runs (consecutive same outcomes)
        runs = 1
        for i in range(1, len(wins_losses)):
            if wins_losses[i] != wins_losses[i-1]:
                runs += 1
        
        R = runs
        P = 2 * W * L
        
        # Avoid division by zero
        denominator = np.sqrt((P * (P - N)) / (N - 1)) if N > 1 else 1
        
        if denominator == 0:
            return 0.0
        
        z = (N * (R - 0.5) - P) / denominator
        
        return z
    
    def get_expectancy(self) -> float:
        """
        Calculate expectancy (expected profit per trade).
        
        Formula: (Win Rate * Avg Win) - (Loss Rate * Avg Loss)
        
        Returns:
            Expected profit per trade in currency
        """
        if self.trades.empty:
            return 0.0
        
        win_rate = self.get_win_rate() / 100
        loss_rate = 1 - win_rate
        
        avg_win = self.get_average_win()
        avg_loss = abs(self.get_average_loss())
        
        expectancy = (win_rate * avg_win) - (loss_rate * avg_loss)
        
        return expectancy
    
    # =========================================================================
    # TRADE ANALYSIS
    # =========================================================================
    
    def get_total_trades(self) -> int:
        """Total number of trades."""
        return len(self.trades)
    
    def get_winning_trades(self) -> int:
        """Number of winning trades."""
        if self.trades.empty:
            return 0
        return self.trades['is_win'].sum()
    
    def get_losing_trades(self) -> int:
        """Number of losing trades."""
        if self.trades.empty:
            return 0
        return self.trades['is_loss'].sum()
    
    def get_win_rate(self) -> float:
        """Win rate as percentage."""
        total = self.get_total_trades()
        if total == 0:
            return 0.0
        return (self.get_winning_trades() / total) * 100
    
    def get_average_win(self) -> float:
        """Average profit from winning trades."""
        if self.trades.empty:
            return 0.0
        wins = self.trades.loc[self.trades['is_win'], 'net_profit']
        return wins.mean() if len(wins) > 0 else 0.0
    
    def get_average_loss(self) -> float:
        """Average loss from losing trades (returns negative value)."""
        if self.trades.empty:
            return 0.0
        losses = self.trades.loc[self.trades['is_loss'], 'net_profit']
        return losses.mean() if len(losses) > 0 else 0.0
    
    def get_gross_profit(self) -> float:
        """Sum of all winning trades."""
        if self.trades.empty:
            return 0.0
        return self.trades.loc[self.trades['is_win'], 'net_profit'].sum()
    
    def get_gross_loss(self) -> float:
        """Sum of all losing trades (returns negative value)."""
        if self.trades.empty:
            return 0.0
        return self.trades.loc[self.trades['is_loss'], 'net_profit'].sum()
    
    def get_largest_win(self) -> float:
        """Largest single winning trade."""
        if self.trades.empty:
            return 0.0
        return self.trades['net_profit'].max()
    
    def get_largest_loss(self) -> float:
        """Largest single losing trade (returns negative value)."""
        if self.trades.empty:
            return 0.0
        return self.trades['net_profit'].min()
    
    def get_long_short_analysis(self) -> Dict[str, Any]:
        """
        Analyze performance of long (BUY) vs short (SELL) trades.
        
        Returns:
            Dictionary with long and short statistics
        """
        if self.trades.empty:
            return {
                'long': {'trades': 0, 'win_rate': 0, 'profit': 0},
                'short': {'trades': 0, 'win_rate': 0, 'profit': 0}
            }
        
        # Long trades (type_str == 'BUY' but entry OUT means we closed a SELL, so flip)
        # Actually in MT5, deal type at OUT reflects the closing direction
        # For simplicity, we use the deal type directly
        long_trades = self.trades[self.trades['type'] == 0]  # BUY exits
        short_trades = self.trades[self.trades['type'] == 1]  # SELL exits
        
        def analyze_subset(df):
            if df.empty:
                return {'trades': 0, 'wins': 0, 'win_rate': 0.0, 'profit': 0.0}
            wins = df['is_win'].sum()
            return {
                'trades': len(df),
                'wins': int(wins),
                'win_rate': (wins / len(df)) * 100,
                'profit': df['net_profit'].sum()
            }
        
        return {
            'long': analyze_subset(long_trades),
            'short': analyze_subset(short_trades)
        }
    
    def get_profit_by_symbol(self) -> pd.DataFrame:
        """
        Get profit breakdown by trading symbol.
        
        Returns:
            DataFrame with symbol, trade_count, total_profit, win_rate
        """
        if self.trades.empty:
            return pd.DataFrame(columns=['symbol', 'trades', 'profit', 'win_rate'])
        
        grouped = self.trades.groupby('symbol').agg({
            'net_profit': ['sum', 'count'],
            'is_win': 'sum'
        }).reset_index()
        
        grouped.columns = ['symbol', 'profit', 'trades', 'wins']
        grouped['win_rate'] = (grouped['wins'] / grouped['trades']) * 100
        grouped = grouped.drop('wins', axis=1)
        
        return grouped.sort_values('profit', ascending=False)
    
    # =========================================================================
    # DURATION ANALYSIS
    # =========================================================================
    
    def get_average_holding_time(self) -> Optional[timedelta]:
        """
        Calculate average trade holding time.
        
        Note: This requires position open time which may not be in deals data.
        If not available, returns None.
        """
        # MT5 deals only have close time, not open time
        # Would need to match with positions to calculate this
        # For now, return None as a placeholder
        return None
    
    def get_trades_per_day(self) -> float:
        """Average number of trades per trading day."""
        if self.trades.empty:
            return 0.0
        
        unique_days = self.trades['date'].nunique()
        if unique_days == 0:
            return 0.0
        
        return len(self.trades) / unique_days
    
    # =========================================================================
    # SUMMARY
    # =========================================================================
    
    def get_summary(self) -> Dict[str, Any]:
        """
        Get complete trading statistics summary.
        
        Returns:
            Dictionary with all calculated metrics
        """
        max_dd, peak_date, trough_date = self.get_max_drawdown()
        long_short = self.get_long_short_analysis()
        
        return {
            # Account Info
            'initial_balance': self.initial_balance,
            'final_balance': self.initial_balance + self.get_total_profit(),
            'total_profit': self.get_total_profit(),
            
            # Growth Metrics
            'absolute_gain_pct': self.get_absolute_gain(),
            
            # Risk Metrics
            'max_drawdown_pct': max_dd,
            'max_drawdown_peak': peak_date,
            'max_drawdown_trough': trough_date,
            'profit_factor': self.get_profit_factor(),
            'sharpe_ratio': self.get_sharpe_ratio(),
            'sortino_ratio': self.get_sortino_ratio(),
            'z_score': self.get_z_score(),
            'expectancy': self.get_expectancy(),
            
            # Trade Analysis
            'total_trades': self.get_total_trades(),
            'winning_trades': self.get_winning_trades(),
            'losing_trades': self.get_losing_trades(),
            'win_rate_pct': self.get_win_rate(),
            'avg_win': self.get_average_win(),
            'avg_loss': self.get_average_loss(),
            'largest_win': self.get_largest_win(),
            'largest_loss': self.get_largest_loss(),
            'gross_profit': self.get_gross_profit(),
            'gross_loss': self.get_gross_loss(),
            
            # Long/Short Analysis
            'long_trades': long_short['long']['trades'],
            'long_wins': long_short['long']['wins'],
            'long_win_rate': long_short['long']['win_rate'],
            'long_profit': long_short['long']['profit'],
            'short_trades': long_short['short']['trades'],
            'short_wins': long_short['short']['wins'],
            'short_win_rate': long_short['short']['win_rate'],
            'short_profit': long_short['short']['profit'],
            
            # Activity
            'trades_per_day': self.get_trades_per_day()
        }


if __name__ == "__main__":
    # Demo usage with sample data
    from data_loader import create_demo_data
    
    print("Loading demo trade data...")
    trades_df = create_demo_data()
    
    print("\nCalculating statistics...")
    stats = TradingStats(trades_df, initial_balance=10000)
    
    summary = stats.get_summary()
    print("\n" + "="*50)
    print("TRADING STATISTICS SUMMARY")
    print("="*50)
    
    print(f"\n📊 ACCOUNT:")
    print(f"   Initial Balance: ${summary['initial_balance']:,.2f}")
    print(f"   Final Balance:   ${summary['final_balance']:,.2f}")
    print(f"   Total Profit:    ${summary['total_profit']:,.2f}")
    print(f"   Absolute Gain:   {summary['absolute_gain_pct']:.2f}%")
    
    print(f"\n📉 RISK METRICS:")
    print(f"   Max Drawdown:    {summary['max_drawdown_pct']:.2f}%")
    print(f"   Profit Factor:   {summary['profit_factor']:.2f}")
    print(f"   Sharpe Ratio:    {summary['sharpe_ratio']:.2f}")
    print(f"   Z-Score:         {summary['z_score']:.2f}")
    print(f"   Expectancy:      ${summary['expectancy']:.2f}")
    
    print(f"\n🎯 TRADE ANALYSIS:")
    print(f"   Total Trades:    {summary['total_trades']}")
    print(f"   Win Rate:        {summary['win_rate_pct']:.1f}%")
    print(f"   Avg Win:         ${summary['avg_win']:.2f}")
    print(f"   Avg Loss:        ${summary['avg_loss']:.2f}")
    
    print(f"\n📈 MONTHLY RETURNS:")
    monthly = stats.get_monthly_returns()
    print(monthly.to_string())
