"""Refresh token database model for token rotation."""
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey
from sqlalchemy.dialects.mysql import CHAR
from datetime import datetime, timedelta
import uuid

from app.database import Base
from app.config import settings


class RefreshToken(Base):
    """
    Refresh token model for secure token rotation.

    Implements refresh token rotation by tracking all issued refresh tokens
    and invalidating them when used. This prevents token theft and replay attacks.

    Attributes:
        id: Unique token identifier (UUID)
        user_id: Associated user ID (FK to users.id)
        token_hash: SHA256 hash of the refresh token
        family_id: Token family ID for rotation chain tracking
        expires_at: When this token expires
        is_revoked: Whether token has been revoked
        revoked_at: When token was revoked
        created_at: When token was issued
        used_at: When token was used (for auditing)
    """

    __tablename__ = "refresh_tokens"

    # Primary Key
    id = Column(
        CHAR(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        comment="Unique token identifier"
    )

    # User relationship
    user_id = Column(
        CHAR(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Associated user ID"
    )

    # Token data
    token_hash = Column(
        String(64),  # SHA256 hash length
        nullable=False,
        unique=True,
        index=True,
        comment="SHA256 hash of the refresh token"
    )

    # Token family for rotation tracking
    family_id = Column(
        CHAR(36),
        nullable=False,
        index=True,
        comment="Token family ID for rotation chain"
    )

    # Token validity
    expires_at = Column(
        DateTime,
        nullable=False,
        index=True,
        comment="Token expiration timestamp"
    )

    # Revocation tracking
    is_revoked = Column(
        Boolean,
        nullable=False,
        default=False,
        index=True,
        comment="Whether token has been revoked"
    )

    revoked_at = Column(
        DateTime,
        nullable=True,
        comment="When token was revoked"
    )

    # Audit tracking
    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        comment="When token was issued"
    )

    used_at = Column(
        DateTime,
        nullable=True,
        comment="When token was used for refresh"
    )

    # IP and user agent for security auditing
    created_from_ip = Column(
        String(45),  # IPv6 max length
        nullable=True,
        comment="IP address where token was created"
    )

    user_agent = Column(
        String(255),
        nullable=True,
        comment="User agent of client that created token"
    )

    def __repr__(self) -> str:
        """String representation of RefreshToken."""
        return f"<RefreshToken(id={self.id}, user_id={self.user_id}, family_id={self.family_id}, is_revoked={self.is_revoked})>"

    # ========================================================================
    # HELPER METHODS
    # ========================================================================

    def is_valid(self) -> bool:
        """
        Check if token is valid (not expired, not revoked).

        Returns:
            True if token is valid, False otherwise
        """
        if self.is_revoked:
            return False

        if datetime.utcnow() > self.expires_at:
            return False

        return True

    def revoke(self) -> None:
        """Mark token as revoked."""
        self.is_revoked = True
        self.revoked_at = datetime.utcnow()

    def mark_as_used(self) -> None:
        """Mark token as used (for audit trail)."""
        self.used_at = datetime.utcnow()

    @staticmethod
    def create_token_hash(token: str) -> str:
        """
        Create SHA256 hash of token for storage.

        Args:
            token: Raw token string

        Returns:
            SHA256 hash of token
        """
        import hashlib
        return hashlib.sha256(token.encode()).hexdigest()

    @classmethod
    def create_new_token(
        cls,
        user_id: str,
        family_id: str = None,
        ip_address: str = None,
        user_agent: str = None
    ) -> "RefreshToken":
        """
        Create a new refresh token instance.

        Args:
            user_id: User ID to associate token with
            family_id: Token family ID (creates new if None)
            ip_address: Client IP address
            user_agent: Client user agent

        Returns:
            New RefreshToken instance (not yet saved to database)
        """
        if family_id is None:
            family_id = str(uuid.uuid4())

        # Calculate expiration (7 days from now)
        expires_at = datetime.utcnow() + timedelta(days=7)

        return cls(
            user_id=user_id,
            family_id=family_id,
            expires_at=expires_at,
            created_from_ip=ip_address,
            user_agent=user_agent
        )

    def to_dict(self) -> dict:
        """
        Convert token to dictionary (for auditing).

        Returns:
            Dictionary representation of token
        """
        return {
            "id": self.id,
            "user_id": self.user_id,
            "family_id": self.family_id,
            "expires_at": self.expires_at.isoformat(),
            "is_revoked": self.is_revoked,
            "revoked_at": self.revoked_at.isoformat() if self.revoked_at else None,
            "created_at": self.created_at.isoformat(),
            "used_at": self.used_at.isoformat() if self.used_at else None,
            "created_from_ip": self.created_from_ip
        }
