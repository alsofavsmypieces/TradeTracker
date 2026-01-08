"""
AI Router - Enhanced with Function Calling, Memory, and Multi-Agent concepts
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Literal, Any, Dict
import httpx
import json
from datetime import datetime

router = APIRouter(prefix="/ai", tags=["AI"])

# In-memory conversation storage (would use DB in production)
conversation_memory: Dict[str, List[dict]] = {}


class Message(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str


class ChatRequest(BaseModel):
    messages: List[Message]
    provider: Literal["openai", "gemini"] = "openai"
    api_key: str
    model: Optional[str] = None
    trading_context: Optional[dict] = None
    session_id: Optional[str] = "default"
    use_memory: bool = True


class AnalyzeRequest(BaseModel):
    provider: Literal["openai", "gemini"] = "openai"
    api_key: str
    stats: dict
    question: Optional[str] = None
    analysis_type: Optional[str] = "comprehensive"


class QuickInsightRequest(BaseModel):
    provider: Literal["openai", "gemini"] = "openai"
    api_key: str
    stats: dict
    trades: Optional[List[dict]] = None


class ChatResponse(BaseModel):
    response: str
    provider: str
    tools_used: Optional[List[str]] = None
    insights: Optional[List[str]] = None


# Define available tools for function calling
AVAILABLE_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "analyze_win_rate",
            "description": "วิเคราะห์ Win Rate และให้ข้อเสนอแนะ",
            "parameters": {
                "type": "object",
                "properties": {
                    "win_rate": {"type": "number", "description": "Win rate percentage"},
                    "total_trades": {"type": "integer", "description": "จำนวน trades ทั้งหมด"}
                },
                "required": ["win_rate"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "calculate_optimal_position",
            "description": "คำนวณ position size ที่เหมาะสมตาม Kelly Criterion",
            "parameters": {
                "type": "object",
                "properties": {
                    "win_rate": {"type": "number"},
                    "avg_win": {"type": "number"},
                    "avg_loss": {"type": "number"},
                    "account_balance": {"type": "number"}
                },
                "required": ["win_rate", "avg_win", "avg_loss"]
            }
        }
    },
    {
        "type": "function", 
        "function": {
            "name": "identify_trading_patterns",
            "description": "ระบุ patterns และพฤติกรรมการเทรด",
            "parameters": {
                "type": "object",
                "properties": {
                    "pattern_type": {"type": "string", "enum": ["time", "symbol", "size", "all"], "description": "ประเภท pattern ที่ต้องการวิเคราะห์"}
                },
                "required": ["pattern_type"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "risk_assessment",
            "description": "ประเมินความเสี่ยงของการเทรด",
            "parameters": {
                "type": "object",
                "properties": {
                    "max_drawdown": {"type": "number"},
                    "profit_factor": {"type": "number"},
                    "consecutive_losses": {"type": "integer"}
                },
                "required": ["max_drawdown", "profit_factor"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "generate_action_items",
            "description": "สร้างรายการสิ่งที่ควรทำเพื่อปรับปรุงการเทรด",
            "parameters": {
                "type": "object",
                "properties": {
                    "priority": {"type": "string", "enum": ["high", "medium", "all"]}
                },
                "required": []
            }
        }
    }
]


def execute_tool(tool_name: str, arguments: dict, context: dict) -> str:
    """Execute a tool and return the result"""
    
    if tool_name == "analyze_win_rate":
        win_rate = arguments.get("win_rate", context.get("win_rate", 0))
        total_trades = arguments.get("total_trades", context.get("total_trades", 0))
        
        if win_rate >= 60:
            assessment = "ยอดเยี่ยม"
            advice = "รักษาระดับนี้ไว้ และพิจารณาเพิ่ม position size ได้"
        elif win_rate >= 50:
            assessment = "ดี"
            advice = "พยายามหาจุดเข้าเทรดที่มี probability สูงขึ้น"
        elif win_rate >= 40:
            assessment = "ปานกลาง"
            advice = "ต้องมี R:R ratio สูงเพื่อชดเชย win rate ที่ต่ำ"
        else:
            assessment = "ต้องปรับปรุง"
            advice = "ทบทวน strategy และ entry criteria"
            
        return f"📊 Win Rate Analysis:\n- ระดับ: {assessment} ({win_rate:.1f}%)\n- Trades: {total_trades}\n- คำแนะนำ: {advice}"
    
    elif tool_name == "calculate_optimal_position":
        win_rate = arguments.get("win_rate", 50) / 100
        avg_win = arguments.get("avg_win", 1)
        avg_loss = abs(arguments.get("avg_loss", 1))
        balance = arguments.get("account_balance", 10000)
        
        if avg_loss > 0:
            rr_ratio = avg_win / avg_loss
            kelly = ((win_rate * rr_ratio) - (1 - win_rate)) / rr_ratio
            kelly_half = kelly / 2
            conservative = kelly / 4
            
            return f"""🎯 Position Sizing:
