from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import httpx

router = APIRouter(prefix="/news", tags=["News Calendar"])

class NewsAPIRequest(BaseModel):
    api_key: str
    endpoint: str = "calendar"  # calendar, list, event-info, etc.

class NewsEvent(BaseModel):
    id: Optional[int] = None
    name: Optional[str] = None
    currency: Optional[str] = None
    category: Optional[str] = None
    date: Optional[str] = None
    actual: Optional[str] = None
    forecast: Optional[str] = None
    previous: Optional[str] = None
    outcome: Optional[str] = None
    strength: Optional[str] = None
    quality: Optional[str] = None
    projection: Optional[str] = None
    impact: Optional[str] = None  # high, medium, low

NEWS_API_BASE = "https://www.jblanked.com/news/api"

@router.post("/calendar")
async def get_calendar(request: NewsAPIRequest):
    """
    Fetch news calendar from JBlanked News API
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Api-Key {request.api_key}"
            }
            
            response = await client.get(
                f"{NEWS_API_BASE}/{request.endpoint}/",
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                return {
                    "success": True,
                    "events": data,
                    "count": len(data) if isinstance(data, list) else 0
                }
            elif response.status_code == 401:
                raise HTTPException(status_code=401, detail="Invalid API Key")
            elif response.status_code == 403:
                raise HTTPException(status_code=403, detail="API Key not authorized")
            else:
                raise HTTPException(
                    status_code=response.status_code, 
                    detail=f"API Error: {response.text}"
                )
                
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="API Timeout")
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Request Error: {str(e)}")

@router.get("/demo")
async def get_demo_calendar():
    """
    Get demo calendar data for testing (no API key required)
    """
    demo_events = [
        {
            "id": 1,
            "name": "Non-Farm Payrolls",
            "currency": "USD",
            "category": "Employment",
            "date": "2024-12-20 13:30:00",
            "actual": None,
            "forecast": "200K",
            "previous": "227K",
            "impact": "high"
        },
        {
            "id": 2,
            "name": "Core CPI m/m",
            "currency": "USD",
            "category": "Inflation",
            "date": "2024-12-20 13:30:00",
            "actual": "0.3%",
            "forecast": "0.2%",
            "previous": "0.3%",
            "impact": "high"
        },
        {
            "id": 3,
            "name": "Retail Sales m/m",
            "currency": "USD",
            "category": "Consumer",
            "date": "2024-12-20 13:30:00",
            "actual": None,
            "forecast": "0.5%",
            "previous": "0.4%",
            "impact": "medium"
        },
        {
            "id": 4,
            "name": "ECB Press Conference",
            "currency": "EUR",
            "category": "Central Bank",
            "date": "2024-12-20 14:30:00",
            "actual": None,
            "forecast": None,
            "previous": None,
            "impact": "high"
        },
        {
            "id": 5,
            "name": "German ZEW Economic Sentiment",
            "currency": "EUR",
            "category": "Economic Sentiment",
            "date": "2024-12-20 10:00:00",
            "actual": "7.4",
            "forecast": "6.5",
            "previous": "7.0",
            "impact": "medium"
        },
        {
            "id": 6,
            "name": "BOE Meeting Minutes",
            "currency": "GBP",
            "category": "Central Bank",
            "date": "2024-12-20 09:30:00",
            "actual": None,
            "forecast": None,
            "previous": None,
            "impact": "medium"
        },
        {
            "id": 7,
            "name": "Canadian CPI y/y",
            "currency": "CAD",
            "category": "Inflation",
            "date": "2024-12-20 13:30:00",
            "actual": None,
            "forecast": "2.0%",
            "previous": "2.0%",
            "impact": "high"
        },
        {
            "id": 8,
            "name": "Australian Employment Change",
            "currency": "AUD",
            "category": "Employment",
            "date": "2024-12-20 00:30:00",
            "actual": "35.6K",
            "forecast": "25.0K",
            "previous": "15.9K",
            "impact": "high"
        },
        {
            "id": 9,
            "name": "Japanese Trade Balance",
            "currency": "JPY",
            "category": "Trade",
            "date": "2024-12-20 23:50:00",
            "actual": "-0.46T",
            "forecast": "-0.68T",
            "previous": "-0.46T",
            "impact": "low"
        },
        {
            "id": 10,
            "name": "Swiss SNB Interest Rate",
            "currency": "CHF",
            "category": "Central Bank",
            "date": "2024-12-20 08:30:00",
            "actual": "0.50%",
            "forecast": "0.75%",
            "previous": "1.00%",
            "impact": "high"
        },
        {
            "id": 11,
            "name": "FOMC Statement",
            "currency": "USD",
            "category": "Central Bank",
            "date": "2024-12-20 19:00:00",
            "actual": None,
            "forecast": None,
            "previous": None,
            "impact": "high"
        },
        {
            "id": 12,
            "name": "NZD GDP q/q",
            "currency": "NZD",
            "category": "GDP",
            "date": "2024-12-20 21:45:00",
            "actual": None,
            "forecast": "0.3%",
            "previous": "-0.2%",
            "impact": "medium"
        }
    ]
    
    return {
        "success": True,
        "events": demo_events,
        "count": len(demo_events),
        "is_demo": True
    }


# Cache for ForexFactory data (5 minute TTL)
_ff_cache = {
    "data": None,
    "timestamp": None,
    "ttl_seconds": 300  # 5 minutes
}

@router.get("/forexfactory")
async def get_forexfactory_calendar():
    """
    Fetch real calendar data from ForexFactory (FREE, no API key needed)
    Parses the weekly calendar JSON with caching to prevent rate limiting
    """
    from datetime import datetime, timedelta, date as dt_date
    import time
    
    # Check cache first
    if _ff_cache["data"] is not None and _ff_cache["timestamp"] is not None:
        age = time.time() - _ff_cache["timestamp"]
        if age < _ff_cache["ttl_seconds"]:
            # Return cached data
            cached = _ff_cache["data"].copy()
            cached["from_cache"] = True
            cached["cache_age_seconds"] = int(age)
            return cached
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Use JSON endpoint
            url = "https://nfs.faireconomy.media/ff_calendar_thisweek.json"
            
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "application/json, */*"
            }
            
            response = await client.get(url, headers=headers, follow_redirects=True)
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Failed to fetch ForexFactory data: HTTP {response.status_code}"
                )
            
            # Parse JSON
            data = response.json()
            events = []
            
            for idx, item in enumerate(data):
                # Determine impact level
                impact_text = item.get('impact', '').lower()
                if impact_text in ['high', 'red']:
                    impact = 'high'
                elif impact_text in ['medium', 'orange', 'med']:
                    impact = 'medium'
                elif impact_text in ['low', 'yellow']:
                    impact = 'low'
                else:
                    impact = 'low'
                
                # Parse date/time
                date_str = item.get('date', '')
                time_str = item.get('time', '')
                
                # Parse date - FF JSON now uses ISO format like "2025-12-19T08:30:00-05:00"
                try:
                    if 'T' in date_str:
                        # ISO format - parse directly
                        # Remove timezone suffix for simpler parsing
                        dt_str = date_str.split('-05:00')[0].split('-06:00')[0].split('+')[0]
                        dt = datetime.fromisoformat(dt_str)
                        
                        # Already in EST, convert to Thai time (+12 hours)
                        thai_dt = dt + timedelta(hours=12)
                        formatted_date = thai_dt.strftime("%Y-%m-%d %H:%M:%S")
                        event_date = thai_dt.date()
                    elif date_str and time_str:
                        # Old format: "12-20-2024" and "8:30am"
                        if time_str.lower() in ['all day', 'tentative', '']:
                            formatted_date = date_str
                            event_date = None
                        else:
                            full_datetime = f"{date_str} {time_str}"
                            dt = datetime.strptime(full_datetime, "%m-%d-%Y %I:%M%p")
                            thai_dt = dt + timedelta(hours=12)
                            formatted_date = thai_dt.strftime("%Y-%m-%d %H:%M:%S")
                            event_date = thai_dt.date()
                    else:
                        formatted_date = date_str
                        event_date = None
                except Exception:
                    formatted_date = date_str or ""
                    event_date = None
                
                events.append({
                    "id": idx + 1,
                    "name": item.get('title', 'Unknown'),
                    "currency": item.get('country', 'USD').upper(),
                    "category": None,
                    "date": formatted_date,
                    "event_date": str(event_date) if event_date else None,
                    "actual": item.get('actual') if item.get('actual') else None,
                    "forecast": item.get('forecast') if item.get('forecast') else None,
                    "previous": item.get('previous') if item.get('previous') else None,
                    "impact": impact
                })
            
            # Sort by date
            events.sort(key=lambda x: x.get('date', ''))
            
            # Filter to today only (Thai time)
            today_str = dt_date.today().strftime("%Y-%m-%d")
            today_events = [e for e in events if e.get('event_date') == today_str]
            
            result = {
                "success": True,
                "events": today_events,
                "all_events": events,
                "count": len(today_events),
                "total_week": len(events),
                "source": "ForexFactory",
                "timezone": "Asia/Bangkok (GMT+7)",
                "date": today_str,
                "is_live": True
            }
            
            # Store in cache
            _ff_cache["data"] = result
            _ff_cache["timestamp"] = time.time()
            
            return result
            
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="ForexFactory Timeout")
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Request Error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

