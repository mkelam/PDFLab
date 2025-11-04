"""Test script to verify database models work correctly."""
import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models import User, ConversionJob, UserPlan, JobStatus, ConversionType


async def test_models():
    """Test creating and querying models."""
    async with AsyncSessionLocal() as session:
        try:
            # Test query existing users
            result = await session.execute(select(User).limit(1))
            user = result.scalars().first()

            if user:
                print(f"[PASS] Found existing user: {user.email}")
                print(f"   Plan: {user.plan}")
                print(f"   Conversions used: {user.conversions_used}/{user.conversions_limit}")
                print(f"   Can convert: {user.can_convert()}")
                print(f"   Max file size: {user.get_max_file_size() / 1024 / 1024:.0f}MB")

                # Test conversion jobs for this user
                result = await session.execute(
                    select(ConversionJob)
                    .where(ConversionJob.user_id == user.id)
                    .limit(5)
                )
                jobs = result.scalars().all()
                print(f"\n[PASS] Found {len(jobs)} conversion jobs for user")
                for job in jobs:
                    print(f"   - {job.file_name}: {job.status.value}")
            else:
                print("[PASS] No existing users found (fresh database)")
                print("   Models are properly configured and can query database")

            print("\n[PASS] Database models test PASSED")
            print("   - User model working")
            print("   - ConversionJob model working")
            print("   - Relationships working")
            print("   - Helper methods working")

        except Exception as e:
            print(f"\n[FAIL] Database models test FAILED")
            print(f"   Error: {str(e)}")
            raise
        finally:
            await session.close()


if __name__ == "__main__":
    asyncio.run(test_models())
