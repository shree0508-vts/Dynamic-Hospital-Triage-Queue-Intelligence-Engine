"""
Dynamic Hospital Triage & Queue Intelligence Engine
Backend Main Entry Point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router
from app.data.demo_data import initialize_demo_data

app = FastAPI(
    title="Hospital Triage & Queue Intelligence API",
    description="Dynamic patient flow management for unpredictable hospital environments.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")

@app.on_event("startup")
async def startup_event():
    initialize_demo_data()

@app.get("/")
def root():
    return {"message": "Hospital Triage & Queue Intelligence Engine API", "status": "running"}

@app.get("/health")
def health():
    return {"status": "healthy"}
