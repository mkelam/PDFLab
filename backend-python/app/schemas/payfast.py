"""PayFast payment schemas."""
from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, EmailStr


class PricingPlan(BaseModel):
    """Pricing plan information."""
    id: str
    name: str
    price: float
    currency: str = "USD"
    conversions_limit: int
    file_size_limit_mb: int
    features: list[str]
    popular: bool = False


class PaymentInitializeRequest(BaseModel):
    """Request to initialize a payment."""
    plan: str = Field(..., description="Plan name (starter, pro, enterprise)")
    subscription: bool = Field(default=True, description="Whether this is a subscription payment")
    billing_date: Optional[str] = Field(None, description="First billing date (YYYY-MM-DD format)")


class PaymentInitializeResponse(BaseModel):
    """Response from payment initialization."""
    payment_url: str
    transaction_id: str
    payment_data: Dict[str, Any]


class ITNRequest(BaseModel):
    """Instant Transaction Notification from PayFast."""
    m_payment_id: str
    pf_payment_id: str
    payment_status: str
    item_name: str
    item_description: Optional[str] = None
    amount_gross: str
    amount_fee: str
    amount_net: str
    custom_str1: Optional[str] = None  # user_id
    custom_str2: Optional[str] = None  # plan
    custom_str3: Optional[str] = None
    custom_str4: Optional[str] = None
    custom_str5: Optional[str] = None
    custom_int1: Optional[str] = None
    custom_int2: Optional[str] = None
    custom_int3: Optional[str] = None
    custom_int4: Optional[str] = None
    custom_int5: Optional[str] = None
    name_first: str
    name_last: Optional[str] = None
    email_address: str
    merchant_id: str
    signature: str
    # Subscription fields
    token: Optional[str] = None
    billing_date: Optional[str] = None

    class Config:
        extra = "allow"  # Allow additional fields from PayFast


class PaymentReturnResponse(BaseModel):
    """Response for payment return page."""
    success: bool
    message: str
    transaction_id: Optional[str] = None
    plan: Optional[str] = None


class SubscriptionResponse(BaseModel):
    """Subscription details response."""
    id: str
    user_id: str
    plan: str
    status: str
    amount: float
    currency: str
    payfast_token: Optional[str] = None
    billing_date: Optional[datetime] = None
    next_billing_date: Optional[datetime] = None
    started_at: datetime
    created_at: datetime


class PaymentHistoryItem(BaseModel):
    """Payment history item."""
    id: str
    transaction_id: str
    payment_type: str
    status: str
    amount_gross: float
    amount_fee: float
    amount_net: float
    currency: str
    plan: str
    item_name: str
    processed_at: Optional[datetime] = None
    created_at: datetime


class PaymentHistoryResponse(BaseModel):
    """Payment history response."""
    payments: list[PaymentHistoryItem]
    total: int


class CancelSubscriptionRequest(BaseModel):
    """Request to cancel a subscription."""
    subscription_id: str


class CancelSubscriptionResponse(BaseModel):
    """Response for subscription cancellation."""
    success: bool
    message: str
    subscription_id: str
    canceled_at: datetime


class PricingPlansResponse(BaseModel):
    """Response with all pricing plans."""
    plans: list[PricingPlan]


# PayFast payment data structures (internal use)
class PayFastPaymentData(BaseModel):
    """PayFast payment form data."""
    merchant_id: str
    merchant_key: str
    return_url: str
    cancel_url: str
    notify_url: str
    name_first: str
    name_last: Optional[str] = None
    email_address: str
    m_payment_id: str
    amount: str
    item_name: str
    item_description: Optional[str] = None
    custom_str1: Optional[str] = None
    custom_str2: Optional[str] = None
    custom_str3: Optional[str] = None
    custom_str4: Optional[str] = None
    custom_str5: Optional[str] = None
    email_confirmation: Optional[str] = None
    confirmation_address: Optional[str] = None
    # Subscription fields
    subscription_type: Optional[str] = None
    billing_date: Optional[str] = None
    recurring_amount: Optional[str] = None
    frequency: Optional[str] = None
    cycles: Optional[str] = None
    signature: str


# Pricing plan constants
PRICING_PLANS = {
    "free": {
        "id": "free",
        "name": "Free",
        "price": 0.00,
        "currency": "USD",
        "conversions_limit": 3,
        "file_size_limit_mb": 10,
        "features": [
            "3 conversions per month",
            "10MB file size limit",
            "PDF to PPTX, DOCX, XLSX",
            "PDF to PNG images",
            "PDF merging"
        ],
        "popular": False
    },
    "starter": {
        "id": "starter",
        "name": "Starter",
        "price": 9.99,
        "currency": "USD",
        "conversions_limit": 100,
        "file_size_limit_mb": 25,
        "features": [
            "100 conversions per month",
            "25MB file size limit",
            "All Free features",
            "Priority processing",
            "Email support"
        ],
        "popular": False
    },
    "pro": {
        "id": "pro",
        "name": "Pro",
        "price": 29.99,
        "currency": "USD",
        "conversions_limit": -1,  # Unlimited
        "file_size_limit_mb": 100,
        "features": [
            "Unlimited conversions",
            "100MB file size limit",
            "All Starter features",
            "OCR text extraction",
            "Batch processing",
            "Premium support"
        ],
        "popular": True
    },
    "enterprise": {
        "id": "enterprise",
        "name": "Enterprise",
        "price": 99.99,
        "currency": "USD",
        "conversions_limit": -1,  # Unlimited
        "file_size_limit_mb": 500,
        "features": [
            "Unlimited conversions",
            "500MB file size limit",
            "All Pro features",
            "API access",
            "Custom integrations",
            "Dedicated support",
            "SLA guarantee"
        ],
        "popular": False
    }
}
