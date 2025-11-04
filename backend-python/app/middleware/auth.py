"""Authentication middleware and dependencies."""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional

from app.models import User
from app.database import AsyncSessionLocal
from app.utils.auth import verify_access_token
from app.utils.logger import get_logger

logger = get_logger(__name__)

# HTTP Bearer token scheme
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> User:
    """
    Dependency to get current authenticated user from JWT token.

    Extracts and validates JWT token from Authorization header,
    then retrieves user from database.

    Args:
        credentials: HTTP Bearer credentials from request header

    Returns:
        User object if authentication successful

    Raises:
        HTTPException 401: If token is invalid or user not found
    """
    # Extract token
    token = credentials.credentials

    # Verify token and get user ID
    user_id = verify_access_token(token)

    if not user_id:
        logger.warning("authentication_failed_invalid_token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Get user from database
    async with AsyncSessionLocal() as session:
        user = await session.get(User, user_id)

        if not user:
            logger.warning("authentication_failed_user_not_found", user_id=user_id)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )

        logger.info("user_authenticated", user_id=user.id, email=user.email)
        return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Dependency to get current active user.

    Ensures user account is active (not disabled).

    Args:
        current_user: Current user from get_current_user dependency

    Returns:
        User object if active

    Raises:
        HTTPException 403: If user account is inactive
    """
    # Note: User model doesn't have is_active field yet
    # This is a placeholder for future enhancement
    # For now, just return the user
    return current_user


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
) -> Optional[User]:
    """
    Dependency to get current user if authenticated, None otherwise.

    Useful for endpoints that work differently for authenticated vs anonymous users.

    Args:
        credentials: Optional HTTP Bearer credentials

    Returns:
        User object if authenticated, None otherwise
    """
    if not credentials:
        return None

    try:
        # Extract token
        token = credentials.credentials

        # Verify token and get user ID
        user_id = verify_access_token(token)

        if not user_id:
            return None

        # Get user from database
        async with AsyncSessionLocal() as session:
            user = await session.get(User, user_id)
            return user

    except Exception as e:
        logger.warning("optional_auth_failed", error=str(e))
        return None


def require_plan(minimum_plan: str):
    """
    Dependency factory to require minimum subscription plan.

    Args:
        minimum_plan: Minimum required plan (free, starter, pro, enterprise)

    Returns:
        Dependency function that checks user's plan

    Example:
        @router.get("/premium-feature")
        async def premium_feature(user: User = Depends(require_plan("pro"))):
            ...
    """
    plan_hierarchy = {
        "free": 0,
        "starter": 1,
        "pro": 2,
        "enterprise": 3
    }

    async def plan_checker(current_user: User = Depends(get_current_user)) -> User:
        """Check if user has required plan level."""
        user_plan_level = plan_hierarchy.get(current_user.plan.value, 0)
        required_plan_level = plan_hierarchy.get(minimum_plan, 0)

        if user_plan_level < required_plan_level:
            logger.warning(
                "insufficient_plan",
                user_id=current_user.id,
                user_plan=current_user.plan.value,
                required_plan=minimum_plan
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This feature requires {minimum_plan} plan or higher"
            )

        return current_user

    return plan_checker


async def check_conversion_quota(current_user: User = Depends(get_current_user)) -> User:
    """
    Dependency to check if user has conversion quota available.

    Args:
        current_user: Current authenticated user

    Returns:
        User object if quota available

    Raises:
        HTTPException 429: If conversion quota exceeded
    """
    if not current_user.can_convert():
        logger.warning(
            "conversion_quota_exceeded",
            user_id=current_user.id,
            conversions_used=current_user.conversions_used,
            conversions_limit=current_user.conversions_limit
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Conversion quota exceeded. Used {current_user.conversions_used}/{current_user.conversions_limit}. Upgrade your plan for more conversions."
        )

    return current_user
