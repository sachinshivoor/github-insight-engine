import os
import sys
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from models.database import init_db
from routers import health, ai, history, reports, auth


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    print("[INFO] Database initialized")
    print("[INFO] GitHub Insight Engine API is ready!")
    yield
    # Shutdown
    print("[INFO] Shutting down GitHub Insight Engine API")


app = FastAPI(
    title="GitHub Insight Engine API",
    description="AI-powered GitHub repository analytics and learning recommendations",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware — allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(health.router)
app.include_router(ai.router)
app.include_router(history.router)
app.include_router(reports.router)
app.include_router(auth.router)

# Serve frontend static files
FRONTEND_DIR = Path(__file__).parent.parent / "frontend"

if FRONTEND_DIR.exists():
    @app.get("/", include_in_schema=False)
    async def serve_index():
        response = FileResponse(str(FRONTEND_DIR / "index.html"))
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response

    @app.get("/{path:path}", include_in_schema=False)
    async def serve_spa(path: str):
        file_path = FRONTEND_DIR / path
        if file_path.exists() and file_path.is_file():
            response = FileResponse(str(file_path))
        else:
            response = FileResponse(str(FRONTEND_DIR / "index.html"))
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response
else:
    @app.get("/", include_in_schema=False)
    async def api_info():
        return {
            "message": "GitHub Insight Engine API",
            "docs": "/docs",
            "note": "Frontend not found. Place frontend/ directory next to backend/"
        }


if __name__ == "__main__":
    print("GitHub Insight Engine")
    print("=" * 40)
    print("Starting server at http://localhost:8000")
    print("API docs at http://localhost:8000/docs")
    print("=" * 40)
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=[str(Path(__file__).parent)],
    )
