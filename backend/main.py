"""
Trading Analytics API Backend
FastAPI server with MT5 integration and statistics endpoints
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import mt5, stats, ai, news

app = FastAPI(
    title="Trading Analytics API",
    description="Backend API for Trading Analytics Dashboard",
    version="1.0.0"
)

# CORS - Allow all origins for deployment flexibility
# In production, you can restrict this to specific domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (Vercel, ngrok, localhost)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(mt5.router, prefix="/api/mt5", tags=["MT5"])
app.include_router(stats.router, prefix="/api/stats", tags=["Statistics"])
app.include_router(ai.router, prefix="/api", tags=["AI"])
app.include_router(news.router, prefix="/api", tags=["News Calendar"])


@app.get("/")
async def root():
    return {"message": "Trading Analytics API", "status": "running"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
