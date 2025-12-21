"""
PDF Tracker Configuration Server

A simple web interface to manage subreddits and keywords.

Usage:
    python config_server.py

Then open http://localhost:5000 in your browser.
"""

from flask import Flask, render_template, request, jsonify, redirect, url_for
import json
import os
import subprocess
import sys

app = Flask(__name__, static_folder='static')

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(SCRIPT_DIR, 'tracker_config.json')
RESULTS_FILE = os.path.join(SCRIPT_DIR, 'tracker_results.json')


def load_config():
    """Load configuration from JSON file."""
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {
        "subreddits": [],
        "pdf_keywords": [],
        "complaint_keywords": [],
        "viral_threshold": 10
    }


def save_config(config):
    """Save configuration to JSON file."""
    with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
        json.dump(config, f, indent=2)


def load_results():
    """Load results from JSON file."""
    if os.path.exists(RESULTS_FILE):
        with open(RESULTS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {"reports": []}


@app.route('/')
def index():
    """Main configuration page."""
    config = load_config()
    return render_template('config.html', config=config)


@app.route('/save', methods=['POST'])
def save():
    """Save configuration changes."""
    data = request.json

    config = {
        "subreddits": [s.strip() for s in data.get('subreddits', []) if s.strip()],
        "pdf_keywords": [k.strip() for k in data.get('pdf_keywords', []) if k.strip()],
        "complaint_keywords": [k.strip() for k in data.get('complaint_keywords', []) if k.strip()],
        "viral_threshold": int(data.get('viral_threshold', 10))
    }

    save_config(config)
    return jsonify({"status": "success", "message": "Configuration saved!"})


@app.route('/run', methods=['POST'])
def run_tracker():
    """Run the PDF tracker script."""
    try:
        script_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'pdf_tracker.py')
        result = subprocess.run(
            [sys.executable, script_path],
            capture_output=True,
            text=True,
            timeout=300
        )
        return jsonify({
            "status": "success" if result.returncode == 0 else "error",
            "output": result.stdout,
            "error": result.stderr
        })
    except subprocess.TimeoutExpired:
        return jsonify({"status": "error", "message": "Script timed out after 5 minutes"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


@app.route('/add/<category>', methods=['POST'])
def add_item(category):
    """Add an item to a category."""
    config = load_config()
    item = request.json.get('item', '').strip()

    if not item:
        return jsonify({"status": "error", "message": "Item cannot be empty"})

    if category in config and item not in config[category]:
        config[category].append(item)
        save_config(config)
        return jsonify({"status": "success", "message": f"Added '{item}' to {category}"})

    return jsonify({"status": "error", "message": "Item already exists or invalid category"})


@app.route('/remove/<category>', methods=['POST'])
def remove_item(category):
    """Remove an item from a category."""
    config = load_config()
    item = request.json.get('item', '').strip()

    if category in config and item in config[category]:
        config[category].remove(item)
        save_config(config)
        return jsonify({"status": "success", "message": f"Removed '{item}' from {category}"})

    return jsonify({"status": "error", "message": "Item not found"})


@app.route('/results')
def results():
    """View tracker results."""
    results_data = load_results()
    reports = results_data.get('reports', [])
    selected_date = request.args.get('date')

    current_report = None

    if reports:
        if not selected_date:
            selected_date = reports[0]['date']

        for r in reports:
            if r['date'] == selected_date:
                current_report = r
                break

    return render_template('results.html',
                          reports=reports,
                          current_report=current_report,
                          selected_date=selected_date)


@app.route('/api/results')
def api_results():
    """Get all results as JSON."""
    results_data = load_results()
    return jsonify(results_data)


@app.route('/api/report/<date>')
def get_report(date):
    """Get report content as JSON."""
    results_data = load_results()
    for report in results_data.get('reports', []):
        if report['date'] == date:
            return jsonify({
                'status': 'success',
                'report': report
            })
    return jsonify({'status': 'error', 'message': 'Report not found'})


if __name__ == '__main__':
    # Create templates directory if it doesn't exist
    templates_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'templates')
    os.makedirs(templates_dir, exist_ok=True)

    print("=" * 50)
    print("PDF Tracker Configuration Server")
    print("=" * 50)
    print()
    print("Open http://localhost:5000 in your browser")
    print("Press Ctrl+C to stop the server")
    print()

    app.run(debug=True, port=5000)
