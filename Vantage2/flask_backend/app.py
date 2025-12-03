# flask backend for scanning npm packages, given a package name, it ooks up the GitHub repo from the npm registry, fetches recent commits and diffs from github, runs simple risk heuristics on each commit, returns a json response with risk_score, risk_level, flags, etc.

from flask import Flask, request, jsonify
from flask_cors import CORS

from services.npm_resolver import resolve_repo_from_npm
from services.github_commits import get_recent_commits_with_diffs
from risk.score_commit import score_commit

app = Flask(__name__)
CORS(app)  # allow react frontend on a different port to call this api


@app.route("/scan", methods=["POST"])
def scan_package():
    """
    POST /scan
    Body (JSON):
    {
      "package": "event-stream",
      "numCommits": 30   # optional, defaults to 30
    }

    Returns JSON:
    {
      "package": "event-stream",
      "repo": { "owner": "dominictarr", "repo": "event-stream" },
      "commits": [
        {
          "sha": "...",
          "authorName": "...",
          "authorEmail": "...",
          "message": "...",
          "risk_score": 20,
          "risk_level": "low",
          "flags": ["new_dependency"]
        },
        ...
      ]
    }
    """
    data = request.get_json(silent=True) or {}
    package = data.get("package")
    num_commits = data.get("numCommits", 30)

    if not package:
        return jsonify({"error": "Missing 'package' in request body"}), 400

    # resolve npm package to github repo
    try:
        repo_info = resolve_repo_from_npm(package)
    except Exception as e:
        return jsonify({"error": f"Failed to resolve npm package: {str(e)}"}), 500

    if not repo_info:
        return jsonify({"error": f"Could not find GitHub repo for package '{package}'"}), 404

    owner = repo_info["owner"]
    repo = repo_info["repo"]

    # fetch recent commits + diffs from github
    try:
        commits = get_recent_commits_with_diffs(owner, repo, num_commits)
    except Exception as e:
        return jsonify({"error": f"Failed to fetch commits from GitHub: {str(e)}"}), 500

    # run risk scoring on each commit diff
    result_commits = []
    for c in commits:
        diff = c["diff"]
        score_info = score_commit(diff)

        result_commits.append({
            "sha": c["sha"],
            "authorName": c["authorName"],
            "authorEmail": c["authorEmail"],
            "message": c["message"],
            "risk_score": score_info["score"],
            "risk_level": score_info["level"],
            "flags": score_info["flags"]
        })

    # return combined JSON
    return jsonify({
        "package": package,
        "repo": repo_info,
        "commits": result_commits
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)