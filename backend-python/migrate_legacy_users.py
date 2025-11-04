"""
Migration script to update old user accounts with email verification tokens.

This script:
1. Finds users without verification tokens (legacy users)
2. Generates new verification tokens for them
3. Optionally sends verification emails
4. Updates database records

Usage:
    poetry run python migrate_legacy_users.py [--send-emails]

Options:
    --send-emails    Send verification emails to legacy users (default: False)
    --dry-run        Show what would be updated without making changes
"""

import asyncio
import argparse
from sqlalchemy import select
from datetime import datetime

from app.database import AsyncSessionLocal
from app.models import User
from app.services.email_service import send_verification_email
from app.utils.logger import get_logger

logger = get_logger(__name__)


async def migrate_legacy_users(send_emails: bool = False, dry_run: bool = False):
    """
    Migrate legacy users by adding verification tokens.

    Args:
        send_emails: Whether to send verification emails to users
        dry_run: If True, show changes without applying them
    """
    async with AsyncSessionLocal() as session:
        # Find users without verification tokens (legacy users)
        result = await session.execute(
            select(User).where(
                User.verification_token == None,
                User.email_verified == False
            )
        )
        legacy_users = result.scalars().all()

        total_users = len(legacy_users)

        if total_users == 0:
            logger.info("no_legacy_users_found")
            print("✓ No legacy users found that need migration")
            return

        logger.info(
            "legacy_users_found",
            count=total_users,
            dry_run=dry_run,
            send_emails=send_emails
        )
        print(f"\nFound {total_users} legacy user(s) without verification tokens")

        if dry_run:
            print("\n[DRY RUN] - No changes will be made\n")

        updated_count = 0
        emails_sent = 0
        errors = []

        for user in legacy_users:
            try:
                print(f"\nProcessing: {user.email}")
                print(f"  - User ID: {user.id}")
                print(f"  - Created: {user.created_at}")
                print(f"  - Email Verified: {user.email_verified}")

                if not dry_run:
                    # Generate verification token
                    token = user.generate_verification_token()
                    print(f"  - Generated Token: {token[:20]}...")

                    # Optionally send verification email
                    if send_emails:
                        try:
                            email_sent = await send_verification_email(
                                to_email=user.email,
                                user_name=user.name or user.email.split('@')[0],
                                verification_token=token
                            )
                            if email_sent:
                                emails_sent += 1
                                print(f"  ✓ Verification email sent")
                            else:
                                print(f"  ✗ Failed to send verification email")
                                errors.append(f"{user.email}: Email send failed")
                        except Exception as e:
                            print(f"  ✗ Email error: {str(e)}")
                            errors.append(f"{user.email}: {str(e)}")

                    updated_count += 1
                    print(f"  ✓ Token generated and saved")
                else:
                    print(f"  - [DRY RUN] Would generate token")
                    if send_emails:
                        print(f"  - [DRY RUN] Would send verification email")

        if not dry_run:
            # Commit all changes
            await session.commit()

            logger.info(
                "migration_completed",
                total_users=total_users,
                updated=updated_count,
                emails_sent=emails_sent,
                errors=len(errors)
            )

            print(f"\n{'='*60}")
            print(f"Migration Complete!")
            print(f"{'='*60}")
            print(f"Total legacy users found:  {total_users}")
            print(f"Users updated:             {updated_count}")
            if send_emails:
                print(f"Verification emails sent:  {emails_sent}")
            if errors:
                print(f"Errors:                    {len(errors)}")
                print(f"\nErrors details:")
                for error in errors:
                    print(f"  - {error}")
            print(f"{'='*60}\n")
        else:
            print(f"\n{'='*60}")
            print(f"DRY RUN Complete - No changes made")
            print(f"{'='*60}")
            print(f"Legacy users that would be updated: {total_users}")
            print(f"{'='*60}\n")


async def verify_migration():
    """Verify that all users have verification tokens."""
    async with AsyncSessionLocal() as session:
        # Count users without tokens
        result = await session.execute(
            select(User).where(
                User.verification_token == None,
                User.email_verified == False
            )
        )
        users_without_tokens = result.scalars().all()

        # Count all users
        result = await session.execute(select(User))
        total_users = len(result.scalars().all())

        # Count verified users
        result = await session.execute(
            select(User).where(User.email_verified == True)
        )
        verified_users = len(result.scalars().all())

        print(f"\n{'='*60}")
        print(f"Migration Verification")
        print(f"{'='*60}")
        print(f"Total users:                      {total_users}")
        print(f"Verified users:                   {verified_users}")
        print(f"Unverified users with tokens:     {total_users - verified_users - len(users_without_tokens)}")
        print(f"Users missing tokens:             {len(users_without_tokens)}")

        if len(users_without_tokens) == 0:
            print(f"\n✓ All unverified users have verification tokens!")
        else:
            print(f"\n⚠ Some users still need migration")

        print(f"{'='*60}\n")


def main():
    parser = argparse.ArgumentParser(
        description="Migrate legacy users by adding verification tokens"
    )
    parser.add_argument(
        '--send-emails',
        action='store_true',
        help='Send verification emails to legacy users'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show what would be updated without making changes'
    )
    parser.add_argument(
        '--verify',
        action='store_true',
        help='Verify migration status without making changes'
    )

    args = parser.parse_args()

    print(f"\n{'='*60}")
    print(f"Legacy User Migration Script")
    print(f"{'='*60}\n")

    if args.verify:
        asyncio.run(verify_migration())
    else:
        asyncio.run(migrate_legacy_users(
            send_emails=args.send_emails,
            dry_run=args.dry_run
        ))


if __name__ == "__main__":
    main()
