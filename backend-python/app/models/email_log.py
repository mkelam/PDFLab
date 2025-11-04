"""Email delivery log model for tracking email sends and bounces."""
from sqlalchemy import Column, String, DateTime, Boolean, Integer, Text, Enum as SQLEnum, ForeignKey
from sqlalchemy.dialects.mysql import CHAR
from datetime import datetime
import uuid
import enum

from app.database import Base


class EmailType(str, enum.Enum):
    """Email type classification."""
    VERIFICATION = "verification"
    PASSWORD_RESET = "password_reset"
    SUBSCRIPTION_CONFIRMATION = "subscription_confirmation"
    PAYMENT_RECEIPT = "payment_receipt"
    CONVERSION_COMPLETE = "conversion_complete"
    GENERAL = "general"


class EmailStatus(str, enum.Enum):
    """Email delivery status."""
    PENDING = "pending"        # Queued for sending
    SENT = "sent"              # Successfully sent
    FAILED = "failed"          # Failed to send
    BOUNCED_HARD = "bounced_hard"    # Permanent failure (invalid email)
    BOUNCED_SOFT = "bounced_soft"    # Temporary failure (mailbox full, etc)
    RETRY = "retry"            # Pending retry


class EmailLog(Base):
    """
    Email delivery tracking and bounce handling.

    Tracks all email sends, delivery status, and bounce information.
    Implements retry logic with exponential backoff for failed sends.

    Attributes:
        id: Unique log identifier (UUID)
        user_id: Associated user ID (optional)
        to_email: Recipient email address
        from_email: Sender email address
        subject: Email subject
        email_type: Type of email (verification, password reset, etc)
        status: Current delivery status
        retry_count: Number of retry attempts
        max_retries: Maximum retry attempts (default 3)
        last_attempt_at: When last send attempt was made
        next_retry_at: When next retry should be attempted
        sent_at: When email was successfully sent
        bounced_at: When bounce was detected
        bounce_reason: Reason for bounce (SMTP error message)
        error_message: Last error message from SMTP
        created_at: When log entry was created
        updated_at: When log entry was last updated
    """

    __tablename__ = "email_logs"

    # Primary Key
    id = Column(
        CHAR(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        comment="Unique log identifier"
    )

    # User relationship (optional - some emails may not be tied to users)
    user_id = Column(
        CHAR(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="Associated user ID"
    )

    # Email details
    to_email = Column(
        String(255),
        nullable=False,
        index=True,
        comment="Recipient email address"
    )

    from_email = Column(
        String(255),
        nullable=False,
        comment="Sender email address"
    )

    subject = Column(
        String(255),
        nullable=False,
        comment="Email subject"
    )

    email_type = Column(
        SQLEnum(EmailType, native_enum=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        index=True,
        comment="Type of email"
    )

    # Delivery status
    status = Column(
        SQLEnum(EmailStatus, native_enum=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=EmailStatus.PENDING,
        index=True,
        comment="Current delivery status"
    )

    # Retry logic
    retry_count = Column(
        Integer,
        nullable=False,
        default=0,
        comment="Number of retry attempts made"
    )

    max_retries = Column(
        Integer,
        nullable=False,
        default=3,
        comment="Maximum retry attempts allowed"
    )

    last_attempt_at = Column(
        DateTime,
        nullable=True,
        comment="When last send attempt was made"
    )

    next_retry_at = Column(
        DateTime,
        nullable=True,
        index=True,
        comment="When next retry should be attempted"
    )

    # Success tracking
    sent_at = Column(
        DateTime,
        nullable=True,
        comment="When email was successfully sent"
    )

    # Bounce tracking
    bounced_at = Column(
        DateTime,
        nullable=True,
        comment="When bounce was detected"
    )

    bounce_reason = Column(
        Text,
        nullable=True,
        comment="Reason for bounce (SMTP error)"
    )

    # Error tracking
    error_message = Column(
        Text,
        nullable=True,
        comment="Last error message from SMTP"
    )

    # Timestamps
    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        index=True,
        comment="When log entry was created"
    )

    updated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        comment="When log entry was last updated"
    )

    def __repr__(self) -> str:
        """String representation of EmailLog."""
        return f"<EmailLog(id={self.id}, to={self.to_email}, type={self.email_type.value}, status={self.status.value})>"

    # ========================================================================
    # HELPER METHODS
    # ========================================================================

    def mark_as_sent(self) -> None:
        """Mark email as successfully sent."""
        self.status = EmailStatus.SENT
        self.sent_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()

    def mark_as_failed(self, error_message: str) -> None:
        """
        Mark email as failed and prepare for retry.

        Args:
            error_message: SMTP error message
        """
        self.status = EmailStatus.FAILED
        self.error_message = error_message
        self.last_attempt_at = datetime.utcnow()
        self.retry_count += 1
        self.updated_at = datetime.utcnow()

        # Calculate next retry time (exponential backoff)
        if self.retry_count < self.max_retries:
            self.status = EmailStatus.RETRY
            # Backoff: 5 min, 30 min, 2 hours
            backoff_minutes = [5, 30, 120]
            if self.retry_count <= len(backoff_minutes):
                minutes = backoff_minutes[self.retry_count - 1]
            else:
                minutes = 120  # Default to 2 hours

            from datetime import timedelta
            self.next_retry_at = datetime.utcnow() + timedelta(minutes=minutes)

    def mark_as_bounced(self, bounce_reason: str, is_hard_bounce: bool = False) -> None:
        """
        Mark email as bounced.

        Args:
            bounce_reason: Reason for bounce
            is_hard_bounce: True for permanent failure, False for temporary
        """
        self.status = EmailStatus.BOUNCED_HARD if is_hard_bounce else EmailStatus.BOUNCED_SOFT
        self.bounced_at = datetime.utcnow()
        self.bounce_reason = bounce_reason
        self.updated_at = datetime.utcnow()

    def can_retry(self) -> bool:
        """
        Check if email can be retried.

        Returns:
            True if retry is allowed, False otherwise
        """
        if self.status not in (EmailStatus.RETRY, EmailStatus.FAILED):
            return False

        if self.retry_count >= self.max_retries:
            return False

        if self.next_retry_at and datetime.utcnow() < self.next_retry_at:
            return False

        return True

    @staticmethod
    def classify_bounce(error_message: str) -> bool:
        """
        Classify bounce as hard (permanent) or soft (temporary).

        Args:
            error_message: SMTP error message

        Returns:
            True if hard bounce, False if soft bounce
        """
        hard_bounce_indicators = [
            "recipient address rejected",
            "user unknown",
            "mailbox unavailable",
            "invalid recipient",
            "no such user",
            "address not found",
            "permanent failure",
            "5.1.1",  # SMTP error code for unknown user
            "5.1.2",  # SMTP error code for bad destination
            "5.2.1",  # Mailbox disabled
        ]

        error_lower = error_message.lower()
        return any(indicator in error_lower for indicator in hard_bounce_indicators)

    def to_dict(self) -> dict:
        """
        Convert email log to dictionary.

        Returns:
            Dictionary representation
        """
        return {
            "id": self.id,
            "user_id": self.user_id,
            "to_email": self.to_email,
            "from_email": self.from_email,
            "subject": self.subject,
            "email_type": self.email_type.value,
            "status": self.status.value,
            "retry_count": self.retry_count,
            "max_retries": self.max_retries,
            "sent_at": self.sent_at.isoformat() if self.sent_at else None,
            "bounced_at": self.bounced_at.isoformat() if self.bounced_at else None,
            "bounce_reason": self.bounce_reason,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }
