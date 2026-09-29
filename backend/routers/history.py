import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from models.database import get_db, SearchHistory, User
from schemas.analysis import HistoryItem
from routers.auth import get_optional_user
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

router = APIRouter()


class HistoryCreateRequest(BaseModel):
    query: str
    query_type: str = "repo"
    result_summary: Optional[str] = None


@router.get("/api/history")
async def get_history(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    if current_user:
        stmt = select(SearchHistory).where(SearchHistory.user_id == current_user.id).order_by(SearchHistory.created_at.desc()).limit(50)
    else:
        stmt = select(SearchHistory).where(SearchHistory.user_id == None).order_by(SearchHistory.created_at.desc()).limit(50)
        
    result = await db.execute(stmt)
    items = result.scalars().all()
    return [
        {
            "id": item.id,
            "query": item.query,
            "query_type": item.query_type,
            "result_summary": item.result_summary,
            "created_at": item.created_at.isoformat() if item.created_at else None,
        }
        for item in items
    ]


@router.post("/api/history")
async def save_history(
    request: HistoryCreateRequest, 
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    history_item = SearchHistory(
        query=request.query,
        query_type=request.query_type,
        result_summary=request.result_summary,
        user_id=current_user.id if current_user else None,
        created_at=datetime.utcnow(),
    )
    db.add(history_item)
    await db.flush()
    return {"id": history_item.id, "message": "History saved successfully"}


@router.delete("/api/history/{item_id}")
async def delete_history_item(
    item_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    if current_user:
        stmt = select(SearchHistory).where(
            (SearchHistory.id == item_id) & (SearchHistory.user_id == current_user.id)
        )
    else:
        stmt = select(SearchHistory).where(
            (SearchHistory.id == item_id) & (SearchHistory.user_id == None)
        )
        
    result = await db.execute(stmt)
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="History item not found")
    await db.delete(item)
    return {"message": "History item deleted"}


@router.delete("/api/history")
async def clear_history(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    if current_user:
        await db.execute(delete(SearchHistory).where(SearchHistory.user_id == current_user.id))
    else:
        await db.execute(delete(SearchHistory).where(SearchHistory.user_id == None))
    return {"message": "History cleared"}
