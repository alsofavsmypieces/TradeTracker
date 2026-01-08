"""
MT5 Data Loader Module
======================
Handles connection to MetaTrader 5 and fetches trading history data.
Converts raw MT5 data into clean Pandas DataFrames for analysis.
"""

import MetaTrader5 as mt5
import pandas as pd
from datetime import datetime, timedelta
from typing import Optional, Tuple, Dict, Any
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class MT5Handler:
    """
    Manages MetaTrader 5 connection and data fetching operations.
    
    Usage:
        handler = MT5Handler(login=12345, password="xxx", server="Broker-Server")
        with handler:
            trades_df = handler.get_trades_dataframe(start_date, end_date)
            account_info = handler.get_account_info()
    """
    
    # MT5 Deal Types
    DEAL_TYPE_BUY = 0
    DEAL_TYPE_SELL = 1
    DEAL_TYPE_BALANCE = 2
    DEAL_TYPE_CREDIT = 3
    DEAL_TYPE_CHARGE = 4
    DEAL_TYPE_CORRECTION = 5
    DEAL_TYPE_BONUS = 6
    DEAL_TYPE_COMMISSION = 7
    DEAL_TYPE_COMMISSION_DAILY = 8
    DEAL_TYPE_COMMISSION_MONTHLY = 9
    DEAL_TYPE_COMMISSION_AGENT_DAILY = 10
    DEAL_TYPE_COMMISSION_AGENT_MONTHLY = 11
    DEAL_TYPE_INTEREST = 12
    DEAL_TYPE_BUY_CANCELED = 13
    DEAL_TYPE_SELL_CANCELED = 14
    
    # Deal Entry Types
    DEAL_ENTRY_IN = 0
    DEAL_ENTRY_OUT = 1
    DEAL_ENTRY_INOUT = 2
    
    def __init__(self, login: int, password: str, server: str, path: Optional[str] = None):
        """
        Initialize MT5 handler with account credentials.
        
        Args:
            login: MT5 account login ID
            password: MT5 account password
            server: Broker server name (e.g., "Exness-MT5Real")
            path: Optional path to MT5 terminal executable
        """
        self.login = login
        self.password = password
        self.server = server
        self.path = path
        self._connected = False
        
    def connect(self) -> bool:
        """
        Establish connection to MT5 terminal.
        
        Returns:
            True if connection successful, False otherwise
        """
        try:
            # Initialize MT5
            if self.path:
                if not mt5.initialize(path=self.path):
                    logger.error(f"MT5 initialization failed: {mt5.last_error()}")
                    return False
            else:
                if not mt5.initialize():
                    logger.error(f"MT5 initialization failed: {mt5.last_error()}")
                    return False
            
            # Login to account
            if not mt5.login(self.login, password=self.password, server=self.server):
                logger.error(f"MT5 login failed: {mt5.last_error()}")
                mt5.shutdown()
                return False
            
            self._connected = True
            logger.info(f"Connected to MT5 account {self.login} on {self.server}")
            return True
            
        except Exception as e:
            logger.error(f"Connection error: {str(e)}")
            return False
    
    def disconnect(self) -> None:
        """Safely disconnect from MT5 terminal."""
        if self._connected:
            mt5.shutdown()
            self._connected = False
            logger.info("Disconnected from MT5")
    
    def __enter__(self):
        """Context manager entry - establishes connection."""
        self.connect()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - ensures clean disconnection."""
        self.disconnect()
        return False
    
    @property
    def is_connected(self) -> bool:
        """Check if currently connected to MT5."""
        return self._connected and mt5.terminal_info() is not None
    
    def get_account_info(self) -> Optional[Dict[str, Any]]:
        """
        Fetch current account information.
        
        Returns:
            Dictionary containing account data or None if not connected
        """
        if not self.is_connected:
            logger.error("Not connected to MT5")
            return None
        
        account = mt5.account_info()
        if account is None:
            logger.error(f"Failed to get account info: {mt5.last_error()}")
            return None
        
        return {
            'login': account.login,
            'balance': account.balance,
            'equity': account.equity,
            'margin': account.margin,
            'margin_free': account.margin_free,
            'margin_level': account.margin_level,
            'profit': account.profit,
            'leverage': account.leverage,
            'currency': account.currency,
            'server': account.server,
            'name': account.name,
            'company': account.company
        }
    
    def fetch_history_deals(
        self, 
        start_date: datetime, 
        end_date: datetime
    ) -> Optional[pd.DataFrame]:
        """
        Fetch raw deal history from MT5.
        
        Args:
            start_date: Start of date range
            end_date: End of date range
            
        Returns:
            DataFrame with raw deal data or None if failed
        """
        if not self.is_connected:
            logger.error("Not connected to MT5")
            return None
        
        # Fetch deals from MT5
        deals = mt5.history_deals_get(start_date, end_date)
        
        if deals is None or len(deals) == 0:
            logger.warning(f"No deals found in range {start_date} to {end_date}")
            return pd.DataFrame()
        
        # Convert to DataFrame
        df = pd.DataFrame(list(deals), columns=deals[0]._asdict().keys())
        
        # Convert timestamp to datetime
        df['time'] = pd.to_datetime(df['time'], unit='s')
        if 'time_msc' in df.columns:
            df['time_msc'] = pd.to_datetime(df['time_msc'], unit='ms')
        
        logger.info(f"Fetched {len(df)} deals from {start_date} to {end_date}")
        return df
    
    def get_trades_dataframe(
        self, 
        start_date: datetime, 
        end_date: datetime,
        include_balance_ops: bool = False
    ) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """
        Get cleaned trades DataFrame with essential columns.
        
        Filters out non-trading entries and formats data for analysis.
        
        Args:
            start_date: Start of date range
            end_date: End of date range
            include_balance_ops: If True, return balance operations separately
            
        Returns:
            Tuple of (trades_df, balance_ops_df)
            - trades_df: Clean DataFrame with trading data
            - balance_ops_df: DataFrame with deposits/withdrawals (if include_balance_ops True)
        """
        raw_deals = self.fetch_history_deals(start_date, end_date)
        
        if raw_deals is None or raw_deals.empty:
            return pd.DataFrame(), pd.DataFrame()
        
        # Separate balance operations (deposits, withdrawals, etc.)
        balance_ops = raw_deals[raw_deals['type'] == self.DEAL_TYPE_BALANCE].copy()
        
        # Filter to only actual trades (buy/sell with exit)
        # Entry type 1 (OUT) means the trade is closed and has realized P/L
        trades_mask = (
            (raw_deals['type'].isin([self.DEAL_TYPE_BUY, self.DEAL_TYPE_SELL])) & 
            (raw_deals['entry'] == self.DEAL_ENTRY_OUT)
        )
        trades = raw_deals[trades_mask].copy()
        
        if trades.empty:
            logger.warning("No closed trades found in the date range")
            trades_df = pd.DataFrame(columns=[
                'ticket', 'time', 'symbol', 'type', 'type_str', 
                'volume', 'price', 'profit', 'swap', 'commission', 'fee'
            ])
        else:
            # Select and rename columns for clarity
            trades_df = pd.DataFrame({
                'ticket': trades['ticket'],
                'position_id': trades['position_id'],
                'time': trades['time'],
                'symbol': trades['symbol'],
                'type': trades['type'],
                'type_str': trades['type'].apply(lambda x: 'BUY' if x == 0 else 'SELL'),
                'volume': trades['volume'],
                'price': trades['price'],
                'profit': trades['profit'],
                'swap': trades['swap'],
                'commission': trades['commission'],
                'fee': trades.get('fee', 0)
            })
            
            # Sort by time
            trades_df = trades_df.sort_values('time').reset_index(drop=True)
            
            # Add net profit column (profit + swap + commission + fee)
            trades_df['net_profit'] = (
                trades_df['profit'] + 
                trades_df['swap'] + 
                trades_df['commission'] + 
                trades_df['fee']
            )
        
        # Format balance operations
        if include_balance_ops and not balance_ops.empty:
            balance_ops_df = pd.DataFrame({
                'ticket': balance_ops['ticket'],
                'time': balance_ops['time'],
                'amount': balance_ops['profit'],
                'comment': balance_ops.get('comment', '')
            })
            balance_ops_df = balance_ops_df.sort_values('time').reset_index(drop=True)
        else:
            balance_ops_df = pd.DataFrame()
        
        logger.info(f"Processed {len(trades_df)} closed trades, {len(balance_ops_df)} balance operations")
        return trades_df, balance_ops_df
    
    def get_equity_curve(
        self, 
        trades_df: pd.DataFrame, 
        initial_balance: float
    ) -> pd.DataFrame:
        """
        Calculate running balance and equity curve from trades.
        
        Args:
            trades_df: DataFrame from get_trades_dataframe()
            initial_balance: Starting account balance
            
        Returns:
            DataFrame with cumulative balance/equity over time
        """
        if trades_df.empty:
            return pd.DataFrame(columns=['time', 'balance', 'cumulative_profit'])
        
        # Calculate cumulative profit
        equity_df = trades_df[['time', 'net_profit']].copy()
        equity_df['cumulative_profit'] = equity_df['net_profit'].cumsum()
        equity_df['balance'] = initial_balance + equity_df['cumulative_profit']
        
        # Add starting point
        start_row = pd.DataFrame({
            'time': [trades_df['time'].min() - timedelta(seconds=1)],
            'net_profit': [0],
            'cumulative_profit': [0],
            'balance': [initial_balance]
        })
        
        equity_df = pd.concat([start_row, equity_df], ignore_index=True)
        
        return equity_df


def create_demo_data() -> pd.DataFrame:
    """
    Create sample trading data for testing without MT5 connection.
    
    Returns:
        DataFrame with simulated trading data
    """
    import numpy as np
    
    np.random.seed(42)
    n_trades = 100
    
    # Generate random trade data
    base_date = datetime(2024, 1, 1)
    dates = [base_date + timedelta(hours=np.random.randint(0, 8760)) for _ in range(n_trades)]
    dates.sort()
    
    symbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'BTCUSD']
    
    # Generate profits with slight positive bias (realistic win rate ~55%)
    profits = np.random.normal(50, 200, n_trades)
    
    demo_df = pd.DataFrame({
        'ticket': range(1000, 1000 + n_trades),
        'position_id': range(2000, 2000 + n_trades),
        'time': dates,
        'symbol': np.random.choice(symbols, n_trades),
        'type': np.random.choice([0, 1], n_trades),  # 0=BUY, 1=SELL
        'type_str': np.random.choice(['BUY', 'SELL'], n_trades),
        'volume': np.round(np.random.uniform(0.01, 1.0, n_trades), 2),
        'price': np.random.uniform(1.0, 2000, n_trades),
        'profit': profits,
        'swap': np.random.uniform(-5, 5, n_trades),
        'commission': np.random.uniform(-10, 0, n_trades),
        'fee': np.zeros(n_trades)
    })
    
    demo_df['net_profit'] = demo_df['profit'] + demo_df['swap'] + demo_df['commission']
    demo_df = demo_df.sort_values('time').reset_index(drop=True)
    
    return demo_df


if __name__ == "__main__":
    # Demo usage
    print("Creating demo data for testing...")
    demo_df = create_demo_data()
    print(f"\nSample trades:\n{demo_df.head(10)}")
    print(f"\nTotal trades: {len(demo_df)}")
    print(f"Total profit: ${demo_df['net_profit'].sum():.2f}")
