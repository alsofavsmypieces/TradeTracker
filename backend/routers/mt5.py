"""
MT5 Router - MetaTrader 5 connection and data endpoints
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import pandas as pd

router = APIRouter()


class MT5Credentials(BaseModel):
    login: int
    password: str
    server: str


class DateRange(BaseModel):
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    days: Optional[int] = 30


# Store connection state (simplified for demo)
connection_state = {
    "connected": False,
    "account_info": None
}


@router.post("/connect")
async def connect_mt5(credentials: MT5Credentials):
    """Connect to MT5 with provided credentials."""
    try:
        import MetaTrader5 as mt5
        
        if not mt5.initialize():
            error = mt5.last_error()
            raise HTTPException(
                status_code=500,
                detail=f"Failed to initialize MT5: {error[0]} - {error[1]}"
            )
        
        if not mt5.login(credentials.login, password=credentials.password, server=credentials.server):
            error = mt5.last_error()
            mt5.shutdown()
            raise HTTPException(
                status_code=401,
                detail=f"Login failed: {error[0]} - {error[1]}"
            )
        
        account = mt5.account_info()
        if account:
            connection_state["connected"] = True
            connection_state["account_info"] = {
                "login": account.login,
                "balance": account.balance,
                "equity": account.equity,
                "margin": account.margin,
                "margin_free": account.margin_free,
                "profit": account.profit,
                "currency": account.currency,
                "server": account.server,
                "company": account.company
            }
            return {
                "success": True,
                "message": "Connected successfully",
                "account": connection_state["account_info"]
            }
        
        raise HTTPException(status_code=500, detail="Failed to get account info")
        
    except ImportError:
        raise HTTPException(status_code=500, detail="MetaTrader5 library not installed")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/disconnect")
async def disconnect_mt5():
    """Disconnect from MT5."""
    try:
        import MetaTrader5 as mt5
        mt5.shutdown()
        connection_state["connected"] = False
        connection_state["account_info"] = None
        return {"success": True, "message": "Disconnected"}
    except Exception as e:
        return {"success": False, "message": str(e)}


@router.get("/account")
async def get_account():
    """Get current account info."""
    if not connection_state["connected"]:
        raise HTTPException(status_code=400, detail="Not connected to MT5")
    return connection_state["account_info"]


@router.get("/account-live")
async def get_account_live():
    """Get real-time account info (balance, equity, profit)."""
    try:
        import MetaTrader5 as mt5
        
        if mt5.terminal_info() is None:
            raise HTTPException(status_code=400, detail="Not connected to MT5")
        
        account = mt5.account_info()
        if account:
            return {
                "balance": account.balance,
                "equity": account.equity,
                "profit": account.profit,
                "margin": account.margin,
                "margin_free": account.margin_free,
                "margin_level": account.margin_level if account.margin > 0 else 0
            }
        raise HTTPException(status_code=500, detail="Failed to get account info")
    except ImportError:
        raise HTTPException(status_code=500, detail="MetaTrader5 library not installed")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/positions")
async def get_positions():
    """Get currently open positions."""
    try:
        import MetaTrader5 as mt5
        
        if mt5.terminal_info() is None:
            raise HTTPException(status_code=400, detail="Not connected to MT5")
        
        positions = mt5.positions_get()
        
        if positions is None:
            return {"positions": []}
        
        result = []
        for pos in positions:
            result.append({
                "ticket": pos.ticket,
                "symbol": pos.symbol,
                "type": "BUY" if pos.type == 0 else "SELL",
                "volume": pos.volume,
                "entry_price": pos.price_open,
                "current_price": pos.price_current,
                "profit": pos.profit,
                "swap": pos.swap,
                "time": datetime.fromtimestamp(pos.time).isoformat(),
                "sl": pos.sl,
                "tp": pos.tp,
                "magic": pos.magic,
                "comment": pos.comment
            })
        
        return {"positions": result}
    except ImportError:
        raise HTTPException(status_code=500, detail="MetaTrader5 library not installed")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/trades")
async def get_trades(date_range: DateRange):
    """Get trade history from MT5 with complete details."""
    try:
        import MetaTrader5 as mt5
        
        if not connection_state["connected"]:
            if mt5.terminal_info() is None:
                raise HTTPException(status_code=400, detail="Not connected to MT5")
        
        # Calculate dates
        if date_range.start_date and date_range.end_date:
            start = datetime.fromisoformat(date_range.start_date)
            end = datetime.fromisoformat(date_range.end_date)
        else:
            end = datetime.now()
            start = end - timedelta(days=date_range.days or 30)
        
        # Extend lookback for entry deals (add 365 days before start to capture entries)
        extended_start = start - timedelta(days=365)
        
        # Fetch all deals with extended range to get entry deals
        deals = mt5.history_deals_get(extended_start, end)
        
        if deals is None or len(deals) == 0:
            return {"trades": [], "count": 0}
        
        df = pd.DataFrame(list(deals), columns=deals[0]._asdict().keys())
        df['time'] = pd.to_datetime(df['time'], unit='s')
        
        # Get history orders for SL/TP info - index by position_id
        orders = mt5.history_orders_get(start, end)
        orders_by_position = {}
        orders_by_ticket = {}
        if orders:
            for order in orders:
                orders_by_ticket[order.ticket] = order
                # Orders have position_id field
                if hasattr(order, 'position_id') and order.position_id > 0:
                    if order.position_id not in orders_by_position:
                        orders_by_position[order.position_id] = []
                    orders_by_position[order.position_id].append(order)
        
        # Filter buy/sell deals only
        trades_mask = df['type'].isin([0, 1])
        trades_df = df[trades_mask].copy()
        
        if trades_df.empty:
            return {"trades": [], "count": 0}
        
        # Group by position_id to get entry and exit info
        trades_list = []
        
        # Build a dict of entry deals by position_id for quick lookup
        entry_deals_by_pos = {}
        for pos_id in trades_df['position_id'].unique():
            pos_deals = trades_df[trades_df['position_id'] == pos_id]
            entry_deals = pos_deals[pos_deals['entry'] == 0]
            if not entry_deals.empty:
                entry_deals_by_pos[pos_id] = entry_deals.iloc[0]
        
        # Process ALL exit deals (entry == 1), each becomes a trade
        exit_deals = trades_df[trades_df['entry'] == 1].copy()
        
        for _, exit_row in exit_deals.iterrows():
            # Only include trades with exit time within the original date range
            exit_time = exit_row['time']
            if exit_time < pd.Timestamp(start) or exit_time > pd.Timestamp(end):
                continue
            
            pos_id = exit_row['position_id']
            
            # Get entry info from the position
            entry_price = None
            entry_time = None
            sl = None
            tp = None
            trade_type = "SELL" if exit_row['type'] == 0 else "BUY"  # Exit type is opposite of trade direction
            
            if pos_id in entry_deals_by_pos:
                entry_row = entry_deals_by_pos[pos_id]
                entry_price = float(entry_row['price'])
                entry_time = entry_row['time'].isoformat()
                # Determine actual trade type from entry deal
                trade_type = "BUY" if entry_row['type'] == 0 else "SELL"
            
            # Try to get SL/TP from orders associated with this position
            if pos_id in orders_by_position:
                for order in orders_by_position[pos_id]:
                    if order.sl > 0 and sl is None:
                        sl = float(order.sl)
                    if order.tp > 0 and tp is None:
                        tp = float(order.tp)
            
            trades_list.append({
                "ticket": int(exit_row['ticket']),
                "position_id": int(pos_id),
                "time": exit_row['time'].isoformat(),
                "entry_time": entry_time,
                "symbol": exit_row['symbol'],
                "type": trade_type,
                "volume": float(exit_row['volume']),
                "entry_price": entry_price,
                "price": float(exit_row['price']),  # Close price
                "sl": sl,
                "tp": tp,
                "profit": float(exit_row['profit']),
                "swap": float(exit_row['swap']),
                "commission": float(exit_row['commission']),
                "net_profit": float(exit_row['profit'] + exit_row['swap'] + exit_row['commission'])
            })
        
        # Sort by time descending
        trades_list.sort(key=lambda x: x['time'], reverse=True)
        
        return {
            "trades": trades_list,
            "count": len(trades_list),
            "start_date": start.isoformat(),
            "end_date": end.isoformat()
        }
        
    except ImportError:
        raise HTTPException(status_code=500, detail="MetaTrader5 library not installed")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/positions")
async def get_positions(date_range: DateRange):
    """Get complete position history with entry and exit points."""
    try:
        import MetaTrader5 as mt5
        
        if not connection_state["connected"]:
            if mt5.terminal_info() is None:
                raise HTTPException(status_code=400, detail="Not connected to MT5")
        
        # Calculate dates
        if date_range.start_date and date_range.end_date:
            start = datetime.fromisoformat(date_range.start_date)
            end = datetime.fromisoformat(date_range.end_date)
        else:
            end = datetime.now()
            start = end - timedelta(days=date_range.days or 30)
        
        # Fetch all deals
        deals = mt5.history_deals_get(start, end)
        
        if deals is None or len(deals) == 0:
            return {"positions": [], "count": 0}
        
        df = pd.DataFrame(list(deals), columns=deals[0]._asdict().keys())
        df['time'] = pd.to_datetime(df['time'], unit='s')
        
        # Filter only buy/sell deals
        trades_mask = df['type'].isin([0, 1])
        trades_df = df[trades_mask].copy()
        
        if trades_df.empty:
            return {"positions": [], "count": 0}
        
        # Group by position_id to get entry and exit
        positions = []
        for pos_id in trades_df['position_id'].unique():
            pos_deals = trades_df[trades_df['position_id'] == pos_id].sort_values('time')
            
            if len(pos_deals) >= 2:
                entry_deal = pos_deals[pos_deals['entry'] == 0].iloc[0] if not pos_deals[pos_deals['entry'] == 0].empty else None
                exit_deal = pos_deals[pos_deals['entry'] == 1].iloc[0] if not pos_deals[pos_deals['entry'] == 1].empty else None
                
                if entry_deal is not None and exit_deal is not None:
                    positions.append({
                        "position_id": int(pos_id),
                        "symbol": entry_deal['symbol'],
                        "type": "BUY" if entry_deal['type'] == 0 else "SELL",
                        "volume": float(entry_deal['volume']),
                        "entry_time": int(entry_deal['time'].timestamp()),
                        "entry_price": float(entry_deal['price']),
                        "exit_time": int(exit_deal['time'].timestamp()),
                        "exit_price": float(exit_deal['price']),
                        "profit": float(exit_deal['profit']),
                        "swap": float(exit_deal['swap']),
                        "commission": float(exit_deal['commission']),
                        "net_profit": float(exit_deal['profit'] + exit_deal['swap'] + exit_deal['commission'])
                    })
            elif len(pos_deals) == 1:
                # Single deal - could be entry only (open position) or exit only
                deal = pos_deals.iloc[0]
                if deal['entry'] == 1:  # Exit deal
                    positions.append({
                        "position_id": int(pos_id),
                        "symbol": deal['symbol'],
                        "type": "BUY" if deal['type'] == 0 else "SELL",
                        "volume": float(deal['volume']),
                        "entry_time": None,
                        "entry_price": None,
                        "exit_time": int(deal['time'].timestamp()),
                        "exit_price": float(deal['price']),
                        "profit": float(deal['profit']),
                        "swap": float(deal['swap']),
                        "commission": float(deal['commission']),
                        "net_profit": float(deal['profit'] + deal['swap'] + deal['commission'])
                    })
        
        return {
            "positions": positions,
            "count": len(positions),
            "start_date": start.isoformat(),
            "end_date": end.isoformat()
        }
        
    except ImportError:
        raise HTTPException(status_code=500, detail="MetaTrader5 library not installed")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
async def get_status():
    """Get MT5 connection status."""
    return {
        "connected": connection_state["connected"],
        "has_account": connection_state["account_info"] is not None
    }


class OHLCRequest(BaseModel):
    symbol: str
    timeframe: str = "H1"  # M1, M5, M15, M30, H1, H4, D1, W1, MN1
    bars: int = 500


@router.post("/ohlc")
async def get_ohlc(request: OHLCRequest):
    """Fetch OHLC candlestick data from MT5."""
    try:
        import MetaTrader5 as mt5
        
        if not connection_state["connected"]:
            if mt5.terminal_info() is None:
                raise HTTPException(status_code=400, detail="Not connected to MT5")
        
        # Map timeframe string to MT5 constant
        timeframe_map = {
            "M1": mt5.TIMEFRAME_M1,
            "M5": mt5.TIMEFRAME_M5,
            "M15": mt5.TIMEFRAME_M15,
            "M30": mt5.TIMEFRAME_M30,
            "H1": mt5.TIMEFRAME_H1,
            "H4": mt5.TIMEFRAME_H4,
            "D1": mt5.TIMEFRAME_D1,
            "W1": mt5.TIMEFRAME_W1,
            "MN1": mt5.TIMEFRAME_MN1,
        }
        
        tf = timeframe_map.get(request.timeframe.upper(), mt5.TIMEFRAME_H1)
        
        # Fetch rates
        rates = mt5.copy_rates_from_pos(request.symbol, tf, 0, request.bars)
        
        if rates is None or len(rates) == 0:
            return {"candles": [], "count": 0, "symbol": request.symbol}
        
        # Convert to list of dicts
        candles = []
        for rate in rates:
            candles.append({
                "time": int(rate['time']),
                "open": float(rate['open']),
                "high": float(rate['high']),
                "low": float(rate['low']),
                "close": float(rate['close']),
                "volume": int(rate['tick_volume'])
            })
        
        return {
            "candles": candles,
            "count": len(candles),
            "symbol": request.symbol,
            "timeframe": request.timeframe
        }
        
    except ImportError:
        raise HTTPException(status_code=500, detail="MetaTrader5 library not installed")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/symbols")
async def get_symbols():
    """Get list of available symbols from MT5."""
    try:
        import MetaTrader5 as mt5
        
        if not connection_state["connected"]:
            if mt5.terminal_info() is None:
                raise HTTPException(status_code=400, detail="Not connected to MT5")
        
        symbols = mt5.symbols_get()
        
        if symbols is None:
            return {"symbols": []}
        
        # Return only visible symbols
        symbol_list = [s.name for s in symbols if s.visible]
        
        return {"symbols": symbol_list[:100]}  # Limit to 100
        
    except ImportError:
        raise HTTPException(status_code=500, detail="MetaTrader5 library not installed")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

