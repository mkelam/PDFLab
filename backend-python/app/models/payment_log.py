"""PaymentLog model for tracking payment transactions."""
import enum
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy import String, Numeric, DateTime, Enum, ForeignKey, Text, JSON, CHAR
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class PaymentStatus(str, enum.Enum):
    """Payment status enum."""
    COMPLETE = "complete"
    FAILED = "failed"
    PENDING = "pending"
    CANCELLED = "cancelled"


class PaymentType(str, enum.Enum):
    """Payment type enum."""
    SUBSCRIPTION = "subscription"
    SUBSCRIPTION_PAYMENT = "subscription_payment"
    ONE_TIME = "one_time"
    REFUND = "refund"


class PaymentLog(Base):
    """PaymentLog model for tracking all payment transactions."""

    __tablename__ = "payment_logs"

    # Primary key
    id: Mapped[str] = mapped_column(CHAR(36), primary_key=True)

    # Foreign keys
    user_id: Mapped[str] = mapped_column(
        CHAR(36),
        ForeignKey("users.id", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False,
        index=True
    )
    subscription_id: Mapped[Optional[str]] = mapped_column(
        CHAR(36),
        ForeignKey("subscriptions.id", ondelete="SET NULL", onupdate="CASCADE"),
        nullable=True,
        index=True
    )

    # Transaction identifiers
    transaction_id: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        unique=True,
        index=True,
        comment="Our internal transaction ID (m_payment_id)"
    )
    payfast_payment_id: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        index=True,
        comment="PayFast payment ID (pf_payment_id)"
    )

    # Payment classification
    payment_type: Mapped[PaymentType] = mapped_column(
        Enum(PaymentType),
        nullable=False,
        default=PaymentType.ONE_TIME
    )
    status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus),
        nullable=False,
        default=PaymentStatus.PENDING,
        index=True
    )

    # Payment amounts
    amount_gross: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        comment="Gross amount before fees"
    )
    amount_fee: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=0.00,
        comment="PayFast processing fee"
    )
    amount_net: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        comment="Net amount after fees"
    )
    currency: Mapped[str] = mapped_column(
        String(3),
        nullable=False,
        default="USD"
    )

    # Plan information
    plan: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="Plan name (free, starter, pro, enterprise)"
    )

    # Payment method
    payment_method: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        comment="Payment method used (eft, credit_card, etc.)"
    )

    # Customer information
    name_first: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )
    name_last: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True
    )
    email_address: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )

    # Item details
    item_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )
    item_description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )

    # Additional data
    custom_data: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=True,
        comment="Custom data sent to PayFast"
    )
    itn_data: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=True,
        comment="Full ITN notification data from PayFast"
    )

    # Error tracking
    error_message: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="Error message if payment failed"
    )

    # Processing timestamp
    processed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True,
        comment="When the payment was processed"
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    # Relationships (to be configured in __init__.py)
    # user: Mapped["User"] = relationship(back_populates="payment_logs")
    # subscription: Mapped[Optional["Subscription"]] = relationship(back_populates="payment_logs")

    def __repr__(self) -> str:
        return f"<PaymentLog(id={self.id}, transaction_id={self.transaction_id}, status={self.status.value}, amount={self.amount_gross})>"

    def is_successful(self) -> bool:
        """Check if payment was successful."""
        return self.status == PaymentStatus.COMPLETE

    def mark_complete(self, processed_at: Optional[datetime] = None) -> None:
        """Mark payment as complete."""
        self.status = PaymentStatus.COMPLETE
        self.processed_at = processed_at or datetime.utcnow()

    def mark_failed(self, error_message: Optional[str] = None) -> None:
        """Mark payment as failed with optional error message."""
        self.status = PaymentStatus.FAILED
        if error_message:
            self.error_message = error_message
        self.processed_at = datetime.utcnow()
