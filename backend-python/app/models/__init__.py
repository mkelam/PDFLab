"""Database models."""
from sqlalchemy.orm import relationship

from app.models.user import User, UserPlan, SubscriptionStatus
from app.models.conversion_job import ConversionJob, ConversionType, JobStatus
from app.models.subscription import Subscription, PlanType, SubscriptionStatus as SubStatus
from app.models.payment_log import PaymentLog, PaymentStatus, PaymentType
from app.models.refresh_token import RefreshToken

# Define relationships after all models are imported
User.conversion_jobs = relationship("ConversionJob", back_populates="user", cascade="all, delete-orphan")
User.subscriptions = relationship("Subscription", back_populates="user", cascade="all, delete-orphan")
User.payment_logs = relationship("PaymentLog", back_populates="user", cascade="all, delete-orphan")
User.refresh_tokens = relationship("RefreshToken", backref="user", cascade="all, delete-orphan")

Subscription.user = relationship("User", back_populates="subscriptions")
Subscription.payment_logs = relationship("PaymentLog", back_populates="subscription")

PaymentLog.user = relationship("User", back_populates="payment_logs")
PaymentLog.subscription = relationship("Subscription", back_populates="payment_logs")

__all__ = [
    "User",
    "UserPlan",
    "SubscriptionStatus",
    "ConversionJob",
    "ConversionType",
    "JobStatus",
    "Subscription",
    "PlanType",
    "SubStatus",
    "PaymentLog",
    "PaymentStatus",
    "PaymentType",
    "RefreshToken"
]
