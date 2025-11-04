"""Pydantic schemas for authentication."""
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from datetime import datetime


class UserRegisterRequest(BaseModel):
    """Request schema for user registration."""

    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=8, description="User password (min 8 characters)")
    name: Optional[str] = Field(None, max_length=255, description="User display name")

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        """Validate password strength."""
        from app.utils.auth import validate_password_strength

        is_valid, error_msg = validate_password_strength(v)
        if not is_valid:
            raise ValueError(error_msg)
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "password": "SecurePass123",
                "name": "John Doe"
            }
        }


class UserLoginRequest(BaseModel):
    """Request schema for user login."""

    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., description="User password")

    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "password": "SecurePass123"
            }
        }


class TokenResponse(BaseModel):
    """Response schema for authentication tokens."""

    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="JWT refresh token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(..., description="Token expiration time in seconds")

    class Config:
        json_schema_extra = {
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer",
                "expires_in": 604800
            }
        }


class RefreshTokenRequest(BaseModel):
    """Request schema for token refresh."""

    refresh_token: str = Field(..., description="JWT refresh token")

    class Config:
        json_schema_extra = {
            "example": {
                "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            }
        }


class UserProfileResponse(BaseModel):
    """Response schema for user profile."""

    id: str = Field(..., description="User ID (UUID)")
    email: str = Field(..., description="User email address")
    name: Optional[str] = Field(None, description="User display name")
    email_verified: bool = Field(..., description="Whether email is verified")
    plan: str = Field(..., description="Subscription plan")
    conversions_used: int = Field(..., description="Conversions used this month")
    conversions_limit: int = Field(..., description="Monthly conversion limit")
    subscription_status: Optional[str] = Field(None, description="Subscription status")
    created_at: datetime = Field(..., description="Account creation date")
    last_login: Optional[datetime] = Field(None, description="Last login timestamp")

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "email": "user@example.com",
                "name": "John Doe",
                "email_verified": True,
                "plan": "free",
                "conversions_used": 2,
                "conversions_limit": 3,
                "subscription_status": None,
                "created_at": "2025-10-30T10:00:00Z",
                "last_login": "2025-10-30T12:00:00Z"
            }
        }


class UserResponse(BaseModel):
    """Response schema for user after registration."""

    id: str
    email: str
    name: Optional[str]
    plan: str
    created_at: datetime

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "email": "user@example.com",
                "name": "John Doe",
                "plan": "free",
                "created_at": "2025-10-30T10:00:00Z"
            }
        }


class ResendVerificationRequest(BaseModel):
    """Request schema for resending verification email."""

    email: EmailStr = Field(..., description="User email address")

    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com"
            }
        }


class ForgotPasswordRequest(BaseModel):
    """Request schema for forgot password."""

    email: EmailStr = Field(..., description="User email address")

    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com"
            }
        }


class ResetPasswordRequest(BaseModel):
    """Request schema for resetting password."""

    token: str = Field(..., description="Password reset token")
    new_password: str = Field(..., min_length=8, description="New password (min 8 characters)")

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        """Validate password strength."""
        from app.utils.auth import validate_password_strength

        is_valid, error_msg = validate_password_strength(v)
        if not is_valid:
            raise ValueError(error_msg)
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "token": "abc123...",
                "new_password": "NewSecurePass123"
            }
        }
