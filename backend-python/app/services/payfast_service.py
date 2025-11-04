"""PayFast Payment Gateway Service.

Handles payment initialization, signature generation, and ITN verification.
"""
import hashlib
import ssl
import http.client
from typing import Dict, Any, Optional
from urllib.parse import urlencode, quote_plus
from datetime import datetime, timedelta
import structlog

from app.config import settings

logger = structlog.get_logger(__name__)


# PayFast configuration
class PayFastConfig:
    """PayFast configuration."""
    def __init__(self):
        self.merchant_id = settings.PAYFAST_MERCHANT_ID
        self.merchant_key = settings.PAYFAST_MERCHANT_KEY
        self.passphrase = getattr(settings, 'PAYFAST_PASSPHRASE', '')
        self.mode = getattr(settings, 'PAYFAST_MODE', 'sandbox')
        self.api_url = (
            'https://www.payfast.co.za'
            if self.mode == 'production'
            else 'https://sandbox.payfast.co.za'
        )

    @property
    def is_production(self) -> bool:
        return self.mode == 'production'

    @property
    def hostname(self) -> str:
        return 'www.payfast.co.za' if self.is_production else 'sandbox.payfast.co.za'


config = PayFastConfig()


# PayFast valid hosts for ITN validation
PAYFAST_HOSTS = [
    'www.payfast.co.za',
    'sandbox.payfast.co.za',
    'w1w.payfast.co.za',
    'w2w.payfast.co.za',
    '127.0.0.1',  # For local testing
    'localhost'   # For local testing
]


def generate_signature(data: Dict[str, Any], passphrase: str = '') -> str:
    """Generate MD5 signature for PayFast payment data.

    Args:
        data: Payment data dictionary
        passphrase: Optional passphrase for additional security

    Returns:
        MD5 hash signature
    """
    # Sort keys alphabetically
    sorted_keys = sorted(data.keys())

    # Build parameter string
    param_list = []
    for key in sorted_keys:
        value = data[key]
        # Skip signature field and empty values
        if key != 'signature' and value not in ('', None):
            # Convert to string and trim
            value_str = str(value).strip()
            # URL encode with + for spaces
            encoded_value = quote_plus(value_str)
            param_list.append(f"{key}={encoded_value}")

    param_string = '&'.join(param_list)

    # Add passphrase if provided
    if passphrase:
        passphrase_encoded = quote_plus(passphrase.strip())
        param_string += f"&passphrase={passphrase_encoded}"

    # Generate MD5 hash
    signature = hashlib.md5(param_string.encode('utf-8')).hexdigest()

    logger.debug(
        "signature_generated",
        param_count=len(param_list),
        has_passphrase=bool(passphrase)
    )

    return signature


def create_payment_data(
    user_id: str,
    user_email: str,
    user_name: str,
    plan_name: str,
    plan_price: float,
    transaction_id: str
) -> Dict[str, Any]:
    """Create payment data for one-time payment.

    Args:
        user_id: User's unique ID
        user_email: User's email address
        user_name: User's full name
        plan_name: Name of the plan being purchased
        plan_price: Price of the plan
        transaction_id: Unique transaction ID

    Returns:
        Payment data dictionary with signature
    """
    base_url = settings.API_URL or 'http://localhost:3007'

    payment_data = {
        'merchant_id': config.merchant_id,
        'merchant_key': config.merchant_key,
        'return_url': f"{base_url}/api/payfast/return",
        'cancel_url': f"{base_url}/api/payfast/cancel",
        'notify_url': f"{base_url}/api/payfast/webhook",
        'name_first': user_name,
        'email_address': user_email,
        'm_payment_id': transaction_id,
        'amount': f"{plan_price:.2f}",
        'item_name': f"PDFLab {plan_name.title()} Plan",
        'item_description': f"PDFLab {plan_name.title()} subscription",
        'custom_str1': user_id,
        'custom_str2': plan_name.lower(),
        'email_confirmation': '1',
        'confirmation_address': user_email
    }

    signature = generate_signature(payment_data, config.passphrase)
    payment_data['signature'] = signature

    logger.info(
        "payment_data_created",
        transaction_id=transaction_id,
        plan=plan_name,
        amount=plan_price
    )

    return payment_data


