"""PayFast payment router."""
from fastapi import APIRouter, HTTPException, status, Depends, Request, Form
from fastapi.responses import HTMLResponse, RedirectResponse
from datetime import datetime
from typing import Optional, Dict, Any
import uuid
import structlog

from app.database import AsyncSessionLocal
from app.models import (
    User, Subscription, PaymentLog,
    PlanType, SubStatus, PaymentStatus, PaymentType
)
from app.schemas.payfast import (
    PRICING_PLANS,
    PricingPlansResponse,
    PaymentInitializeRequest,
    PaymentInitializeResponse,
    ITNRequest,
    PaymentReturnResponse,
    SubscriptionResponse,
    CancelSubscriptionRequest,
    CancelSubscriptionResponse
)
from app.services import payfast_service
from app.middleware.auth import get_current_user, get_optional_user

logger = structlog.get_logger(__name__)

router = APIRouter()


@router.get("/plans", response_model=PricingPlansResponse)
async def get_pricing_plans():
    """Get all pricing plans (public endpoint)."""
    plans = [
        {
            "id": plan_data["id"],
            "name": plan_data["name"],
            "price": plan_data["price"],
            "currency": plan_data["currency"],
            "conversions_limit": plan_data["conversions_limit"],
            "file_size_limit_mb": plan_data["file_size_limit_mb"],
            "features": plan_data["features"],
            "popular": plan_data.get("popular", False)
        }
        for plan_data in PRICING_PLANS.values()
    ]

    return PricingPlansResponse(plans=plans)


