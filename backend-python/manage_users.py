"""
CLI User Management Tool for PDFLab.

This script allows administrators to manage users from the command line.

Usage:
    python manage_users.py list                              # List all users
    python manage_users.py show <email>                      # Show user details
    python manage_users.py create <email> <password> <name>  # Create new user
    python manage_users.py delete <email>                    # Delete user
    python manage_users.py verify <email>                    # Manually verify user email
    python manage_users.py change-plan <email> <plan>        # Change user plan
    python manage_users.py reset-password <email> <new_password>  # Reset password
    python manage_users.py reset-quota <email>               # Reset monthly conversion quota
    python manage_users.py set-admin <email>                 # Make user admin (future)

Plans: free, starter, pro, enterprise
"""

import sys
import asyncio
from sqlalchemy import select
from tabulate import tabulate
from datetime import datetime

from app.database import AsyncSessionLocal
from app.models import User, UserPlan, SubscriptionStatus
from app.utils.auth import hash_password


async def list_users():
    """List all users in the system."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User))
        users = result.scalars().all()

        if not users:
            print("\nNo users found in the database.\n")
            return

        # Prepare table data
        table_data = []
        for user in users:
            table_data.append([
                user.email,
                user.name or "N/A",
                user.plan.value,
                "Yes" if user.email_verified else "No",
                f"{user.conversions_used}/{user.conversions_limit}",
                user.subscription_status.value if user.subscription_status else "N/A",
                user.created_at.strftime("%Y-%m-%d") if user.created_at else "N/A"
            ])

        headers = ["Email", "Name", "Plan", "Verified", "Conversions", "Sub Status", "Created"]
        print("\n" + tabulate(table_data, headers=headers, tablefmt="grid"))
        print(f"\nTotal users: {len(users)}\n")


async def show_user(email: str):
    """Show detailed information about a specific user."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if not user:
            print(f"\n[ERROR] User not found: {email}\n")
            return

        print("\n" + "="*60)
        print(f"USER DETAILS: {user.email}")
        print("="*60)
        print(f"ID:                    {user.id}")
        print(f"Name:                  {user.name or 'N/A'}")
        print(f"Email:                 {user.email}")
        print(f"Email Verified:        {'Yes' if user.email_verified else 'No'}")
        print(f"Plan:                  {user.plan.value}")
        print(f"Conversions Used:      {user.conversions_used}")
        print(f"Conversions Limit:     {user.conversions_limit}")
        print(f"Subscription ID:       {user.subscription_id or 'N/A'}")
        print(f"Subscription Status:   {user.subscription_status.value if user.subscription_status else 'N/A'}")
        print(f"Subscription End:      {user.subscription_end_date.strftime('%Y-%m-%d %H:%M:%S') if user.subscription_end_date else 'N/A'}")
        print(f"Created At:            {user.created_at.strftime('%Y-%m-%d %H:%M:%S') if user.created_at else 'N/A'}")
        print(f"Last Login:            {user.last_login.strftime('%Y-%m-%d %H:%M:%S') if user.last_login else 'Never'}")
        print("="*60 + "\n")


async def create_user(email: str, password: str, name: str):
    """Create a new user."""
    async with AsyncSessionLocal() as session:
        # Check if user already exists
        result = await session.execute(select(User).where(User.email == email))
        existing_user = result.scalar_one_or_none()

        if existing_user:
            print(f"\n[ERROR] User already exists: {email}\n")
            return

        # Create new user
        password_hash = hash_password(password)
        new_user = User(
            email=email,
            password_hash=password_hash,
            name=name,
            plan=UserPlan.FREE,
            conversions_used=0,
            conversions_limit=3,
            email_verified=False  # Will need manual verification or email
        )

        # Generate verification token
        new_user.generate_verification_token()

        session.add(new_user)
        await session.commit()
        await session.refresh(new_user)

        print(f"\n[SUCCESS] User created: {email}")
        print(f"  - ID: {new_user.id}")
        print(f"  - Plan: {new_user.plan.value}")
        print(f"  - Email Verified: No (use 'verify' command to manually verify)")
        print(f"  - Verification Token: {new_user.verification_token}")
        print("\n")


async def delete_user(email: str):
    """Delete a user from the system."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if not user:
            print(f"\n[ERROR] User not found: {email}\n")
            return

        # Confirm deletion
        print(f"\n[WARNING] You are about to delete user: {email}")
        print(f"  - Name: {user.name}")
        print(f"  - Plan: {user.plan.value}")
        print(f"  - Created: {user.created_at.strftime('%Y-%m-%d')}")

        confirm = input("\nType 'DELETE' to confirm: ")
        if confirm != "DELETE":
            print("\n[CANCELLED] User deletion cancelled.\n")
            return

        await session.delete(user)
        await session.commit()

        print(f"\n[SUCCESS] User deleted: {email}\n")


async def verify_user(email: str):
    """Manually verify a user's email address."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if not user:
            print(f"\n[ERROR] User not found: {email}\n")
            return

        if user.email_verified:
            print(f"\n[INFO] User email already verified: {email}\n")
            return

        user.verify_email()
        await session.commit()

        print(f"\n[SUCCESS] Email verified for user: {email}\n")


