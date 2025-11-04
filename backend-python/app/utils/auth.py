"""Authentication utilities for JWT and password hashing."""
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from passlib.context import CryptContext
from jose import JWTError, jwt

from app.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

# Password hashing context
# Configure bcrypt to truncate passwords to 72 bytes automatically
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__truncate_error=False  # Automatically truncate instead of raising error
)

# JWT settings
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days
REFRESH_TOKEN_EXPIRE_DAYS = 30  # 30 days


def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt.

    Args:
        password: Plain text password

    Returns:
        Hashed password string

    Note:
        Bcrypt automatically truncates passwords to 72 bytes.
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against its hash.

    Args:
        plain_password: Plain text password
        hashed_password: Hashed password to verify against

    Returns:
        True if password matches, False otherwise

    Note:
        Bcrypt automatically truncates passwords to 72 bytes.
    """
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception as e:
        logger.error("password_verification_error", error=str(e))
        return False


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token.

    Args:
        data: Payload data to encode in token
        expires_delta: Optional custom expiration time

    Returns:
        Encoded JWT token string
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire, "type": "access"})

    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=ALGORITHM)

    logger.info(
        "access_token_created",
        user_id=data.get("sub"),
        expires_at=expire.isoformat()
    )

    return encoded_jwt


def create_refresh_token(data: Dict[str, Any]) -> str:
    """
    Create a JWT refresh token.

    Args:
        data: Payload data to encode in token

    Returns:
        Encoded JWT refresh token string
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

    to_encode.update({"exp": expire, "type": "refresh"})

    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=ALGORITHM)

    logger.info(
        "refresh_token_created",
        user_id=data.get("sub"),
        expires_at=expire.isoformat()
    )

    return encoded_jwt


def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Decode and verify a JWT token.

    Args:
        token: JWT token string to decode

    Returns:
        Decoded token payload or None if invalid
    """
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[ALGORITHM])
        return payload
    except JWTError as e:
        logger.warning("token_decode_error", error=str(e))
        return None
    except Exception as e:
        logger.error("token_decode_unexpected_error", error=str(e))
        return None


def verify_access_token(token: str) -> Optional[str]:
    """
    Verify an access token and extract user ID.

    Args:
        token: JWT access token

    Returns:
        User ID (sub claim) if valid, None otherwise
    """
    payload = decode_token(token)

    if not payload:
        return None

    # Check token type
    if payload.get("type") != "access":
        logger.warning("invalid_token_type", type=payload.get("type"))
        return None

    # Extract user ID
    user_id: str = payload.get("sub")
    if not user_id:
        logger.warning("token_missing_subject")
        return None

    return user_id


def verify_refresh_token(token: str) -> Optional[str]:
    """
    Verify a refresh token and extract user ID.

    Args:
        token: JWT refresh token

    Returns:
        User ID (sub claim) if valid, None otherwise
    """
    payload = decode_token(token)

    if not payload:
        return None

    # Check token type
    if payload.get("type") != "refresh":
        logger.warning("invalid_token_type", type=payload.get("type"))
        return None

    # Extract user ID
    user_id: str = payload.get("sub")
    if not user_id:
        logger.warning("token_missing_subject")
        return None

    return user_id


def validate_password_strength(password: str) -> tuple[bool, Optional[str]]:
    """
    Validate password meets minimum strength requirements.

    Requirements:
    - At least 8 characters
    - Contains at least one uppercase letter
    - Contains at least one lowercase letter
    - Contains at least one digit

    Args:
        password: Password to validate

    Returns:
        Tuple of (is_valid, error_message)
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"

    if not any(c.isupper() for c in password):
        return False, "Password must contain at least one uppercase letter"

    if not any(c.islower() for c in password):
        return False, "Password must contain at least one lowercase letter"

    if not any(c.isdigit() for c in password):
        return False, "Password must contain at least one digit"

    return True, None