- Kelly Full: {kelly*100:.1f}%
- Kelly Half (แนะนำ): {kelly_half*100:.1f}%  
- Conservative: {conservative*100:.1f}%
- ถ้า Balance ${balance:,.0f} → ใช้ ${balance * kelly_half:.0f} ต่อ trade"""
        return "ไม่สามารถคำนวณได้ - ข้อมูลไม่ครบ"
    
    elif tool_name == "risk_assessment":
        max_dd = arguments.get("max_drawdown", context.get("max_drawdown", 0))
        pf = arguments.get("profit_factor", context.get("profit_factor", 0))
        
        risk_level = "🟢 ต่ำ"
        if max_dd > 20 or pf < 1.2:
            risk_level = "🔴 สูง"
        elif max_dd > 10 or pf < 1.5:
            risk_level = "🟡 ปานกลาง"
            
        return f"""⚠️ Risk Assessment:
- ระดับความเสี่ยง: {risk_level}
- Max Drawdown: {max_dd:.1f}%
- Profit Factor: {pf:.2f}
- คำแนะนำ: {"ลด position size" if risk_level == "🔴 สูง" else "รักษาวินัยการเทรด"}"""
    
    elif tool_name == "generate_action_items":
        priority = arguments.get("priority", "all")
        items = []
        
        # Generate based on context
        if context.get("win_rate", 0) < 50:
            items.append("🔴 ปรับปรุง entry criteria - Win Rate ต่ำกว่า 50%")
        if context.get("max_drawdown", 0) > 15:
            items.append("🔴 ลด position size - Drawdown สูงเกินไป")
        if context.get("profit_factor", 0) < 1.3:
            items.append("🟡 เพิ่ม profit factor ด้วยการ cut loss เร็วขึ้น")
        if context.get("avg_loss", 0) != 0 and abs(context.get("avg_win", 0) / abs(context.get("avg_loss", 1))) < 1.5:
            items.append("🟡 เพิ่ม R:R ratio - ตั้ง TP ไกลขึ้น หรือ SL แคบลง")
            
        if not items:
            items.append("✅ ผลการเทรดอยู่ในเกณฑ์ดี - รักษามาตรฐานนี้ไว้")
            
        return "📋 Action Items:\n" + "\n".join(f"{i+1}. {item}" for i, item in enumerate(items))
    
    elif tool_name == "identify_trading_patterns":
        pattern_type = arguments.get("pattern_type", "all")
        patterns = []
        
        # Would analyze actual trades in production
        patterns.append("- เทรดบ่อยที่สุดในช่วง 15:00-18:00 (London-NY overlap)")
        patterns.append("- Symbol ที่ทำกำไรมากสุด: XAUUSD")
        patterns.append("- Trades ที่ถือนานกว่า 4 ชม. มี win rate สูงกว่า")
        
        return "🔍 Trading Patterns:\n" + "\n".join(patterns)
    
    return f"Tool {tool_name} executed"


async def chat_openai_with_tools(messages: List[dict], api_key: str, model: str = "gpt-4o", 
                                  context: dict = None) -> tuple[str, List[str]]:
    """Call OpenAI Chat API with function calling"""
    tools_used = []
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        # First call with tools
        response = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": model,
                "messages": messages,
                "tools": AVAILABLE_TOOLS,
                "tool_choice": "auto",
                "temperature": 0.7,
                "max_tokens": 2000
            }
        )
        
        if response.status_code != 200:
            error = response.json().get("error", {}).get("message", "Unknown error")
            raise HTTPException(status_code=response.status_code, detail=f"OpenAI Error: {error}")
        
        data = response.json()
        assistant_message = data["choices"][0]["message"]
        
        # Check if model wants to use tools
        if assistant_message.get("tool_calls"):
            # Execute tools and add results
            tool_messages = [assistant_message]
            
            for tool_call in assistant_message["tool_calls"]:
                tool_name = tool_call["function"]["name"]
                try:
                    arguments = json.loads(tool_call["function"]["arguments"])
                except:
                    arguments = {}
                    
                tools_used.append(tool_name)
                result = execute_tool(tool_name, arguments, context or {})
                
                tool_messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call["id"],
                    "content": result
                })
            
            # Second call with tool results
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": model,
                    "messages": messages + tool_messages,
                    "temperature": 0.7,
                    "max_tokens": 2000
                }
            )
            
            if response.status_code != 200:
                error = response.json().get("error", {}).get("message", "Unknown error")
                raise HTTPException(status_code=response.status_code, detail=f"OpenAI Error: {error}")
            
            data = response.json()
        
        return data["choices"][0]["message"]["content"], tools_used


async def chat_openai(messages: List[dict], api_key: str, model: str = "gpt-4o-mini") -> str:
    """Call OpenAI Chat API (simple version)"""
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": model,
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 2000
            }
        )
        
        if response.status_code != 200:
            error = response.json().get("error", {}).get("message", "Unknown error")
            raise HTTPException(status_code=response.status_code, detail=f"OpenAI Error: {error}")
        
        data = response.json()
        return data["choices"][0]["message"]["content"]


async def chat_gemini(messages: List[dict], api_key: str, model: str = "gemini-2.0-flash") -> str:
    """Call Google Gemini API"""
    contents = []
    system_instruction = None
    
    for msg in messages:
        if msg["role"] == "system":
            system_instruction = msg["content"]
        else:
            role = "user" if msg["role"] == "user" else "model"
            contents.append({
                "role": role,
                "parts": [{"text": msg["content"]}]
            })
    
    request_body = {
        "contents": contents,
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 2000
        }
    }
    
    if system_instruction:
        request_body["systemInstruction"] = {
            "parts": [{"text": system_instruction}]
        }
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}",
            headers={"Content-Type": "application/json"},
            json=request_body
        )
        
        if response.status_code != 200:
            error = response.json().get("error", {}).get("message", "Unknown error")
            raise HTTPException(status_code=response.status_code, detail=f"Gemini Error: {error}")
        
        data = response.json()
        return data["candidates"][0]["content"]["parts"][0]["text"]


def build_enhanced_system_prompt(trading_context: Optional[dict] = None) -> str:
    """Build enhanced system prompt with detailed trading context"""
    base_prompt = """คุณเป็น **Trading Performance Analyst** ระดับ Professional ที่มีความเชี่ยวชาญด้าน:
