import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.database import get_db, SavedReport, User
from schemas.analysis import SaveReportRequest, SavedReportSummary
from routers.auth import get_optional_user
from datetime import datetime
from typing import Optional

router = APIRouter()


@router.post("/api/reports")
async def save_report(
    request: SaveReportRequest, 
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    report = SavedReport(
        title=request.title,
        repo_url=request.repo_url,
        topic=request.topic,
        report_data=json.dumps(request.report_data),
        user_id=current_user.id if current_user else None,
        created_at=datetime.utcnow(),
    )
    db.add(report)
    await db.flush()
    return {"id": report.id, "message": "Report saved successfully"}


@router.get("/api/reports")
async def list_reports(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    if current_user:
        stmt = select(SavedReport).where(SavedReport.user_id == current_user.id).order_by(SavedReport.created_at.desc()).limit(20)
    else:
        stmt = select(SavedReport).where(SavedReport.user_id == None).order_by(SavedReport.created_at.desc()).limit(20)
        
    result = await db.execute(stmt)
    reports = result.scalars().all()
    return [
        {
            "id": r.id,
            "title": r.title,
            "repo_url": r.repo_url,
            "topic": r.topic,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in reports
    ]


@router.get("/api/reports/{report_id}")
async def get_report(
    report_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    if current_user:
        stmt = select(SavedReport).where((SavedReport.id == report_id) & (SavedReport.user_id == current_user.id))
    else:
        stmt = select(SavedReport).where((SavedReport.id == report_id) & (SavedReport.user_id == None))
        
    result = await db.execute(stmt)
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return {
        "id": report.id,
        "title": report.title,
        "repo_url": report.repo_url,
        "topic": report.topic,
        "report_data": json.loads(report.report_data),
        "created_at": report.created_at.isoformat() if report.created_at else None,
    }


@router.delete("/api/reports/{report_id}")
async def delete_report(
    report_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    if current_user:
        stmt = select(SavedReport).where((SavedReport.id == report_id) & (SavedReport.user_id == current_user.id))
    else:
        stmt = select(SavedReport).where((SavedReport.id == report_id) & (SavedReport.user_id == None))
        
    result = await db.execute(stmt)
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    await db.delete(report)
    return {"message": "Report deleted"}
