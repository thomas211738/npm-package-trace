# flask backend for the npm package risk scanner
# - takes a package name + numcommits
# - resolves npm package to github repo
# - pulls recent commits + diffs from github
# - scores each commit using code-level heuristics (score_commit)
# - adds behavior-level heuristics:
#   - new_author, only one commit by this author in the window
#   - hibernating_author, long gap since author's last commit
#   - sudden_large_diff, this commit is huge compared to their normal size

from flask import Flask, request, jsonify
from flask_cors import CORS

from datetime import datetime
from collections import defaultdict
import statistics

from services.npm_resolver import resolve_npm_package
from services.github_commits import get_recent_commits_with_diffs
from risk.score_commit import score_commit


app = Flask(__name__)
CORS(app)  # allow your react frontend on a different port to call this


@app.route("/health", methods=["GET"])
def health():
    """Simple healthcheck endpoint."""
    return jsonify({"status": "ok"}), 200


@app.route("/scan", methods=["POST"])
def scan():
    """
    Main endpoint:
    - expects JSON: { "package": "colors", "numCommits": 60 }
    - returns risk-scored commits for that package's GitHub repo
    """
    data = request.get_json() or {}

    package = data.get("package")
    num_commits = data.get("numCommits") or data.get("num_commits") or 50

    try:
        num_commits = int(num_commits)
    except (TypeError, ValueError):
        num_commits = 50

    if not package:
        return jsonify({"error": "Missing 'package' field"}), 400

    # resolve npm package to github repo info
    try:
        repo = resolve_npm_package(package)
        owner = repo["owner"]
        repo_name = repo["repo"]
    except Exception as e:
        return (
            jsonify(
                {
                    "error": f"Could not resolve npm package '{package}' to a GitHub repo: {e}"
                }
            ),
            400,
        )

    # fetch recent commits and diffs
    try:
        commits = get_recent_commits_with_diffs(owner, repo_name, num_commits)
    except Exception as e:
        return (
            jsonify(
                {
                    "error": f"Failed to fetch commits from GitHub for {owner}/{repo_name}: {e}"
                }
            ),
            502,
        )

    if not commits:
        return (
            jsonify(
                {
                    "package": package,
                    "repo": repo,
                    "commits": [],
                    "note": "No commits returned from GitHub.",
                }
            ),
            200,
        )

    # build author history: dates and commit sizes
    author_dates = defaultdict(list)
    author_sizes = defaultdict(list)

    for c in commits:
        author_key = c.get("authorEmail") or c.get("authorName") or "unknown"

        date_str = c.get("date")
        if date_str:
            try:
                dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
                author_dates[author_key].append(dt)
            except ValueError:
                pass

        size = c.get("added_lines") or 0
        author_sizes[author_key].append(size)

    for key in author_dates:
        author_dates[key].sort()

    author_avg_size = {}
    for key, sizes in author_sizes.items():
        if sizes:
            try:
                author_avg_size[key] = statistics.mean(sizes)
            except statistics.StatisticsError:
                author_avg_size[key] = 0.0
        else:
            author_avg_size[key] = 0.0

    # score each commit: code-level + behavior-level heuristics
    results = []

    HIBERNATE_DAYS = 90        # "hibernating" if > 90 days since last commit
    LARGE_DIFF_MIN = 50        # only consider "large diff" if at least 50 added lines
    LARGE_DIFF_MULTIPLIER = 5  # sudden_large_diff if >= 5x author's average size

    for c in commits:
        sha = c["sha"]
        author_name = c.get("authorName")
        author_email = c.get("authorEmail")
        message = c.get("message")
        diff = c.get("diff") or ""
        date_str = c.get("date")
        added_lines = c.get("added_lines") or 0

        base = score_commit(diff)
        flags = list(base["flags"])
        score = base["score"]

        author_key = author_email or author_name or "unknown"

        # new_author: only one commit by this author in our window
        if author_key in author_dates and len(author_dates[author_key]) == 1:
            flags.append("new_author")
            score += 10

        # hibernating_author: long gap since the last commit by this author
        if date_str and author_key in author_dates and len(author_dates[author_key]) > 1:
            try:
                dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
                prev_dates = [d for d in author_dates[author_key] if d < dt]
                if prev_dates:
                    last_before = prev_dates[-1]
                    gap_days = (dt - last_before).days
                    if gap_days >= HIBERNATE_DAYS:
                        flags.append("hibernating_author")
                        score += 10
            except ValueError:
                pass

        # sudden_large_diff: this commit is huge vs this author's usual size
        avg_size = author_avg_size.get(author_key, 0.0)
        if (
            added_lines >= LARGE_DIFF_MIN
            and avg_size > 0
            and added_lines >= avg_size * LARGE_DIFF_MULTIPLIER
        ):
            flags.append("sudden_large_diff")
            score += 20

        # cap score + recompute level
        score = min(score, 100)

        if score >= 70:
            level = "high"
        elif score >= 30:
            level = "medium"
        else:
            level = "low"

        flags = sorted(set(flags))

        results.append(
            {
                "sha": sha,
                "authorName": author_name,
                "authorEmail": author_email,
                "message": message,
                "risk_score": score,
                "risk_level": level,
                "flags": flags,
            }
        )

    return jsonify(
        {
            "package": package,
            "repo": repo,
            "commits": results,
        }
    ), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)