- Technical Analysis และ Price Action
- Risk Management และ Position Sizing
- Trading Psychology และ Behavioral Finance
- Statistical Analysis ของ Trading Performance

## 🎯 หน้าที่หลัก:
1. **วิเคราะห์** ผลการเทรดอย่างละเอียด พร้อมเหตุผลทางสถิติ
2. **ระบุ** จุดแข็งที่ควรรักษา และจุดอ่อนที่ต้องแก้ไข
3. **แนะนำ** action items ที่ปฏิบัติได้จริง จัดลำดับความสำคัญ
4. **คำนวณ** และแนะนำ position sizing ที่เหมาะสม

## 📋 รูปแบบการตอบ:
- ใช้ภาษาไทยเป็นหลัก
- แบ่งหัวข้อชัดเจน ใช้ emoji เพื่อให้อ่านง่าย
- เน้นข้อมูลเชิงปริมาณ (ตัวเลข, %)
- ให้คำแนะนำที่ actionable และ specific
- หลีกเลี่ยงคำตอบกว้างๆ ที่ไม่เฉพาะเจาะจง

## 🛠️ Tools ที่คุณใช้ได้:
- analyze_win_rate: วิเคราะห์ Win Rate
- calculate_optimal_position: คำนวณ Position Size
- risk_assessment: ประเมินความเสี่ยง
- identify_trading_patterns: ค้นหา patterns
- generate_action_items: สร้าง action items"""
    
    if trading_context:
        # Extract key metrics
        stats = trading_context
        
        # Performance summary
        gain = stats.get('absolute_gain', 0)
        performance = "ยอดเยี่ยม 🌟" if gain > 20 else "ดี ✅" if gain > 10 else "ปานกลาง ⚠️" if gain > 0 else "ต้องปรับปรุง ❌"
        
        context_str = f"""

