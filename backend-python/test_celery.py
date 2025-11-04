"""Test script to verify Celery job queue is working."""
import asyncio
import time
from pathlib import Path

from app.celery_app import celery_app, debug_task
from app.services.job_queue import JobQueueService


def test_celery_connection():
    """Test basic Celery connection."""
    print("\n[TEST] Testing Celery connection...")

    try:
        # Inspect workers
        inspect = celery_app.control.inspect()
        active = inspect.active()

        if active:
            print(f"[PASS] Celery workers are running: {list(active.keys())}")
            return True
        else:
            print("[FAIL] No Celery workers found")
            print("       Start worker with: poetry run celery -A app.celery_app worker --loglevel=info")
            return False
    except Exception as e:
        print(f"[FAIL] Celery connection failed: {e}")
        return False


def test_debug_task():
    """Test debug task execution."""
    print("\n[TEST] Testing debug task execution...")

    try:
        # Queue debug task
        result = debug_task.delay()
        print(f"[INFO] Task queued with ID: {result.id}")

        # Wait for result (timeout 10 seconds)
        task_result = result.get(timeout=10)
        print(f"[PASS] Debug task completed: {task_result}")
        return True
    except Exception as e:
        print(f"[FAIL] Debug task failed: {e}")
        return False


def test_job_queue_service():
    """Test JobQueueService."""
    print("\n[TEST] Testing JobQueueService...")

    try:
        # Test getting worker stats
        stats = JobQueueService.get_worker_stats()

        if stats.get("error"):
            print(f"[WARN] Could not get worker stats: {stats['error']}")
            return False

        print(f"[PASS] Worker stats retrieved")
        if stats.get("active_tasks"):
            print(f"       Active tasks: {len(stats['active_tasks'])}")
        if stats.get("registered_tasks"):
            for worker, tasks in stats['registered_tasks'].items():
                print(f"       Worker {worker}: {len(tasks)} registered tasks")

        return True
    except Exception as e:
        print(f"[FAIL] JobQueueService test failed: {e}")
        return False


def test_task_status():
    """Test task status tracking."""
    print("\n[TEST] Testing task status tracking...")

    try:
        # Queue a debug task
        result = debug_task.delay()
        task_id = result.id

        print(f"[INFO] Task ID: {task_id}")

        # Check status immediately
        status = JobQueueService.get_task_status(task_id)
        print(f"[INFO] Initial status: {status['state']}")

        # Wait and check again
        time.sleep(2)
        status = JobQueueService.get_task_status(task_id)
        print(f"[INFO] Final status: {status['state']}")

        if status['ready'] and status['successful']:
            print(f"[PASS] Task completed successfully")
            print(f"       Result: {status.get('result')}")
            return True
        else:
            print(f"[WARN] Task not completed or failed")
            return False
    except Exception as e:
        print(f"[FAIL] Task status test failed: {e}")
        return False


def main():
    """Run all Celery tests."""
    print("=" * 60)
    print("CELERY JOB QUEUE TEST SUITE")
    print("=" * 60)

    tests = [
        ("Celery Connection", test_celery_connection),
        ("Debug Task", test_debug_task),
        ("JobQueueService", test_job_queue_service),
        ("Task Status Tracking", test_task_status),
    ]

    results = []
    for name, test_func in tests:
        try:
            passed = test_func()
            results.append((name, passed))
        except Exception as e:
            print(f"\n[ERROR] Test '{name}' crashed: {e}")
            results.append((name, False))

    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)

    passed_count = sum(1 for _, passed in results if passed)
    total_count = len(results)

    for name, passed in results:
        status = "[PASS]" if passed else "[FAIL]"
        print(f"{status} {name}")

    print(f"\nPassed: {passed_count}/{total_count}")

    if passed_count == total_count:
        print("\n[SUCCESS] All tests passed!")
    else:
        print(f"\n[WARNING] {total_count - passed_count} test(s) failed")

    print("\nNOTE: Make sure Celery worker is running:")
    print("  poetry run celery -A app.celery_app worker --loglevel=info --pool=solo")


if __name__ == "__main__":
    main()
