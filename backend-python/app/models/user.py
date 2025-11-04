"""User database model."""
from sqlalchemy import Column, String, Integer, DateTime, Enum as SQLEnum, Boolean
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta
import uuid
import enum

from app.database import Base
from app.config import settings


class UserPlan(str, enum.Enum):
    """User subscription plans."""
    FREE = "free"
    STARTER = "starter"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class SubscriptionStatus(str, enum.Enum):
    """Subscription status."""
    ACTIVE = "active"
    CANCELED = "canceled"
    PAST_DUE = "past_due"
    TRIALING = "trialing"


class User(Base):
    """
    User model for authentication and subscription management.

    Attributes:
        id: Unique user identifier (UUID)
        email: User's email address (unique)
        password_hash: Bcrypt hashed password
        name: User's display name (optional)
        plan: Current subscription plan
        conversions_used: Number of conversions this month
        conversions_limit: Monthly conversion limit based on plan
        stripe_customer_id: Stripe customer ID (legacy, now PayFast)
        subscription_id: Active subscription ID
        subscription_status: Current subscription status
        subscription_end_date: When subscription expires
        created_at: Account creation timestamp
        updated_at: Last update timestamp
        last_login: Last login timestamp
    """

    __tablename__ = "users"

    # Primary Key
    id = Column(
        CHAR(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        comment="Unique user identifier (UUID)"
    )

    # Authentication
    email = Column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
        comment="User's email address"
    )
    password_hash = Column(
        String(255),
        nullable=False,
        comment="Bcrypt hashed password"
    )
    name = Column(
        String(255),
        nullable=True,
        comment="User's display name"
    )

    # Email Verification
    email_verified = Column(
        Boolean,
        nullable=False,
        default=False,
        comment="Whether email has been verified"
    )
    verification_token = Column(
        String(255),
        nullable=True,
        index=True,
        comment="Email verification token"
    )
    verification_token_expires = Column(
        DateTime,
        nullable=True,
        comment="When verification token expires"
    )
    password_reset_token = Column(
        String(255),
        nullable=True,
        index=True,
        comment="Password reset token"
    )
    password_reset_token_expires = Column(
        DateTime,
        nullable=True,
        comment="When password reset token expires"
    )

    # Subscription & Plan
    plan = Column(
        SQLEnum(UserPlan, native_enum=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=UserPlan.FREE,
        comment="Current subscription plan"
    )
    conversions_used = Column(
        Integer,
        nullable=False,
        default=0,
        comment="Number of conversions used this month"
    )
    conversions_limit = Column(
        Integer,
        nullable=False,
        default=3,  # Default for free plan
        comment="Monthly conversion limit"
    )

    # Payment Integration (PayFast/Stripe)
    stripe_customer_id = Column(
        String(255),
        nullable=True,
        index=True,
        comment="Stripe customer ID (legacy)"
    )
    subscription_id = Column(
        String(255),
        nullable=True,
        comment="Active subscription ID"
    )
    subscription_status = Column(
        SQLEnum(SubscriptionStatus, native_enum=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
        comment="Current subscription status"
    )
    subscription_end_date = Column(
        DateTime,
        nullable=True,
        comment="Subscription expiration date"
    )

    # Timestamps
    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        comment="Account creation timestamp"
    )
    updated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        comment="Last update timestamp"
    )
    last_login = Column(
        DateTime,
        nullable=True,
        comment="Last login timestamp"
    )

    # Relationships (will be defined when other models are created)
    # conversion_jobs = relationship("ConversionJob", back_populates="user")
    # subscriptions = relationship("Subscription", back_populates="user")
    # payment_logs = relationship("PaymentLog", back_populates="user")
    # usage_logs = relationship("UsageLog", back_populates="user")

    def __repr__(self) -> str:
        """String representation of User."""
        return f"<User(id={self.id}, email={self.email}, plan={self.plan})>"

    # ========================================================================
    # HELPER METHODS
    # ========================================================================

    def can_convert(self) -> bool:
        """
        Check if user can perform a conversion.

        Pro and Enterprise plans have unlimited conversions.
        Free and Starter plans have monthly limits.

        Returns:
            True if user can convert, False otherwise
        """
        if self.plan in (UserPlan.PRO, UserPlan.ENTERPRISE):
            return True  # Unlimited

        return self.conversions_used < self.conversions_limit

    def get_max_file_size(self) -> int:
        """
        Get maximum file size allowed for user's plan.

        Returns:
            Maximum file size in bytes
        """
        return settings.get_max_file_size(self.plan.value)

    def reset_monthly_usage(self) -> None:
        """
        Reset monthly conversion usage to zero.

        This should be called at the start of each billing cycle.
        """
        self.conversions_used = 0
        self.updated_at = datetime.utcnow()

    def increment_conversions(self) -> None:
        """
        Increment conversion count by one.

        Raises:
            ValueError: If user has exceeded conversion limit
        """
        if not self.can_convert():
            raise ValueError(
                f"Conversion limit exceeded. Used: {self.conversions_used}, "
                f"Limit: {self.conversions_limit}"
            )

        self.conversions_used += 1
        self.updated_at = datetime.utcnow()

    def update_last_login(self) -> None:
        """Update last login timestamp to now."""
        self.last_login = datetime.utcnow()
        self.updated_at = datetime.utcnow()

    def upgrade_plan(self, new_plan: UserPlan) -> None:
        """
        Upgrade user's subscription plan.

        Args:
            new_plan: New subscription plan

        Raises:
            ValueError: If downgrading to a lower plan
        """
        plan_hierarchy = {
            UserPlan.FREE: 0,
            UserPlan.STARTER: 1,
            UserPlan.PRO: 2,
            UserPlan.ENTERPRISE: 3
        }

        if plan_hierarchy[new_plan] <= plan_hierarchy[self.plan]:
            raise ValueError(f"Cannot downgrade from {self.plan} to {new_plan}")

        self.plan = new_plan
        self.conversions_limit = settings.get_conversion_limit(new_plan.value)
        self.updated_at = datetime.utcnow()

    def downgrade_plan(self, new_plan: UserPlan) -> None:
        """
        Downgrade user's subscription plan.

        Args:
            new_plan: New subscription plan
        """
        self.plan = new_plan
        self.conversions_limit = settings.get_conversion_limit(new_plan.value)

        # Reset usage if exceeded new limit
        if self.conversions_used > self.conversions_limit:
            self.conversions_used = self.conversions_limit

        self.updated_at = datetime.utcnow()

    def is_subscription_active(self) -> bool:
        """
        Check if user has an active subscription.

        Returns:
            True if subscription is active, False otherwise
        """
        if not self.subscription_status:
            return False

        if self.subscription_status != SubscriptionStatus.ACTIVE:
            return False

        if self.subscription_end_date and self.subscription_end_date < datetime.utcnow():
            return False

        return True

    def generate_verification_token(self) -> str:
        """
        Generate a new email verification token.

        Returns:
            The generated verification token
        """
        import secrets
        self.verification_token = secrets.token_urlsafe(32)
        self.verification_token_expires = datetime.utcnow() + timedelta(hours=24)
        self.updated_at = datetime.utcnow()
        return self.verification_token

    def generate_password_reset_token(self) -> str:
        """
        Generate a new password reset token.

        Returns:
            The generated reset token
        """
        import secrets
        self.password_reset_token = secrets.token_urlsafe(32)
        self.password_reset_token_expires = datetime.utcnow() + timedelta(hours=1)
        self.updated_at = datetime.utcnow()
        return self.password_reset_token

    def verify_email(self) -> None:
        """Mark email as verified and clear verification token."""
        self.email_verified = True
        self.verification_token = None
        self.verification_token_expires = None
        self.updated_at = datetime.utcnow()

    def is_verification_token_valid(self) -> bool:
        """
        Check if verification token is still valid.

        Returns:
            True if token is valid, False otherwise
        """
        if not self.verification_token or not self.verification_token_expires:
            return False
        return datetime.utcnow() < self.verification_token_expires

    def is_password_reset_token_valid(self) -> bool:
        """
        Check if password reset token is still valid.

        Returns:
            True if token is valid, False otherwise
        """
        if not self.password_reset_token or not self.password_reset_token_expires:
            return False
        return datetime.utcnow() < self.password_reset_token_expires

    def to_dict(self) -> dict:
        """
        Convert user to dictionary (for API responses).

        Excludes password_hash for security.

        Returns:
            Dictionary representation of user
        """
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name,
            "email_verified": self.email_verified,
            "plan": self.plan.value,
            "conversions_used": self.conversions_used,
            "conversions_limit": self.conversions_limit,
            "subscription_status": self.subscription_status.value if self.subscription_status else None,
            "subscription_end_date": self.subscription_end_date.isoformat() if self.subscription_end_date else None,
            "created_at": self.created_at.isoformat(),
            "last_login": self.last_login.isoformat() if self.last_login else None
        }