## 📊 ข้อมูลสถิติการเทรดของผู้ใช้:

### ภาพรวม
| Metric | Value | Status |
|--------|-------|--------|
| Total Gain | {gain:.2f}% | {performance} |
| Net Profit | ${stats.get('total_profit', 0):,.2f} | - |
| Win Rate | {stats.get('win_rate', 0):.1f}% | {"✅" if stats.get('win_rate', 0) >= 50 else "⚠️"} |
| Profit Factor | {stats.get('profit_factor', 0):.2f} | {"✅" if stats.get('profit_factor', 0) >= 1.5 else "⚠️"} |
| Max Drawdown | {stats.get('max_drawdown', 0):.1f}% | {"✅" if stats.get('max_drawdown', 0) < 15 else "⚠️"} |

### รายละเอียด
- Total Trades: {stats.get('total_trades', 0)}
- Winning: {stats.get('winning_trades', 0)} | Losing: {stats.get('losing_trades', 0)}
- Avg Win: ${stats.get('avg_win', 0):,.2f} | Avg Loss: ${stats.get('avg_loss', 0):,.2f}
- Largest Win: ${stats.get('largest_win', 0):,.2f} | Largest Loss: ${stats.get('largest_loss', 0):,.2f}
- Sharpe Ratio: {stats.get('sharpe_ratio', 0):.2f}

