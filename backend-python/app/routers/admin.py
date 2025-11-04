"""Admin API routes for user management."""
from fastapi import APIRouter, HTTPException, status, Depends, Request
from sqlalchemy import select, func
from datetime import datetime
from typing import List, Optional

from app.schemas.auth import UserResponse
from app.models import User, UserPlan, SubscriptionStatus
from app.database import AsyncSessionLocal
from app.middleware.auth import get_current_user
from app.utils.auth import hash_password
from app.utils.logger import get_logger
from pydantic import BaseModel, EmailStr, Field

logger = get_logger(__name__)

router = APIRouter()

# Get limiter from main app
from app.main import limiter


# ============================================================================
# SCHEMAS
# ============================================================================

class AdminUserCreateRequest(BaseModel):
    """Request to create a new user."""
    email: EmailStr
    password: str = Field(..., min_length=8)
    name: str
    plan: UserPlan = UserPlan.FREE
    email_verified: bool = False


class AdminUserUpdateRequest(BaseModel):
    """Request to update user details."""
    name: Optional[str] = None
    plan: Optional[UserPlan] = None
    email_verified: Optional[bool] = None
    conversions_used: Optional[int] = None
    conversions_limit: Optional[int] = None


class AdminUserResponse(BaseModel):
    """Admin user response with full details."""
    id: str
    email: str
    name: Optional[str]
    email_verified: bool
    plan: str
    conversions_used: int
    conversions_limit: int
    subscription_id: Optional[str]
    subscription_status: Optional[str]
    subscription_end_date: Optional[str]
    created_at: str
    last_login: Optional[str]


class AdminStatsResponse(BaseModel):
    """Admin dashboard statistics."""
    total_users: int
    verified_users: int
    unverified_users: int
    free_users: int
    paid_users: int
    total_conversions: int


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.get("/stats", response_model=AdminStatsResponse)
@limiter.limit("10/minute")
async def get_admin_stats(request: Request):
    """
    Get admin dashboard statistics.

    Returns overview of user counts and conversions.
    """
    async with AsyncSessionLocal() as session:
        # Total users
        result = await session.execute(select(func.count(User.id)))
        total_users = result.scalar() or 0

        # Verified users
        result = await session.execute(
            select(func.count(User.id)).where(User.email_verified == True)
        )
        verified_users = result.scalar() or 0

        # Free users
        result = await session.execute(
            select(func.count(User.id)).where(User.plan == UserPlan.FREE)
        )
        free_users = result.scalar() or 0

        # Total conversions
        result = await session.execute(select(func.sum(User.conversions_used)))
        total_conversions = result.scalar() or 0

        return AdminStatsResponse(
            total_users=total_users,
            verified_users=verified_users,
            unverified_users=total_users - verified_users,
            free_users=free_users,
            paid_users=total_users - free_users,
            total_conversions=total_conversions
        )


@router.get("/users", response_model=List[AdminUserResponse])
@limiter.limit("20/minute")
async def list_all_users(
    request: Request,
    skip: int = 0,
    limit: int = 100,
    plan: Optional[str] = None,
    verified: Optional[bool] = None
):
    """
    List all users with optional filtering.

    Query Parameters:
    - skip: Number of records to skip (pagination)
    - limit: Maximum number of records to return
    - plan: Filter by plan (free, starter, pro, enterprise)
    - verified: Filter by email verification status
    """
    async with AsyncSessionLocal() as session:
        query = select(User).offset(skip).limit(limit)

        # Apply filters
        if plan:
            try:
                plan_enum = UserPlan(plan.lower())
                query = query.where(User.plan == plan_enum)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid plan: {plan}"
                )

        if verified is not None:
            query = query.where(User.email_verified == verified)

        # Order by created date (newest first)
        query = query.order_by(User.created_at.desc())

        result = await session.execute(query)
        users = result.scalars().all()

        return [
            AdminUserResponse(
                id=user.id,
                email=user.email,
                name=user.name,
                email_verified=user.email_verified,
                plan=user.plan.value,
                conversions_used=user.conversions_used,
                conversions_limit=user.conversions_limit,
                subscription_id=user.subscription_id,
                subscription_status=user.subscription_status.value if user.subscription_status else None,
                subscription_end_date=user.subscription_end_date.isoformat() if user.subscription_end_date else None,
                created_at=user.created_at.isoformat() if user.created_at else None,
                last_login=user.last_login.isoformat() if user.last_login else None
            )
            for user in users
        ]


