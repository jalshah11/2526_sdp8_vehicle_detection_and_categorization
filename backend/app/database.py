"""MongoDB connection using Motor (async driver)."""
from __future__ import annotations

import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load .env from the backend directory
from pathlib import Path
_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=_env_path)

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/vehicle_analytics")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "vehicle_analytics")

# Module-level client (created once on startup)
_client: AsyncIOMotorClient | None = None


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(MONGO_URI)
    return _client


def get_database():
    """Return the Motor database instance."""
    return get_client()[MONGO_DB_NAME]


async def close_client():
    global _client
    if _client is not None:
        _client.close()
        _client = None
