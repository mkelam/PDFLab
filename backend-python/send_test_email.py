"""Send a test verification email to mmkela@fnb.co.za"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from app.services.email_service import send_verification_email


async def main():
    """Send test email."""
    print("Sending test verification email to mmkela@fnb.co.za...")
    print("=" * 60)

    # Test token
    test_token = "TEST_TOKEN_123456789"

    success = await send_verification_email(
        to_email="mmkela@fnb.co.za",
        user_name="Mpumi Kela",
        verification_token=test_token
    )

    if success:
        print("\n✅ Email sent successfully!")
        print(f"\nVerification link:")
        print(f"http://localhost:3000/verify-email?token={test_token}")
        print("\nCheck your inbox at mmkela@fnb.co.za")
    else:
        print("\n❌ Failed to send email")
        print("Check the logs above for error details")

    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