@router.post("/initialize", response_model=PaymentInitializeResponse)
async def initialize_payment(
    payment_request: PaymentInitializeRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Initialize a PayFast payment.

    Creates a payment transaction and returns PayFast form data.
    """
    # Validate plan
    plan_name = payment_request.plan.lower()
    if plan_name not in PRICING_PLANS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid plan: {plan_name}"
        )

    plan_info = PRICING_PLANS[plan_name]

    # Don't allow "downgrade" to free plan via payment
    if plan_name == "free":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Free plan cannot be purchased via payment"
        )

    # Generate transaction ID
    transaction_id = str(uuid.uuid4())

    # Get user's name (split from email if no name provided)
    user_name = current_user.name or current_user.email.split('@')[0]

    # Create payment data
    if payment_request.subscription:
        # Create subscription payment
        billing_date = None
        if payment_request.billing_date:
            try:
                billing_date = datetime.strptime(payment_request.billing_date, '%Y-%m-%d')
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid billing_date format. Use YYYY-MM-DD"
                )

        payment_data = payfast_service.create_subscription_payment_data(
            user_id=current_user.id,
            user_email=current_user.email,
            user_name=user_name,
            plan_name=plan_name,
            plan_price=plan_info["price"],
            transaction_id=transaction_id,
            billing_date=billing_date
        )
    else:
        # Create one-time payment
        payment_data = payfast_service.create_payment_data(
            user_id=current_user.id,
            user_email=current_user.email,
            user_name=user_name,
            plan_name=plan_name,
            plan_price=plan_info["price"],
            transaction_id=transaction_id
        )

    # Create pending payment log
    async with AsyncSessionLocal() as session:
        payment_log = PaymentLog(
            id=str(uuid.uuid4()),
            user_id=current_user.id,
            transaction_id=transaction_id,
            payment_type=PaymentType.SUBSCRIPTION if payment_request.subscription else PaymentType.ONE_TIME,
            status=PaymentStatus.PENDING,
            amount_gross=plan_info["price"],
            amount_fee=0.00,
            amount_net=plan_info["price"],
            currency="USD",
            plan=plan_name,
            name_first=user_name,
            email_address=current_user.email,
            item_name=payment_data["item_name"],
            item_description=payment_data.get("item_description"),
            custom_data={"plan": plan_name, "subscription": payment_request.subscription}
        )
        session.add(payment_log)
        await session.commit()

    logger.info(
        "payment_initialized",
        user_id=current_user.id,
        transaction_id=transaction_id,
        plan=plan_name,
        is_subscription=payment_request.subscription
    )

    return PaymentInitializeResponse(
        payment_url=payfast_service.get_payfast_url(),
        transaction_id=transaction_id,
        payment_data=payment_data
    )


@router.post("/webhook")
async def payfast_webhook(request: Request):
    """
    PayFast ITN (Instant Transaction Notification) webhook.

    This endpoint is called by PayFast to notify us of payment status changes.
    Must be publicly accessible (no authentication required).
    """
    # Get raw form data
    form_data = await request.form()
    itn_data = dict(form_data)

    logger.info("payfast_itn_received", data=itn_data)

    # Step 1: Validate host
    client_host = request.client.host if request.client else "unknown"
    if not payfast_service.validate_payfast_host(client_host):
        logger.warning("invalid_payfast_host", host=client_host)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid request origin"
        )

    # Step 2: Validate signature
    received_signature = itn_data.get('signature', '')
    if not payfast_service.validate_signature(itn_data, received_signature):
        logger.error("invalid_signature", transaction_id=itn_data.get('m_payment_id'))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid signature"
        )

    # Step 3: Verify with PayFast server
    if not payfast_service.verify_payment_with_payfast(itn_data):
        logger.error("payfast_verification_failed", transaction_id=itn_data.get('m_payment_id'))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment verification failed"
        )

    # Extract ITN data
    transaction_id = itn_data.get('m_payment_id')
    payment_status = itn_data.get('payment_status')
    amount_gross = float(itn_data.get('amount_gross', 0))
    amount_fee = float(itn_data.get('amount_fee', 0))
    amount_net = float(itn_data.get('amount_net', 0))
    pf_payment_id = itn_data.get('pf_payment_id')
    user_id = itn_data.get('custom_str1')
    plan_name = itn_data.get('custom_str2', '').lower()
    payfast_token = itn_data.get('token')  # For subscriptions

    # Find payment log
    async with AsyncSessionLocal() as session:
        payment_log = await session.get(PaymentLog, transaction_id)
        if not payment_log:
            logger.error("payment_log_not_found", transaction_id=transaction_id)
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transaction not found"
            )

        # Update payment log
        payment_log.payfast_payment_id = pf_payment_id
        payment_log.amount_gross = amount_gross
        payment_log.amount_fee = amount_fee
        payment_log.amount_net = amount_net
        payment_log.itn_data = itn_data
        payment_log.processed_at = datetime.utcnow()

        if payment_status == 'COMPLETE':
            payment_log.status = PaymentStatus.COMPLETE

            # Get user
            user = await session.get(User, user_id)
            if user:
                # Update user's plan
                user.plan = PlanType[plan_name.upper()]

                # Create or update subscription
                subscription = Subscription(
                    id=str(uuid.uuid4()),
                    user_id=user.id,
                    plan=PlanType[plan_name.upper()],
                    status=SubStatus.ACTIVE,
                    payfast_token=payfast_token,
                    amount=amount_gross,
                    currency="USD",
                    started_at=datetime.utcnow()
                )
                session.add(subscription)

                # Link payment log to subscription
                await session.flush()  # Get subscription ID
                payment_log.subscription_id = subscription.id

                # Reset conversion quota
                plan_info = PRICING_PLANS[plan_name]
                user.conversions_limit = plan_info["conversions_limit"]
                user.conversions_used = 0
                user.subscription_status = SubStatus.ACTIVE.value

                logger.info(
                    "payment_completed",
                    user_id=user.id,
                    transaction_id=transaction_id,
                    plan=plan_name,
                    amount=amount_gross
                )
        else:
            payment_log.status = PaymentStatus.FAILED
            payment_log.error_message = f"Payment status: {payment_status}"

            logger.warning(
                "payment_failed",
                transaction_id=transaction_id,
                status=payment_status
            )

        await session.commit()

    return {"status": "ok"}


@router.get("/return", response_class=HTMLResponse)
async def payment_return(
    m_payment_id: Optional[str] = None,
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Payment return URL (success page).

    User is redirected here after completing payment on PayFast.
    """
    if not m_payment_id:
        return HTMLResponse(content="""
            <html>
                <head><title>Payment Status</title></head>
                <body>
                    <h1>Payment Processing</h1>
                    <p>Your payment is being processed. You will receive an email confirmation shortly.</p>
                    <p><a href="http://localhost:3000/dashboard">Go to Dashboard</a></p>
                </body>
            </html>
        """)

    # Check payment status
    async with AsyncSessionLocal() as session:
        payment_log = await session.get(PaymentLog, m_payment_id)

        if payment_log and payment_log.status == PaymentStatus.COMPLETE:
            plan_name = payment_log.plan.title()
            return HTMLResponse(content=f"""
                <html>
                    <head><title>Payment Successful</title></head>
                    <body>
                        <h1>Payment Successful!</h1>
                        <p>Thank you for subscribing to PDFLab {plan_name} plan.</p>
                        <p>Transaction ID: {m_payment_id}</p>
                        <p><a href="http://localhost:3000/dashboard">Go to Dashboard</a></p>
                    </body>
                </html>
            """)
        else:
            return HTMLResponse(content="""
                <html>
                    <head><title>Payment Processing</title></head>
                    <body>
                        <h1>Payment Processing</h1>
                        <p>Your payment is being processed. Please check your email for confirmation.</p>
                        <p><a href="http://localhost:3000/dashboard">Go to Dashboard</a></p>
                    </body>
                </html>
            """)


@router.get("/cancel", response_class=HTMLResponse)
async def payment_cancel(m_payment_id: Optional[str] = None):
    """
    Payment cancel URL.

    User is redirected here if they cancel payment on PayFast.
    """
    if m_payment_id:
        # Mark payment as cancelled
        async with AsyncSessionLocal() as session:
            payment_log = await session.get(PaymentLog, m_payment_id)
            if payment_log:
                payment_log.status = PaymentStatus.CANCELLED
                await session.commit()

    return HTMLResponse(content="""
        <html>
            <head><title>Payment Cancelled</title></head>
            <body>
                <h1>Payment Cancelled</h1>
                <p>Your payment was cancelled. No charges have been made.</p>
                <p><a href="http://localhost:3000/pricing">View Pricing</a></p>
                <p><a href="http://localhost:3000/dashboard">Go to Dashboard</a></p>
            </body>
        </html>
    """)


@router.get("/subscription/{subscription_id}", response_model=SubscriptionResponse)
async def get_subscription(
    subscription_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get subscription details."""
    async with AsyncSessionLocal() as session:
        subscription = await session.get(Subscription, subscription_id)

        if not subscription:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Subscription not found"
            )

        # Verify ownership
        if subscription.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this subscription"
            )

        return SubscriptionResponse(
            id=subscription.id,
            user_id=subscription.user_id,
            plan=subscription.plan.value,
            status=subscription.status.value,
            amount=float(subscription.amount),
            currency=subscription.currency,
            payfast_token=subscription.payfast_token,
            billing_date=subscription.billing_date,
            next_billing_date=subscription.next_billing_date,
            started_at=subscription.started_at,
            created_at=subscription.created_at
        )


@router.post("/cancel-subscription", response_model=CancelSubscriptionResponse)
async def cancel_subscription(
    cancel_request: CancelSubscriptionRequest,
    current_user: User = Depends(get_current_user)
):
    """Cancel a subscription."""
    async with AsyncSessionLocal() as session:
        subscription = await session.get(Subscription, cancel_request.subscription_id)

        if not subscription:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Subscription not found"
            )

        # Verify ownership
        if subscription.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to cancel this subscription"
            )

        # Check if can be canceled
        if not subscription.can_cancel():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Subscription cannot be canceled (status: {subscription.status.value})"
            )

        # Cancel subscription
        canceled_at = datetime.utcnow()
        subscription.status = SubStatus.CANCELED
        subscription.canceled_at = canceled_at
        subscription.ended_at = canceled_at

        # Update user
        user = await session.get(User, current_user.id)
        if user:
            user.subscription_status = SubStatus.CANCELED.value

        await session.commit()

        logger.info(
            "subscription_canceled",
            user_id=current_user.id,
            subscription_id=subscription.id,
            plan=subscription.plan.value
        )

        return CancelSubscriptionResponse(
            success=True,
            message="Subscription canceled successfully",
            subscription_id=subscription.id,
            canceled_at=canceled_at
        )
