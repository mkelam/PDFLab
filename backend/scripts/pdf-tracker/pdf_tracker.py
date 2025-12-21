#!/usr/bin/env python3
"""
PDF Tracker - Reddit Post Monitor
Scans subreddits for PDF-related posts and user complaints about PDF tools.
"""

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

try:
    import praw
except ImportError:
    print("Error: praw library not installed. Run: pip install praw", file=sys.stderr)
    sys.exit(1)

# Configuration paths
SCRIPT_DIR = Path(__file__).parent
CONFIG_FILE = SCRIPT_DIR / "tracker_config.json"
RESULTS_FILE = SCRIPT_DIR / "tracker_results.json"

# Default configuration
DEFAULT_CONFIG = {
    "subreddits": ["GetMotivated", "LifeProTips", "GetStudying", "selfimprovement", "DecidingToBeBetter", "gtd"],
    "pdf_keywords": ["pdf", "ebook", "template", "download", "printable"],
    "complaint_keywords": ["wont load", "doesnt work", "cant open", "hate", "broken", "crash", "annoying", "frustrated"],
    "viral_threshold": 10
}


def load_config():
    """Load configuration from JSON file or use defaults."""
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            print(f"Warning: Could not load config file: {e}", file=sys.stderr)
    return DEFAULT_CONFIG


def save_results(results):
    """Save results to JSON file."""
    existing_reports = []

    if RESULTS_FILE.exists():
        try:
            with open(RESULTS_FILE, 'r') as f:
                data = json.load(f)
                existing_reports = data.get("reports", [])
        except (json.JSONDecodeError, IOError):
            pass

    # Add new report at the beginning
    existing_reports.insert(0, results)

    # Keep only last 30 reports
    existing_reports = existing_reports[:30]

    with open(RESULTS_FILE, 'w') as f:
        json.dump({"reports": existing_reports}, f, indent=2)


def get_reddit_client():
    """Create Reddit API client using environment variables."""
    client_id = os.environ.get("REDDIT_CLIENT_ID")
    client_secret = os.environ.get("REDDIT_CLIENT_SECRET")
    user_agent = os.environ.get("REDDIT_USER_AGENT", "PDFLab Tracker v1.0")

    if not client_id or not client_secret:
        print("Error: REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET environment variables required", file=sys.stderr)
        sys.exit(1)

    return praw.Reddit(
        client_id=client_id,
        client_secret=client_secret,
        user_agent=user_agent
    )


def search_subreddit(reddit, subreddit_name, config):
    """Search a subreddit for PDF-related posts and complaints."""
    results = {
        "subreddit": subreddit_name,
        "pdf_posts": [],
        "complaint_posts": [],
        "viral_posts": [],
        "total_posts_scanned": 0,
        "error": None
    }

    try:
        subreddit = reddit.subreddit(subreddit_name)

        # Search for PDF-related posts
        for keyword in config["pdf_keywords"]:
            try:
                for post in subreddit.search(keyword, limit=25, time_filter="week"):
                    results["total_posts_scanned"] += 1

                    post_data = {
                        "id": post.id,
                        "title": post.title,
                        "score": post.score,
                        "url": f"https://reddit.com{post.permalink}",
                        "created_utc": datetime.fromtimestamp(post.created_utc, tz=timezone.utc).isoformat(),
                        "num_comments": post.num_comments,
                        "keyword": keyword
                    }

                    # Check if it's a viral post
                    if post.score >= config["viral_threshold"]:
                        if not any(p["id"] == post.id for p in results["viral_posts"]):
                            results["viral_posts"].append(post_data)

                    # Add to PDF posts if not already present
                    if not any(p["id"] == post.id for p in results["pdf_posts"]):
                        results["pdf_posts"].append(post_data)

            except Exception as e:
                print(f"Warning: Error searching '{keyword}' in r/{subreddit_name}: {e}", file=sys.stderr)

        # Search for complaint posts
        for keyword in config["complaint_keywords"]:
            try:
                search_query = f"pdf {keyword}"
                for post in subreddit.search(search_query, limit=10, time_filter="week"):
                    post_data = {
                        "id": post.id,
                        "title": post.title,
                        "score": post.score,
                        "url": f"https://reddit.com{post.permalink}",
                        "created_utc": datetime.fromtimestamp(post.created_utc, tz=timezone.utc).isoformat(),
                        "num_comments": post.num_comments,
                        "complaint_keyword": keyword
                    }

                    if not any(p["id"] == post.id for p in results["complaint_posts"]):
                        results["complaint_posts"].append(post_data)

            except Exception as e:
                print(f"Warning: Error searching complaints in r/{subreddit_name}: {e}", file=sys.stderr)

    except Exception as e:
        results["error"] = str(e)
        print(f"Error accessing r/{subreddit_name}: {e}", file=sys.stderr)

    return results


def main():
    """Main entry point."""
    print("PDF Tracker starting...")

    # Load configuration
    config = load_config()
    print(f"Loaded config: {len(config['subreddits'])} subreddits, {len(config['pdf_keywords'])} keywords")

    # Initialize Reddit client
    reddit = get_reddit_client()
    print("Reddit API client initialized")

    # Collect results
    subreddit_results = []
    total_pdf_posts = 0
    total_complaint_posts = 0
    total_viral_posts = 0

    for subreddit_name in config["subreddits"]:
        print(f"Scanning r/{subreddit_name}...")
        result = search_subreddit(reddit, subreddit_name, config)
        subreddit_results.append(result)

        total_pdf_posts += len(result["pdf_posts"])
        total_complaint_posts += len(result["complaint_posts"])
        total_viral_posts += len(result["viral_posts"])

        print(f"  Found {len(result['pdf_posts'])} PDF posts, {len(result['complaint_posts'])} complaints, {len(result['viral_posts'])} viral")

    # Build report
    now = datetime.now(timezone.utc)
    report = {
        "date": now.strftime("%Y-%m-%d"),
        "generated": now.strftime("%Y-%m-%d %H:%M:%S"),
        "subreddits_monitored": config["subreddits"],
        "viral_threshold": config["viral_threshold"],
        "stats": {
            "total_pdf_posts": total_pdf_posts,
            "total_complaint_posts": total_complaint_posts,
            "total_viral_posts": total_viral_posts,
            "subreddits_scanned": len(config["subreddits"])
        },
        "subreddit_results": subreddit_results
    }

    # Save results
    save_results(report)
    print(f"\nReport saved to {RESULTS_FILE}")

    # Print summary
    print("\n=== Summary ===")
    print(f"Date: {report['date']}")
    print(f"Subreddits scanned: {len(config['subreddits'])}")
    print(f"Total PDF posts: {total_pdf_posts}")
    print(f"Total complaints: {total_complaint_posts}")
    print(f"Viral posts (score >= {config['viral_threshold']}): {total_viral_posts}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