async def change_plan(email: str, plan: str):
    """Change a user's subscription plan."""
    # Validate plan
    try:
        new_plan = UserPlan(plan.lower())
    except ValueError:
        print(f"\n[ERROR] Invalid plan: {plan}")
        print(f"Valid plans: {', '.join([p.value for p in UserPlan])}\n")
        return

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if not user:
            print(f"\n[ERROR] User not found: {email}\n")
            return

        old_plan = user.plan
        user.plan = new_plan

        # Update conversion limits based on plan
        limits = {
            UserPlan.FREE: 3,
            UserPlan.STARTER: 100,
            UserPlan.PRO: 999999,  # Unlimited
            UserPlan.ENTERPRISE: 999999  # Unlimited
        }
        user.conversions_limit = limits[new_plan]

        # If downgrading and usage exceeds new limit, cap it
        if user.conversions_used > user.conversions_limit:
            user.conversions_used = user.conversions_limit

        user.updated_at = datetime.utcnow()
        await session.commit()

        print(f"\n[SUCCESS] Plan changed for {email}")
        print(f"  - Old Plan: {old_plan.value}")
        print(f"  - New Plan: {new_plan.value}")
        print(f"  - New Limit: {user.conversions_limit} conversions/month\n")


async def reset_password(email: str, new_password: str):
    """Reset a user's password."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if not user:
            print(f"\n[ERROR] User not found: {email}\n")
            return

        # Hash new password
        user.password_hash = hash_password(new_password)
        user.updated_at = datetime.utcnow()

        # Clear any existing reset tokens
        user.password_reset_token = None
        user.password_reset_token_expires = None

        await session.commit()

        print(f"\n[SUCCESS] Password reset for user: {email}\n")


async def reset_quota(email: str):
    """Reset a user's monthly conversion quota to zero."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if not user:
            print(f"\n[ERROR] User not found: {email}\n")
            return

        old_usage = user.conversions_used
        user.conversions_used = 0
        user.updated_at = datetime.utcnow()
        await session.commit()

        print(f"\n[SUCCESS] Quota reset for user: {email}")
        print(f"  - Old Usage: {old_usage}/{user.conversions_limit}")
        print(f"  - New Usage: 0/{user.conversions_limit}\n")


def print_usage():
    """Print usage instructions."""
    print(__doc__)


async def main():
    """Main entry point for CLI tool."""
    if len(sys.argv) < 2:
        print_usage()
        return

    command = sys.argv[1].lower()

    try:
        if command == "list":
            await list_users()

        elif command == "show":
            if len(sys.argv) != 3:
                print("\n[ERROR] Usage: python manage_users.py show <email>\n")
                return
            await show_user(sys.argv[2])

        elif command == "create":
            if len(sys.argv) != 5:
                print("\n[ERROR] Usage: python manage_users.py create <email> <password> <name>\n")
                return
            await create_user(sys.argv[2], sys.argv[3], sys.argv[4])

        elif command == "delete":
            if len(sys.argv) != 3:
                print("\n[ERROR] Usage: python manage_users.py delete <email>\n")
                return
            await delete_user(sys.argv[2])

        elif command == "verify":
            if len(sys.argv) != 3:
                print("\n[ERROR] Usage: python manage_users.py verify <email>\n")
                return
            await verify_user(sys.argv[2])

        elif command == "change-plan":
            if len(sys.argv) != 4:
                print("\n[ERROR] Usage: python manage_users.py change-plan <email> <plan>\n")
                print(f"Valid plans: {', '.join([p.value for p in UserPlan])}\n")
                return
            await change_plan(sys.argv[2], sys.argv[3])

        elif command == "reset-password":
            if len(sys.argv) != 4:
                print("\n[ERROR] Usage: python manage_users.py reset-password <email> <new_password>\n")
                return
            await reset_password(sys.argv[2], sys.argv[3])

        elif command == "reset-quota":
            if len(sys.argv) != 3:
                print("\n[ERROR] Usage: python manage_users.py reset-quota <email>\n")
                return
            await reset_quota(sys.argv[2])

        else:
            print(f"\n[ERROR] Unknown command: {command}\n")
            print_usage()

    except Exception as e:
        print(f"\n[ERROR] {str(e)}\n")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