def create_subscription_payment_data(
    user_id: str,
    user_email: str,
    user_name: str,
    plan_name: str,
    plan_price: float,
    transaction_id: str,
    billing_date: Optional[datetime] = None
) -> Dict[str, Any]:
    """Create subscription payment data for recurring billing.

    Args:
        user_id: User's unique ID
        user_email: User's email address
        user_name: User's full name
        plan_name: Name of the plan being purchased
        plan_price: Price of the plan
        transaction_id: Unique transaction ID
        billing_date: First billing date (defaults to 30 days from now)

    Returns:
        Subscription payment data dictionary with signature
    """
    base_url = settings.API_URL or 'http://localhost:3007'

    # Default billing date to 30 days from now
    if billing_date is None:
        billing_date = datetime.now() + timedelta(days=30)

    payment_data = {
        'merchant_id': config.merchant_id,
        'merchant_key': config.merchant_key,
        'return_url': f"{base_url}/api/payfast/return",
        'cancel_url': f"{base_url}/api/payfast/cancel",
        'notify_url': f"{base_url}/api/payfast/webhook",
        'name_first': user_name,
        'email_address': user_email,
        'm_payment_id': transaction_id,
        'amount': f"{plan_price:.2f}",
        'item_name': f"PDFLab {plan_name.title()} Plan",
        'item_description': f"PDFLab {plan_name.title()} monthly subscription",
        'custom_str1': user_id,
        'custom_str2': plan_name.lower(),
        'email_confirmation': '1',
        'confirmation_address': user_email,
        # Subscription specific fields
        'subscription_type': '1',  # Recurring
        'billing_date': billing_date.strftime('%Y-%m-%d'),  # YYYY-MM-DD
        'recurring_amount': f"{plan_price:.2f}",
        'frequency': '3',  # Monthly
        'cycles': '0'  # Unlimited (0 = continue until cancelled)
    }

    signature = generate_signature(payment_data, config.passphrase)
    payment_data['signature'] = signature

    logger.info(
        "subscription_payment_data_created",
        transaction_id=transaction_id,
        plan=plan_name,
        amount=plan_price,
        billing_date=billing_date.strftime('%Y-%m-%d')
    )

    return payment_data


def validate_signature(data: Dict[str, Any], received_signature: str) -> bool:
    """Validate PayFast ITN signature.

    Args:
        data: ITN data dictionary
        received_signature: Signature received from PayFast

    Returns:
        True if signature is valid, False otherwise
    """
    # Create a copy without the signature field
    data_without_sig = {k: v for k, v in data.items() if k != 'signature'}

    calculated_signature = generate_signature(data_without_sig, config.passphrase)
    is_valid = calculated_signature == received_signature

    if not is_valid:
        logger.warning(
            "signature_validation_failed",
            received=received_signature,
            calculated=calculated_signature
        )

    return is_valid


def verify_payment_with_payfast(data: Dict[str, Any]) -> bool:
    """Verify payment with PayFast server.

    Makes a request back to PayFast to confirm the payment is legitimate.

    Args:
        data: ITN data dictionary

    Returns:
        True if PayFast confirms payment is valid, False otherwise
    """
    try:
        # Build parameter string
        param_string = urlencode(data)

        # Create HTTPS connection
        context = ssl.create_default_context()
        conn = http.client.HTTPSConnection(config.hostname, context=context)

        headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': str(len(param_string))
        }

        # Make POST request to PayFast validation endpoint
        conn.request('POST', '/eng/query/validate', param_string, headers)

        response = conn.getresponse()
        body = response.read().decode('utf-8').strip()

        conn.close()

        # PayFast returns "VALID" if the payment is legitimate
        is_valid = body == 'VALID'

        logger.info(
            "payfast_server_verification",
            response=body,
            is_valid=is_valid,
            transaction_id=data.get('m_payment_id')
        )

        return is_valid

    except Exception as e:
        logger.error(
            "payfast_verification_error",
            error=str(e),
            transaction_id=data.get('m_payment_id'),
            exc_info=True
        )
        return False


def validate_payfast_host(host: str) -> bool:
    """Validate that the request came from PayFast servers.

    Args:
        host: Hostname of the request origin

    Returns:
        True if host is a valid PayFast server, False otherwise
    """
    is_valid = host in PAYFAST_HOSTS

    if not is_valid:
        logger.warning("invalid_payfast_host", host=host)

    return is_valid


def validate_amount(received_amount: str, expected_amount: float) -> bool:
    """Validate payment amount matches expected amount.

    Args:
        received_amount: Amount received as string
        expected_amount: Expected amount as float

    Returns:
        True if amounts match (within 1 cent tolerance), False otherwise
    """
    try:
        received = float(received_amount)
        expected = float(f"{expected_amount:.2f}")

        # Allow for small floating point differences (within 1 cent)
        difference = abs(received - expected)
        is_valid = difference < 0.01

        if not is_valid:
            logger.warning(
                "amount_mismatch",
                received=received,
                expected=expected,
                difference=difference
            )

        return is_valid

    except ValueError as e:
        logger.error("amount_validation_error", error=str(e), received=received_amount)
        return False


def get_payfast_url() -> str:
    """Get PayFast payment URL.

    Returns:
        Full URL to PayFast payment processing endpoint
    """
    return f"{config.api_url}/eng/process"


def is_configured() -> bool:
    """Check if PayFast is properly configured.

    Returns:
        True if merchant ID and key are set, False otherwise
    """
    return bool(config.merchant_id and config.merchant_key)


def get_config() -> Dict[str, Any]:
    """Get PayFast configuration (without sensitive data).

    Returns:
        Configuration dictionary
    """
    return {
        'mode': config.mode,
        'api_url': config.api_url,
        'configured': is_configured()
    }
