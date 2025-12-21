"""
Daily Viral Productivity PDF Tracker

Scrapes Reddit subreddits for viral posts mentioning PDFs,
with a focus on identifying complaints and negative sentiment.

Usage:
    python pdf_tracker.py

Output:
    Saves results to tracker_results.json for web display
"""

import praw
import configparser
import datetime
import re
import os
import time
import json

# Script directory
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
RESULTS_FILE = os.path.join(SCRIPT_DIR, 'tracker_results.json')

# Load Reddit config
config = configparser.ConfigParser()
config_path = os.path.join(SCRIPT_DIR, 'config.ini')
config.read(config_path)

reddit = praw.Reddit(
    client_id=config['reddit']['client_id'],
    client_secret=config['reddit']['client_secret'],
    username=config['reddit']['username'],
    password=config['reddit']['password'],
    user_agent=config['reddit']['user_agent']
)


def load_tracker_config():
    """Load tracker configuration from JSON file."""
    config_file = os.path.join(SCRIPT_DIR, 'tracker_config.json')
    if os.path.exists(config_file):
        with open(config_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    # Default configuration
    return {
        "subreddits": ["productivity", "GetMotivated", "LifeProTips"],
        "pdf_keywords": ["pdf", "ebook", "printable"],
        "complaint_keywords": ["hate", "broken", "crash", "problem"],
        "viral_threshold": 10
    }


def load_results():
    """Load existing results from JSON file."""
    if os.path.exists(RESULTS_FILE):
        with open(RESULTS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {"reports": []}


def save_results(results):
    """Save results to JSON file."""
    with open(RESULTS_FILE, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)


# Load dynamic configuration
TRACKER_CONFIG = load_tracker_config()
SUBREDDITS = TRACKER_CONFIG.get('subreddits', [])
PDF_KEYWORDS = TRACKER_CONFIG.get('pdf_keywords', [])
COMPLAINT_KEYWORDS = TRACKER_CONFIG.get('complaint_keywords', [])
VIRAL_THRESHOLD = TRACKER_CONFIG.get('viral_threshold', 10)


def has_pdf_mention(text: str) -> bool:
    """Check if text contains PDF-related keywords."""
    if not text:
        return False
    text_lower = text.lower()
    for keyword in PDF_KEYWORDS:
        if re.search(r'\b' + re.escape(keyword) + r'\b', text_lower):
            return True
    return False


def is_complaint(text: str) -> bool:
    """Check if text contains complaint/negative sentiment keywords."""
    if not text:
        return False
    text_lower = text.lower()
    for keyword in COMPLAINT_KEYWORDS:
        if keyword in text_lower:
            return True
    return False


def get_complaint_keywords_found(text: str) -> list:
    """Return list of complaint keywords found in text."""
    if not text:
        return []
    text_lower = text.lower()
    found = []
    for keyword in COMPLAINT_KEYWORDS:
        if keyword in text_lower:
            found.append(keyword)
    return found


def get_pdf_keywords_found(text: str) -> list:
    """Return list of PDF keywords found in text."""
    if not text:
        return []
    text_lower = text.lower()
    found = []
    for keyword in PDF_KEYWORDS:
        if re.search(r'\b' + re.escape(keyword) + r'\b', text_lower):
            found.append(keyword)
    return found


def fetch_daily_posts() -> dict:
    """
    Fetch posts from the last 24 hours mentioning PDFs.

    Returns:
        Dictionary with report data for JSON storage.
    """
    today = datetime.date.today().isoformat()
    yesterday_timestamp = (datetime.datetime.now() - datetime.timedelta(days=1)).timestamp()

    # Statistics counters
    stats = {
        'total_posts_scanned': 0,
        'pdf_posts_found': 0,
        'complaints_found': 0,
        'comments_with_pdf': 0,
        'comments_with_complaints': 0,
    }

    subreddit_results = []

    for sub_name in SUBREDDITS:
        sub_data = {
            'name': sub_name,
            'posts': [],
            'error': None
        }

        try:
            subreddit = reddit.subreddit(sub_name)
            print(f"Scanning r/{sub_name}...")

            # Fetch hot posts from last 24 hours
            for submission in subreddit.hot(limit=50):
                stats['total_posts_scanned'] += 1

                # Skip older posts
                if submission.created_utc < yesterday_timestamp:
                    continue

                # Skip posts below viral threshold
                if submission.score < VIRAL_THRESHOLD:
                    continue

                title = submission.title
                body = submission.selftext if submission.selftext else ""
                url = f"https://reddit.com{submission.permalink}"
                combined_text = f"{title} {body}"

                # Check title and body for PDF mentions
                if has_pdf_mention(combined_text):
                    stats['pdf_posts_found'] += 1

                    pdf_keywords_found = get_pdf_keywords_found(combined_text)
                    is_post_complaint = is_complaint(combined_text)
                    complaint_keywords = get_complaint_keywords_found(combined_text) if is_post_complaint else []

                    if is_post_complaint:
                        stats['complaints_found'] += 1

                    post_data = {
                        'title': title,
                        'url': url,
                        'score': submission.score,
                        'num_comments': submission.num_comments,
                        'content_preview': body[:300] if body else None,
                        'pdf_keywords': pdf_keywords_found,
                        'is_complaint': is_post_complaint,
                        'complaint_keywords': complaint_keywords,
                        'comments': []
                    }

                    # Fetch top comments and check
                    try:
                        submission.comments.replace_more(limit=0)
                        comments_checked = 0

                        for comment in submission.comments.list():
                            if comments_checked >= 30:
                                break
                            if not hasattr(comment, 'body'):
                                continue

                            if has_pdf_mention(comment.body):
                                stats['comments_with_pdf'] += 1
                                comment_is_complaint = is_complaint(comment.body)

                                comment_data = {
                                    'body': comment.body[:300],
                                    'score': comment.score,
                                    'is_complaint': comment_is_complaint,
                                    'complaint_keywords': get_complaint_keywords_found(comment.body) if comment_is_complaint else [],
                                }
                                post_data['comments'].append(comment_data)

                                if comment_is_complaint:
                                    stats['comments_with_complaints'] += 1

                            comments_checked += 1

                    except Exception as e:
                        post_data['comments_error'] = str(e)

                    sub_data['posts'].append(post_data)

            # Rate limit safety
            time.sleep(1)

        except Exception as e:
            sub_data['error'] = str(e)
            print(f"Error scanning r/{sub_name}: {e}")

        subreddit_results.append(sub_data)

    # Create report object
    report = {
        'date': today,
        'generated': datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'subreddits_monitored': SUBREDDITS,
        'viral_threshold': VIRAL_THRESHOLD,
        'stats': stats,
        'subreddit_results': subreddit_results
    }

    # Load existing results and add new report
    results = load_results()

    # Remove existing report for today if exists (to allow re-running)
    results['reports'] = [r for r in results['reports'] if r['date'] != today]

    # Add new report at the beginning
    results['reports'].insert(0, report)

    # Keep only last 30 days of reports
    results['reports'] = results['reports'][:30]

    # Save results
    save_results(results)

    # Generate standalone HTML results file
    generate_html_results(results)

    print(f"\n[OK] Results saved to: {RESULTS_FILE}")
    print(f"\nSummary:")
    print(f"   - Posts scanned: {stats['total_posts_scanned']}")
    print(f"   - PDF posts found: {stats['pdf_posts_found']}")
    print(f"   - Complaints detected: {stats['complaints_found']}")

    return report


def generate_html_results(results):
    """Generate a standalone HTML file with embedded results data."""
    html_file = os.path.join(SCRIPT_DIR, 'tracker_results.html')

    reports = results.get('reports', [])
    current_report = reports[0] if reports else None

    html_content = '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tracker Results - PDFLab.Pro</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --background: oklch(0.05 0 0);
            --foreground: oklch(0.95 0 0);
            --card: oklch(0 0 0 / 0.5);
            --primary: oklch(0.6 0.1 180);
            --secondary: oklch(0.12 0 0);
            --muted-foreground: oklch(0.65 0 0);
            --border: oklch(1 0 0 / 0.15);
            --success: oklch(0.5 0.15 145);
            --warning: oklch(0.6 0.15 85);
            --destructive: oklch(0.5 0.2 25);
            --radius: 0.75rem;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--background);
            min-height: 100vh;
            color: var(--foreground);
            padding: 24px;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        h1 { font-size: 1.75rem; font-weight: 700; margin-bottom: 8px; }
        .subtitle { color: var(--muted-foreground); font-size: 0.95rem; margin-bottom: 24px; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px; }
        .stat-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; text-align: center; }
        .stat-value { font-size: 2rem; font-weight: 700; color: var(--primary); line-height: 1; margin-bottom: 8px; }
        .stat-value.zero { color: var(--muted-foreground); }
        .stat-value.success { color: var(--success); }
        .stat-value.warning { color: var(--warning); }
        .stat-label { font-size: 0.85rem; color: var(--muted-foreground); }
        .card { background: var(--card); border-radius: var(--radius); border: 1px solid var(--border); overflow: hidden; margin-bottom: 24px; }
        .card-header { padding: 16px 20px; border-bottom: 1px solid var(--border); font-weight: 600; }
        .card-body { padding: 20px; }
        .subreddit-section { margin-bottom: 24px; }
        .subreddit-header { display: flex; align-items: center; gap: 8px; font-size: 1.1rem; font-weight: 600; color: var(--primary); margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }
        .badge { background: var(--secondary); padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; color: var(--muted-foreground); }
        .no-posts { color: var(--muted-foreground); font-style: italic; padding: 12px; background: var(--secondary); border-radius: 8px; }
        .error-message { color: var(--destructive); padding: 12px; background: oklch(0.5 0.2 25 / 0.1); border-radius: 8px; }
        .post-card { background: var(--secondary); border: 1px solid var(--border); border-radius: 8px; padding: 16px; margin-bottom: 12px; }
        .post-card.complaint { border-left: 3px solid var(--warning); }
        .post-title { font-weight: 600; margin-bottom: 8px; }
        .post-title a { color: var(--foreground); text-decoration: none; }
        .post-title a:hover { color: var(--primary); }
        .post-meta { display: flex; gap: 16px; font-size: 0.85rem; color: var(--muted-foreground); margin-bottom: 12px; }
        .keywords-list { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
        .keyword-badge { background: oklch(0.6 0.1 180 / 0.2); color: var(--primary); padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; }
        .complaint-alert { background: oklch(0.6 0.15 85 / 0.1); border: 1px solid oklch(0.6 0.15 85 / 0.3); padding: 10px; border-radius: 6px; font-size: 0.85rem; color: var(--warning); margin-bottom: 12px; }
        .post-preview { color: var(--muted-foreground); font-size: 0.9rem; padding: 12px; background: oklch(0 0 0 / 0.3); border-radius: 6px; margin-bottom: 12px; }
        .comments-section { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border); }
        .comments-title { font-weight: 600; font-size: 0.9rem; margin-bottom: 8px; color: var(--muted-foreground); }
        .comment-item { padding: 10px; background: oklch(0 0 0 / 0.3); border-radius: 6px; margin-bottom: 8px; font-size: 0.85rem; }
        .comment-item.complaint { border-left: 2px solid var(--warning); }
        .comment-score { color: var(--muted-foreground); font-size: 0.75rem; margin-bottom: 4px; }
        .monitored-list { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
        .monitored-badge { background: var(--secondary); padding: 4px 10px; border-radius: 4px; font-size: 0.8rem; color: var(--muted-foreground); }
        .empty-state { text-align: center; padding: 60px 20px; color: var(--muted-foreground); }
        .report-selector { margin-bottom: 24px; }
        .report-selector select { background: var(--secondary); color: var(--foreground); border: 1px solid var(--border); padding: 8px 12px; border-radius: 6px; font-size: 0.9rem; }
    </style>
</head>
<body>
    <div class="container">
        <h1>PDF Tracker Results</h1>
        <p class="subtitle">Daily viral PDF tracking reports from Reddit</p>

        <div class="report-selector">
            <select id="reportSelect" onchange="showReport(this.value)">
'''

    # Add report options
    for i, report in enumerate(reports):
        selected = 'selected' if i == 0 else ''
        html_content += f'                <option value="{i}" {selected}>{report["date"]} - {report["stats"]["pdf_posts_found"]} posts found</option>\n'

    html_content += '''            </select>
        </div>

        <div id="reportContent"></div>
    </div>

    <script>
        const reports = ''' + json.dumps(reports, ensure_ascii=False) + ''';

        function showReport(index) {
            const report = reports[index];
            if (!report) {
                document.getElementById('reportContent').innerHTML = '<div class="empty-state"><h3>No Reports Yet</h3><p>Run the PDF tracker to generate reports.</p></div>';
                return;
            }

            let html = `
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value">${report.stats.total_posts_scanned}</div>
                        <div class="stat-label">Posts Scanned</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value ${report.stats.pdf_posts_found > 0 ? 'success' : 'zero'}">${report.stats.pdf_posts_found}</div>
                        <div class="stat-label">PDF Posts Found</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value ${report.stats.complaints_found > 0 ? 'warning' : 'zero'}">${report.stats.complaints_found}</div>
                        <div class="stat-label">Complaints</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value zero">${report.viral_threshold}+</div>
                        <div class="stat-label">Upvote Threshold</div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">Report: ${report.date} - Generated: ${report.generated}</div>
                    <div class="card-body">
                        <div class="monitored-list">
                            ${report.subreddits_monitored.map(s => `<span class="monitored-badge">r/${s}</span>`).join('')}
                        </div>
            `;

            for (const sub of report.subreddit_results) {
                html += `
                    <div class="subreddit-section">
                        <div class="subreddit-header">
                            r/${sub.name}
                            <span class="badge">${sub.posts.length} posts</span>
                        </div>
                `;

                if (sub.error) {
                    html += `<div class="error-message">Error: ${sub.error}</div>`;
                } else if (sub.posts.length === 0) {
                    html += `<div class="no-posts">No PDF-related viral posts in the last 24 hours.</div>`;
                } else {
                    for (const post of sub.posts) {
                        html += `
                            <div class="post-card ${post.is_complaint ? 'complaint' : ''}">
                                <div class="post-title"><a href="${post.url}" target="_blank">${post.title}</a></div>
                                <div class="post-meta">
                                    <span>${post.score} upvotes</span>
                                    <span>${post.num_comments} comments</span>
                                </div>
                        `;

                        if (post.pdf_keywords && post.pdf_keywords.length > 0) {
                            html += `<div class="keywords-list">${post.pdf_keywords.map(k => `<span class="keyword-badge">${k}</span>`).join('')}</div>`;
                        }

                        if (post.is_complaint) {
                            html += `<div class="complaint-alert">COMPLAINT DETECTED - Keywords: ${post.complaint_keywords.join(', ')}</div>`;
                        }

                        if (post.content_preview) {
                            html += `<div class="post-preview">${post.content_preview}...</div>`;
                        }

                        if (post.comments && post.comments.length > 0) {
                            html += `
                                <div class="comments-section">
                                    <div class="comments-title">Relevant Comments (${post.comments.length})</div>
                            `;
                            for (const comment of post.comments.slice(0, 5)) {
                                html += `
                                    <div class="comment-item ${comment.is_complaint ? 'complaint' : ''}">
                                        <div class="comment-score">Score: ${comment.score}</div>
                                        <div>${comment.body}...</div>
                                        ${comment.is_complaint ? `<div style="margin-top:6px;color:var(--warning);font-size:0.8rem;">Complaint: ${comment.complaint_keywords.join(', ')}</div>` : ''}
                                    </div>
                                `;
                            }
                            html += `</div>`;
                        }

                        html += `</div>`;
                    }
                }

                html += `</div>`;
            }

            html += `</div></div>`;
            document.getElementById('reportContent').innerHTML = html;
        }

        // Show first report on load
        showReport(0);
    </script>
</body>
</html>'''

    with open(html_file, 'w', encoding='utf-8') as f:
        f.write(html_content)

    print(f"[OK] HTML results saved to: {html_file}")


def main():
    """Main entry point."""
    print("=" * 50)
    print("Daily Viral Productivity PDF Tracker")
    print("=" * 50)
    print()

    try:
        # Verify Reddit connection
        print(f"Authenticated as: {reddit.user.me()}")
        print()
    except Exception as e:
        print(f"[ERROR] Authentication failed: {e}")
        print("Please check your config.ini credentials.")
        return

    fetch_daily_posts()


if __name__ == "__main__":
    main()
