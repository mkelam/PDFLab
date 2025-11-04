"""Authentication API routes."""
from fastapi import APIRouter, HTTPException, status, Depends, Request
from sqlalchemy import select
from datetime import datetime, timedelta

from app.schemas.auth import (
    UserRegisterRequest,
    UserLoginRequest,
    TokenResponse,
    RefreshTokenRequest,
    UserProfileResponse,
    UserResponse,
    ResendVerificationRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest
)
from app.models import User, UserPlan, RefreshToken
from app.database import AsyncSessionLocal
from app.middleware.auth import get_current_user
from app.utils.auth import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    verify_refresh_token,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from app.utils.logger import get_logger
from app.services.email_service import send_verification_email, send_password_reset_email

logger = get_logger(__name__)

router = APIRouter()

# Get limiter from main app
from app.main import limiter


@router.get("/")
async def auth_root():
    """
    Authentication API information endpoint.

    Lists all available authentication endpoints and their purposes.
    """
    return {
        "message": "PDFLab Authentication API",
        "version": "2.0.1",
        "endpoints": {
            "POST /api/auth/register": "Register a new user account",
            "GET /api/auth/verify-email": "Verify email address with token",
            "POST /api/auth/resend-verification": "Resend verification email",
            "POST /api/auth/login": "Login and receive JWT tokens",
            "POST /api/auth/refresh": "Refresh access token (with rotation)",
            "GET /api/auth/profile": "Get current user profile (protected)",
            "POST /api/auth/forgot-password": "Request password reset email",
            "POST /api/auth/reset-password": "Reset password with token"
        },
        "documentation": {
            "swagger": "/docs",
            "redoc": "/redoc",
            "detailed_guide": "/backend-python/API_ENDPOINTS.md"
        },
        "security_features": [
            "Email verification required",
            "Refresh token rotation",
            "Replay attack detection",
            "Rate limiting on all endpoints",
            "Password strength validation",
            "Token family tracking"
        ]
    }


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register(request: Request, user_data: UserRegisterRequest):
    """
    Register a new user account.

    Creates a new user with the provided email and password.
    Email must be unique. Password must meet strength requirements.

    Args:
        user_data: User registration data (email, password, name)

    Returns:
        Created user information (without sensitive data)

    Raises:
        HTTPException 400: If email already exists
        HTTPException 500: If registration fails
    """
    try:
        async with AsyncSessionLocal() as session:
            # Check if user already exists
            result = await session.execute(
                select(User).where(User.email == user_data.email)
            )
            existing_user = result.scalars().first()

            if existing_user:
                logger.warning("registration_failed_email_exists", email=user_data.email)
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered"
                )

            # Hash password
            hashed_password = hash_password(user_data.password)

            # Create new user
            new_user = User(
                email=user_data.email,
                password_hash=hashed_password,
                name=user_data.name,
                plan=UserPlan.FREE,  # Free plan
                conversions_used=0,
                conversions_limit=3,  # Free plan limit
            )

            # Generate verification token
            verification_token = new_user.generate_verification_token()

            session.add(new_user)
            await session.commit()
            await session.refresh(new_user)

            # Send verification email (async, don't wait for it)
            try:
                email_sent = await send_verification_email(
                    to_email=new_user.email,
                    user_name=new_user.name or new_user.email.split('@')[0],
                    verification_token=verification_token
                )
                if not email_sent:
                    logger.warning(
                        "verification_email_failed",
                        user_id=new_user.id,
                        email=new_user.email
                    )
            except Exception as email_error:
                logger.error(
                    "verification_email_error",
                    user_id=new_user.id,
                    error=str(email_error)
                )
                # Don't fail registration if email fails

            logger.info(
                "user_registered",
                user_id=new_user.id,
                email=new_user.email,
                plan=new_user.plan.value
            )

            return UserResponse(
                id=new_user.id,
                email=new_user.email,
                name=new_user.name,
                plan=new_user.plan.value,
                created_at=new_user.created_at
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("registration_error", error=str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to register user"
        )


@router.get("/verify-email")
async def verify_email(token: str):
    """
    Verify user email address using verification token.

    Args:
        token: Email verification token from verification link

    Returns:
        Success message

    Raises:
        HTTPException 400: If token is invalid or expired
        HTTPException 404: If user not found
        HTTPException 500: If verification fails
    """
    try:
        async with AsyncSessionLocal() as session:
            # Find user by verification token
            result = await session.execute(
                select(User).where(User.verification_token == token)
            )
            user = result.scalars().first()

            if not user:
                logger.warning("verification_failed_invalid_token", token=token[:10] + "...")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid verification token"
                )

            # Check if token is expired
            if not user.is_verification_token_valid():
                logger.warning(
                    "verification_failed_expired_token",
                    user_id=user.id,
                    email=user.email
                )
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Verification token has expired. Please request a new verification email."
                )

            # Check if already verified
            if user.email_verified:
                logger.info("email_already_verified", user_id=user.id, email=user.email)
                return {
                    "message": "Email is already verified",
                    "email": user.email
                }

            # Verify email
            user.verify_email()
            await session.commit()

            logger.info("email_verified", user_id=user.id, email=user.email)

            return {
                "message": "Email verified successfully. You can now log in.",
                "email": user.email
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("verification_error", error=str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to verify email"
        )


@router.post("/resend-verification")
@limiter.limit("3/minute")
async def resend_verification(request: Request, req_data: ResendVerificationRequest):
    """
    Resend verification email to user.

    Args:
        email: User email address

    Returns:
        Success message

    Raises:
        HTTPException 404: If user not found
        HTTPException 400: If email already verified
        HTTPException 500: If email sending fails
    """
    try:
        async with AsyncSessionLocal() as session:
            # Find user by email
            result = await session.execute(
                select(User).where(User.email == req_data.email)
            )
            user = result.scalars().first()

            if not user:
                logger.warning("resend_verification_user_not_found", email=req_data.email)
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )

            # Check if already verified
            if user.email_verified:
                logger.info("resend_verification_already_verified", user_id=user.id, email=user.email)
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email is already verified"
                )

            # Generate new verification token
            verification_token = user.generate_verification_token()
            await session.commit()

            # Send verification email
            try:
                email_sent = await send_verification_email(
                    to_email=user.email,
                    user_name=user.name or user.email.split('@')[0],
                    verification_token=verification_token
                )
                if not email_sent:
                    logger.error("resend_verification_email_failed", user_id=user.id, email=user.email)
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Failed to send verification email"
                    )
            except Exception as email_error:
                logger.error("resend_verification_email_error", user_id=user.id, error=str(email_error))
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to send verification email"
                )

            logger.info("verification_email_resent", user_id=user.id, email=user.email)

            return {
                "message": "Verification email resent successfully. Please check your inbox.",
                "email": user.email
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("resend_verification_error", error=str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to resend verification email"
        )


@router.post("/forgot-password")
@limiter.limit("3/minute")
async def forgot_password(request: Request, req_data: ForgotPasswordRequest):
    """
    Request password reset email.

    Args:
        request: User email address

    Returns:
        Success message

    Raises:
        HTTPException 404: If user not found
        HTTPException 500: If email sending fails
    """
    try:
        async with AsyncSessionLocal() as session:
            # Find user by email
            result = await session.execute(
                select(User).where(User.email == req_data.email)
            )
            user = result.scalars().first()

            # Always return success to prevent email enumeration
            if not user:
                logger.warning("forgot_password_user_not_found", email=req_data.email)
                return {
                    "message": "If an account exists with this email, a password reset link has been sent."
                }

            # Generate password reset token
            reset_token = user.generate_password_reset_token()
            await session.commit()

            # Send password reset email
            try:
                email_sent = await send_password_reset_email(
                    to_email=user.email,
                    user_name=user.name or user.email.split('@')[0],
                    reset_token=reset_token
                )
                if not email_sent:
                    logger.error("password_reset_email_failed", user_id=user.id, email=user.email)
            except Exception as email_error:
                logger.error("password_reset_email_error", user_id=user.id, error=str(email_error))

            logger.info("password_reset_requested", user_id=user.id, email=user.email)

            return {
                "message": "If an account exists with this email, a password reset link has been sent."
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("forgot_password_error", error=str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process password reset request"
        )


@router.post("/reset-password")
@limiter.limit("5/minute")
async def reset_password(request: Request, req_data: ResetPasswordRequest):
    """
    Reset password using reset token.

    Args:
        request: Reset token and new password

    Returns:
        Success message

    Raises:
        HTTPException 400: If token is invalid or expired
        HTTPException 500: If password reset fails
    """
    try:
        async with AsyncSessionLocal() as session:
            # Find user by reset token
            result = await session.execute(
                select(User).where(User.password_reset_token == req_data.token)
            )
            user = result.scalars().first()

            if not user:
                logger.warning("reset_password_invalid_token", token=req_data.token[:10] + "...")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid or expired password reset token"
                )

            # Check if token is expired
            if not user.is_password_reset_token_valid():
                logger.warning("reset_password_expired_token", user_id=user.id, email=user.email)
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Password reset token has expired. Please request a new one."
                )

            # Hash new password and clear reset token
            user.password_hash = hash_password(req_data.new_password)
            user.password_reset_token = None
            user.password_reset_token_expires = None
            user.updated_at = datetime.utcnow()

            await session.commit()

            logger.info("password_reset_successful", user_id=user.id, email=user.email)

            return {
                "message": "Password reset successfully. You can now log in with your new password."
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("reset_password_error", error=str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reset password"
        )


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(request: Request, credentials: UserLoginRequest):
    """
    Authenticate user and return JWT tokens.

    Validates email and password, then returns access and refresh tokens.

    Args:
        credentials: User login credentials (email, password)

    Returns:
        JWT access and refresh tokens

    Raises:
        HTTPException 401: If credentials are invalid
        HTTPException 500: If login fails
    """
    try:
        async with AsyncSessionLocal() as session:
            # Find user by email
            result = await session.execute(
                select(User).where(User.email == credentials.email)
            )
            user = result.scalars().first()

            # Verify user exists and password is correct
            if not user or not verify_password(credentials.password, user.password_hash):
                logger.warning("login_failed_invalid_credentials", email=credentials.email)
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Incorrect email or password",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            # Check if email is verified
            if not user.email_verified:
                logger.warning("login_failed_email_not_verified", user_id=user.id, email=user.email)
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Please verify your email address before logging in. Check your inbox for the verification link."
                )

            # Update last login
            user.last_login = datetime.utcnow()
            await session.commit()

            # Create tokens
            token_data = {"sub": user.id, "email": user.email}
            access_token = create_access_token(token_data)
            refresh_token_str = create_refresh_token(token_data)

            # Store refresh token in database for rotation tracking
            refresh_token_record = RefreshToken.create_new_token(
                user_id=user.id,
                ip_address=request.client.host if hasattr(request, 'client') else None,
                user_agent=request.headers.get('user-agent')
            )
            refresh_token_record.token_hash = RefreshToken.create_token_hash(refresh_token_str)
            session.add(refresh_token_record)
            await session.commit()

            logger.info(
                "user_logged_in",
                user_id=user.id,
                email=user.email,
                token_family_id=refresh_token_record.family_id
            )

            return TokenResponse(
                access_token=access_token,
                refresh_token=refresh_token_str,
                token_type="bearer",
                expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60  # Convert to seconds
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("login_error", error=str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to authenticate user"
        )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(request: Request, token_request: RefreshTokenRequest):
    """
    Refresh access token using refresh token with automatic token rotation.

    Implements refresh token rotation for enhanced security:
    - Validates refresh token exists in database and is not revoked
    - Revokes the old refresh token immediately
    - Issues new access and refresh tokens (in same family)
    - Detects replay attacks (reuse of already-used tokens)

    Args:
        request: FastAPI request object (for IP/user-agent tracking)
        token_request: Refresh token

    Returns:
        New JWT access and refresh tokens

    Raises:
        HTTPException 401: If refresh token is invalid, expired, revoked, or reused
        HTTPException 404: If user not found
        HTTPException 500: If token refresh fails
    """
    try:
        # Verify refresh token JWT
        user_id = verify_refresh_token(token_request.refresh_token)

        if not user_id:
            logger.warning("token_refresh_invalid_jwt")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Hash the token to lookup in database
        token_hash = RefreshToken.create_token_hash(token_request.refresh_token)

        # Get user and token from database
        async with AsyncSessionLocal() as session:
            # Find the refresh token record
            result = await session.execute(
                select(RefreshToken).where(
                    RefreshToken.token_hash == token_hash
                )
            )
            stored_token = result.scalars().first()

            # SECURITY: Token not found = token was never issued or already deleted
            if not stored_token:
                logger.warning(
                    "token_refresh_not_found",
                    user_id=user_id,
                    token_hash_prefix=token_hash[:10]
                )
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid refresh token",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            # SECURITY: Check if token was already used (replay attack detection)
            if stored_token.used_at is not None:
                logger.error(
                    "token_reuse_detected",
                    user_id=stored_token.user_id,
                    family_id=stored_token.family_id,
                    token_id=stored_token.id
                )

                # CRITICAL: Revoke entire token family (possible token theft)
                result_family = await session.execute(
                    select(RefreshToken).where(
                        RefreshToken.family_id == stored_token.family_id,
                        RefreshToken.is_revoked == False
                    )
                )
                family_tokens = result_family.scalars().all()

                for token in family_tokens:
                    token.revoke()
                    logger.warning(
                        "token_family_revoked",
                        token_id=token.id,
                        family_id=token.family_id
                    )

                await session.commit()

                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token reuse detected. All sessions have been revoked for security. Please log in again.",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            # SECURITY: Check if token is revoked
            if stored_token.is_revoked:
                logger.warning(
                    "token_refresh_revoked",
                    user_id=stored_token.user_id,
                    token_id=stored_token.id
                )
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Refresh token has been revoked",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            # SECURITY: Check if token is valid (not expired)
            if not stored_token.is_valid():
                logger.warning(
                    "token_refresh_expired",
                    user_id=stored_token.user_id,
                    token_id=stored_token.id,
                    expires_at=stored_token.expires_at.isoformat()
                )
                # Revoke expired token
                stored_token.revoke()
                await session.commit()

                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Refresh token has expired",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            # Get user from database
            user = await session.get(User, stored_token.user_id)

            if not user:
                logger.error("token_refresh_user_not_found", user_id=stored_token.user_id)
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )

            # Mark old token as used (for replay detection)
            stored_token.mark_as_used()

            # Revoke old token (rotation step 1: invalidate old token)
            stored_token.revoke()

            # Create new tokens (rotation step 2: issue new tokens)
            token_data = {"sub": user.id, "email": user.email}
            access_token = create_access_token(token_data)
            new_refresh_token_str = create_refresh_token(token_data)

            # Store new refresh token in same family (rotation step 3: track new token)
            new_refresh_token = RefreshToken.create_new_token(
                user_id=user.id,
                family_id=stored_token.family_id,  # Same family for rotation chain
                ip_address=request.client.host if hasattr(request, 'client') else None,
                user_agent=request.headers.get('user-agent')
            )
            new_refresh_token.token_hash = RefreshToken.create_token_hash(new_refresh_token_str)
            session.add(new_refresh_token)

            await session.commit()

            logger.info(
                "token_refreshed",
                user_id=user.id,
                old_token_id=stored_token.id,
                new_token_id=new_refresh_token.id,
                family_id=stored_token.family_id
            )

            return TokenResponse(
                access_token=access_token,
                refresh_token=new_refresh_token_str,
                token_type="bearer",
                expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("token_refresh_error", error=str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to refresh token"
        )


@router.get("/profile", response_model=UserProfileResponse)
async def get_profile(current_user: User = Depends(get_current_user)):
    """
    Get current user profile.

    Returns detailed user information including subscription and usage stats.
    Requires authentication.

    Args:
        current_user: Current authenticated user (from JWT token)

    Returns:
        User profile information
    """
    try:
        return UserProfileResponse(
            id=current_user.id,
            email=current_user.email,
            name=current_user.name,
            email_verified=current_user.email_verified,
            plan=current_user.plan.value,
            conversions_used=current_user.conversions_used,
            conversions_limit=current_user.conversions_limit,
            subscription_status=current_user.subscription_status.value if current_user.subscription_status else None,
            created_at=current_user.created_at,
            last_login=current_user.last_login
        )

    except Exception as e:
        logger.error("get_profile_error", error=str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve profile"
        )