ใช้ข้อมูลเหล่านี้ในการวิเคราะห์และให้คำแนะนำที่ตรงจุด"""
        
        base_prompt += context_str
    
    return base_prompt


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Enhanced chat with AI about trading - supports function calling and memory"""
    try:
        session_id = request.session_id or "default"
        
        # Load conversation memory
        if request.use_memory and session_id in conversation_memory:
            history = conversation_memory[session_id][-10:]  # Last 10 messages
        else:
            history = []
        
        # Build messages with enhanced system context
        messages = []
        system_prompt = build_enhanced_system_prompt(request.trading_context)
        messages.append({"role": "system", "content": system_prompt})
        
        # Add history
        messages.extend(history)
        
        # Add new messages
        for msg in request.messages:
            messages.append({"role": msg.role, "content": msg.content})
        
        tools_used = []
        
        # Call the selected provider
        if request.provider == "openai":
            model = request.model or "gpt-4o"
            # Use function calling for GPT-4o
            if "gpt-4" in model:
                response, tools_used = await chat_openai_with_tools(
                    messages, request.api_key, model, request.trading_context
                )
            else:
                response = await chat_openai(messages, request.api_key, model)
        else:
            model = request.model or "gemini-2.0-flash"
            response = await chat_gemini(messages, request.api_key, model)
        
        # Save to memory
        if request.use_memory:
            if session_id not in conversation_memory:
                conversation_memory[session_id] = []
            conversation_memory[session_id].append({"role": "user", "content": request.messages[-1].content})
            conversation_memory[session_id].append({"role": "assistant", "content": response})
            # Keep last 20 messages
            conversation_memory[session_id] = conversation_memory[session_id][-20:]
        
        return ChatResponse(
            response=response, 
            provider=request.provider,
            tools_used=tools_used if tools_used else None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/quick-insights", response_model=ChatResponse)
async def quick_insights(request: QuickInsightRequest):
    """Generate automatic quick insights from trading stats"""
    try:
        stats = request.stats
        insights = []
        
        # Win Rate insight
        win_rate = stats.get('win_rate', 0)
        if win_rate >= 60:
            insights.append(f"🌟 Win Rate ยอดเยี่ยม ({win_rate:.1f}%) - รักษาระดับนี้ไว้")
        elif win_rate < 40:
            insights.append(f"⚠️ Win Rate ต่ำ ({win_rate:.1f}%) - ทบทวน entry criteria")
        
        # Profit Factor insight
        pf = stats.get('profit_factor', 0)
        if pf >= 2:
            insights.append(f"✅ Profit Factor ดีมาก ({pf:.2f}) - ระบบมี edge ชัดเจน")
        elif pf < 1:
            insights.append(f"❌ Profit Factor < 1 ({pf:.2f}) - ระบบขาดทุนในระยะยาว")
        
        # Drawdown insight
        dd = stats.get('max_drawdown', 0)
        if dd > 20:
            insights.append(f"🔴 Drawdown สูง ({dd:.1f}%) - ลด position size ทันที")
        elif dd > 10:
            insights.append(f"🟡 Drawdown ปานกลาง ({dd:.1f}%) - ระวังการเพิ่ม exposure")
        
        # R:R insight
        avg_win = stats.get('avg_win', 0)
        avg_loss = abs(stats.get('avg_loss', 1))
        if avg_loss > 0:
            rr = avg_win / avg_loss
            if rr < 1:
                insights.append(f"⚠️ R:R Ratio ต่ำ (1:{rr:.1f}) - เพิ่ม TP หรือลด SL")
        
        # Combine insights
        if not insights:
            insights.append("✅ ผลการเทรดอยู่ในเกณฑ์ดี ไม่มีประเด็นที่น่ากังวล")
        
        prompt = f"""จากสถิติการเทรด สรุป 3 ประเด็นสำคัญที่สุดให้กระชับ:

Insights ที่วิเคราะห์ได้:
{chr(10).join(insights)}

ให้สรุปเป็นภาษาไทย กระชับ ได้ใจความ พร้อม action items"""

        system_prompt = build_enhanced_system_prompt(stats)
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ]
        
        if request.provider == "openai":
            response = await chat_openai(messages, request.api_key, "gpt-4o-mini")
        else:
            response = await chat_gemini(messages, request.api_key, "gemini-2.0-flash")
        
        return ChatResponse(
            response=response, 
            provider=request.provider,
            insights=insights
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze", response_model=ChatResponse)
async def analyze(request: AnalyzeRequest):
    """Comprehensive AI analysis of trading stats"""
    try:
        analysis_prompts = {
            "comprehensive": """ทำการวิเคราะห์แบบครบถ้วน:

1. 📊 **สรุปภาพรวม** (1-2 ประโยค)
2. ✅ **จุดแข็ง 3 ข้อ** พร้อมตัวเลขสนับสนุน
3. ⚠️ **จุดที่ต้องปรับปรุง 3 ข้อ** พร้อมวิธีแก้ไข
4. 🎯 **Position Sizing แนะนำ** (ใช้ Kelly Criterion)
5. 📋 **Action Items สำหรับสัปดาห์หน้า** (3 ข้อ จัดลำดับความสำคัญ)""",

            "quick": """สรุปสั้นๆ 3 ประเด็นหลัก:
1. สถานะปัจจุบัน
2. สิ่งที่ควรทำ
3. สิ่งที่ควรหลีกเลี่ยง""",

            "risk": """วิเคราะห์ความเสี่ยง:
1. ระดับความเสี่ยงปัจจุบัน
2. ปัจจัยเสี่ยงหลัก
3. วิธีลดความเสี่ยง""",

            "strategy": """วิเคราะห์ strategy:
1. ลักษณะ strategy (trend following, scalping, etc.)
2. ความเหมาะสมกับตลาดปัจจุบัน
3. การปรับปรุงที่แนะนำ"""
        }
        
        question = request.question or analysis_prompts.get(request.analysis_type, analysis_prompts["comprehensive"])
        
        system_prompt = build_enhanced_system_prompt(request.stats)
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": question}
        ]
        
        if request.provider == "openai":
            response = await chat_openai(messages, request.api_key, "gpt-4o-mini")
        else:
            response = await chat_gemini(messages, request.api_key, "gemini-2.0-flash")
        
        return ChatResponse(response=response, provider=request.provider)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/memory/{session_id}")
async def clear_memory(session_id: str):
    """Clear conversation memory for a session"""
    if session_id in conversation_memory:
        del conversation_memory[session_id]
        return {"message": f"Memory cleared for session {session_id}"}
    return {"message": "No memory found for this session"}


@router.get("/memory/{session_id}")
async def get_memory(session_id: str):
    """Get conversation history for a session"""
    return {
        "session_id": session_id,
        "messages": conversation_memory.get(session_id, []),
        "count": len(conversation_memory.get(session_id, []))
    }
