"""ThesisCheck Backend - FastAPI application entry point."""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import export, review

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

app = FastAPI(
    title="ThesisCheck API",
    description="LLM-powered thesis review backend for the Word Add-in",
    version="0.1.0",
)

# CORS configuration for Office Add-in
# Office Add-ins typically run from localhost during development
# and from Office CDN in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://localhost:3000",
        "https://localhost:3443",
        "http://localhost:3000",
        "http://localhost:3443",
        "null",  # Office Add-in taskpane may send origin as 'null'
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(review.router)
app.include_router(export.router)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "ThesisCheck API",
        "version": "0.1.0",
        "status": "running",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