@router.get("/users/{user_id}", response_model=AdminUserResponse)
@limiter.limit("30/minute")
async def get_user_details(request: Request, user_id: str):
    """Get detailed information about a specific user."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        return AdminUserResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            email_verified=user.email_verified,
            plan=user.plan.value,
            conversions_used=user.conversions_used,
            conversions_limit=user.conversions_limit,
            subscription_id=user.subscription_id,
            subscription_status=user.subscription_status.value if user.subscription_status else None,
            subscription_end_date=user.subscription_end_date.isoformat() if user.subscription_end_date else None,
            created_at=user.created_at.isoformat() if user.created_at else None,
            last_login=user.last_login.isoformat() if user.last_login else None
        )


@router.post("/users", response_model=AdminUserResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def create_user(request: Request, user_data: AdminUserCreateRequest):
    """
    Create a new user (admin only).

    Allows admins to create users with custom settings.
    """
    async with AsyncSessionLocal() as session:
        # Check if user already exists
        result = await session.execute(select(User).where(User.email == user_data.email))
        existing_user = result.scalar_one_or_none()

        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists"
            )

        # Hash password
        password_hash = hash_password(user_data.password)

        # Set conversion limits based on plan
        limits = {
            UserPlan.FREE: 3,
            UserPlan.STARTER: 100,
            UserPlan.PRO: 999999,
            UserPlan.ENTERPRISE: 999999
        }

        # Create new user
        new_user = User(
            email=user_data.email,
            password_hash=password_hash,
            name=user_data.name,
            plan=user_data.plan,
            email_verified=user_data.email_verified,
            conversions_used=0,
            conversions_limit=limits[user_data.plan]
        )

        # Generate verification token if not verified
        if not user_data.email_verified:
            new_user.generate_verification_token()

        session.add(new_user)
        await session.commit()
        await session.refresh(new_user)

        logger.info("admin_user_created", user_id=new_user.id, email=new_user.email)

        return AdminUserResponse(
            id=new_user.id,
            email=new_user.email,
            name=new_user.name,
            email_verified=new_user.email_verified,
            plan=new_user.plan.value,
            conversions_used=new_user.conversions_used,
            conversions_limit=new_user.conversions_limit,
            subscription_id=new_user.subscription_id,
            subscription_status=new_user.subscription_status.value if new_user.subscription_status else None,
            subscription_end_date=new_user.subscription_end_date.isoformat() if new_user.subscription_end_date else None,
            created_at=new_user.created_at.isoformat() if new_user.created_at else None,
            last_login=new_user.last_login.isoformat() if new_user.last_login else None
        )


@router.put("/users/{user_id}", response_model=AdminUserResponse)
@limiter.limit("10/minute")
async def update_user(request: Request, user_id: str, user_data: AdminUserUpdateRequest):
    """
    Update user details (admin only).

    Allows admins to modify user settings.
    """
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        # Update fields if provided
        if user_data.name is not None:
            user.name = user_data.name

        if user_data.plan is not None:
            old_plan = user.plan
            user.plan = user_data.plan

            # Update conversion limits based on new plan
            limits = {
                UserPlan.FREE: 3,
                UserPlan.STARTER: 100,
                UserPlan.PRO: 999999,
                UserPlan.ENTERPRISE: 999999
            }
            user.conversions_limit = limits[user_data.plan]

            # Cap usage if exceeds new limit
            if user.conversions_used > user.conversions_limit:
                user.conversions_used = user.conversions_limit

            logger.info("admin_plan_changed", user_id=user.id, old_plan=old_plan.value, new_plan=user_data.plan.value)

        if user_data.email_verified is not None:
            user.email_verified = user_data.email_verified
            if user_data.email_verified:
                user.verification_token = None
                user.verification_token_expires = None

        if user_data.conversions_used is not None:
            user.conversions_used = user_data.conversions_used

        if user_data.conversions_limit is not None:
            user.conversions_limit = user_data.conversions_limit

        user.updated_at = datetime.utcnow()

        await session.commit()
        await session.refresh(user)

        return AdminUserResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            email_verified=user.email_verified,
            plan=user.plan.value,
            conversions_used=user.conversions_used,
            conversions_limit=user.conversions_limit,
            subscription_id=user.subscription_id,
            subscription_status=user.subscription_status.value if user.subscription_status else None,
            subscription_end_date=user.subscription_end_date.isoformat() if user.subscription_end_date else None,
            created_at=user.created_at.isoformat() if user.created_at else None,
            last_login=user.last_login.isoformat() if user.last_login else None
        )


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("5/minute")
async def delete_user(request: Request, user_id: str):
    """
    Delete a user (admin only).

    Permanently removes user from the system.
    """
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        logger.warning("admin_user_deleted", user_id=user.id, email=user.email)

        await session.delete(user)
        await session.commit()


@router.post("/users/{user_id}/reset-quota", response_model=AdminUserResponse)
@limiter.limit("10/minute")
async def reset_user_quota(request: Request, user_id: str):
    """
    Reset user's monthly conversion quota to zero.
    """
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        old_usage = user.conversions_used
        user.conversions_used = 0
        user.updated_at = datetime.utcnow()

        await session.commit()
        await session.refresh(user)

        logger.info("admin_quota_reset", user_id=user.id, old_usage=old_usage)

        return AdminUserResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            email_verified=user.email_verified,
            plan=user.plan.value,
            conversions_used=user.conversions_used,
            conversions_limit=user.conversions_limit,
            subscription_id=user.subscription_id,
            subscription_status=user.subscription_status.value if user.subscription_status else None,
            subscription_end_date=user.subscription_end_date.isoformat() if user.subscription_end_date else None,
            created_at=user.created_at.isoformat() if user.created_at else None,
            last_login=user.last_login.isoformat() if user.last_login else None
        )
