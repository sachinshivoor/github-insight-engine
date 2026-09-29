import hashlib
import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.database import get_db, User, UserSession
from pydantic import BaseModel, Field
from typing import Optional

router = APIRouter()

# ─── Auth Schemas ─────────────────────────────────────────────────────────────

class UserRegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)

class UserLoginRequest(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    created_at: datetime

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    token: str
    user: UserResponse

# ─── Crypto Helpers ───────────────────────────────────────────────────────────

def hash_password(password: str, salt: Optional[str] = None) -> str:
    """Hash password using PBKDF2 HMAC SHA-256 (secure, built-in, no dependencies)."""
    if not salt:
        salt = secrets.token_hex(16)
    pwd_bytes = password.encode('utf-8')
    salt_bytes = salt.encode('utf-8')
    # Run 100,000 iterations of PBKDF2
    key = hashlib.pbkdf2_hmac('sha256', pwd_bytes, salt_bytes, 100000)
    # Store as salt:hash
    return f"{salt}:{key.hex()}"

def verify_password(password: str, stored_hash: str) -> bool:
    try:
        salt, _ = stored_hash.split(":")
        return hash_password(password, salt) == stored_hash
    except Exception:
        return False

# ─── Auth Dependency ──────────────────────────────────────────────────────────

async def get_current_user(
    authorization: Optional[str] = Header(None), 
    db: AsyncSession = Depends(get_db)
) -> User:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")
    
    try:
        # Expected format: Bearer <token>
        scheme, token = authorization.split(" ")
        if scheme.lower() != "bearer":
            raise ValueError()
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid authorization header format. Use 'Bearer <token>'")

    # Find valid session
    session_result = await db.execute(
        select(UserSession).where(UserSession.session_token == token)
    )
    session = session_result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(status_code=401, detail="Session expired or invalid")
    
    if session.expires_at < datetime.utcnow():
        await db.delete(session)
        raise HTTPException(status_code=401, detail="Session expired")
    
    # Get user
    user_result = await db.execute(
        select(User).where(User.id == session.user_id)
    )
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
        
    return user


async def get_optional_user(
    authorization: Optional[str] = Header(None), 
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    if not authorization:
        return None
    
    try:
        # Expected format: Bearer <token>
        parts = authorization.split(" ")
        if len(parts) != 2 or parts[0].lower() != "bearer":
            return None
        token = parts[1]
    except Exception:
        return None

    # Find valid session
    session_result = await db.execute(
        select(UserSession).where(UserSession.session_token == token)
    )
    session = session_result.scalar_one_or_none()
    
    if not session or session.expires_at < datetime.utcnow():
        return None
    
    # Get user
    user_result = await db.execute(
        select(User).where(User.id == session.user_id)
    )
    return user_result.scalar_one_or_none()

# ─── Auth Routes ──────────────────────────────────────────────────────────────

@router.post("/api/auth/register", response_model=UserResponse)
async def register(request: UserRegisterRequest, db: AsyncSession = Depends(get_db)):
    # Check if username exists
    existing_result = await db.execute(
        select(User).where(User.username == request.username)
    )
    if existing_result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username is already taken")
    
    # Create new user
    new_user = User(
        username=request.username,
        password_hash=hash_password(request.password),
        created_at=datetime.utcnow()
    )
    db.add(new_user)
    await db.flush()  # Populates new_user.id
    
    return new_user

@router.post("/api/auth/login", response_model=TokenResponse)
async def login(request: UserLoginRequest, db: AsyncSession = Depends(get_db)):
    # Find user
    result = await db.execute(
        select(User).where(User.username == request.username)
    )
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    # Create session token (expires in 7 days)
    session_token = secrets.token_hex(32)
    session = UserSession(
        session_token=session_token,
        user_id=user.id,
        created_at=datetime.utcnow(),
        expires_at=datetime.utcnow() + timedelta(days=7)
    )
    db.add(session)
    await db.flush()
    
    return {
        "token": session_token,
        "user": user
    }

@router.get("/api/auth/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/api/auth/logout")
async def logout(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
):
    if authorization:
        try:
            _, token = authorization.split(" ")
            session_result = await db.execute(
                select(UserSession).where(UserSession.session_token == token)
            )
            session = session_result.scalar_one_or_none()
            if session:
                await db.delete(session)
        except Exception:
            pass
    return {"message": "Logged out successfully"}
