"""Subscription model for payment subscriptions."""
import enum
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Numeric, DateTime, Enum, ForeignKey, CHAR
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class SubscriptionStatus(str, enum.Enum):
    """Subscription status enum."""
    ACTIVE = "active"
    CANCELED = "canceled"
    PAST_DUE = "past_due"
    TRIALING = "trialing"
    PENDING = "pending"


class PlanType(str, enum.Enum):
    """Plan type enum."""
    FREE = "free"
    STARTER = "starter"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class Subscription(Base):
    """Subscription model for managing user payment subscriptions."""

    __tablename__ = "subscriptions"

    # Primary key
    id: Mapped[str] = mapped_column(CHAR(36), primary_key=True)

    # Foreign keys
    user_id: Mapped[str] = mapped_column(
        CHAR(36),
        ForeignKey("users.id", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False,
        index=True
    )

    # Subscription details
    plan: Mapped[PlanType] = mapped_column(
        Enum(PlanType),
        nullable=False,
        default=PlanType.FREE
    )
    status: Mapped[SubscriptionStatus] = mapped_column(
        Enum(SubscriptionStatus),
        nullable=False,
        default=SubscriptionStatus.PENDING,
        index=True
    )

    # PayFast integration fields
    payfast_token: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        index=True,
        comment="PayFast subscription token for recurring payments"
    )
    payfast_subscription_id: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        comment="PayFast subscription ID"
    )

    # Pricing
    amount: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        comment="Subscription amount in currency"
    )
    currency: Mapped[str] = mapped_column(
        String(3),
        nullable=False,
        default="USD",
        comment="Currency code (USD for United States Dollar)"
    )

    # Billing dates
    billing_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True,
        comment="First billing date"
    )
    next_billing_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True,
        index=True,
        comment="Next billing date for recurring subscription"
    )

    # Cancellation tracking
    cancel_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True,
        comment="Scheduled cancellation date"
    )
    canceled_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True,
        comment="Actual cancellation timestamp"
    )

    # Trial period
    trial_end: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True,
        comment="Trial period end date"
    )

    # Subscription lifecycle
    started_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        comment="Subscription start date"
    )
    ended_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True,
        comment="Subscription end date (if canceled)"
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    # Relationships (to be configured in __init__.py)
    # user: Mapped["User"] = relationship(back_populates="subscriptions")
    # payment_logs: Mapped[list["PaymentLog"]] = relationship(back_populates="subscription")

    def __repr__(self) -> str:
        return f"<Subscription(id={self.id}, user_id={self.user_id}, plan={self.plan.value}, status={self.status.value})>"

    def is_active(self) -> bool:
        """Check if subscription is currently active."""
        return self.status == SubscriptionStatus.ACTIVE

    def can_cancel(self) -> bool:
        """Check if subscription can be canceled."""
        return self.status in [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING]
