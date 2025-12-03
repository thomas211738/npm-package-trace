# talks to the github api to fetch commit history and diffs for a given repository

import os
import requests

GITHUB_API_BASE = "https://api.github.com"
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN")  # helps with rate limits


def _github_headers(accept_diff: bool = False):
    """
    Build headers for GitHub API requests.
    """
    headers = {
        "User-Agent": "npm-risk-scanner-python",
        "Accept": "application/vnd.github+json"
    }
    if accept_diff:
        headers["Accept"] = "application/vnd.github.v3.diff"
    if GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {GITHUB_TOKEN}"
    return headers


def get_recent_commits(owner: str, repo: str, n: int = 10):
    """
    Fetch the last n commits (basic info) from a GitHub repo.
    """
    url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}/commits"
    params = {"per_page": n}
    resp = requests.get(url, headers=_github_headers(), params=params, timeout=15)

    if resp.status_code != 200:
        raise RuntimeError(f"GitHub commits API returned {resp.status_code} for {owner}/{repo}")

    return resp.json()


def get_commit_diff(owner: str, repo: str, sha: str) -> str:
    """
    Fetch the raw diff for a specific commit SHA.
    """
    url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}/commits/{sha}"
    resp = requests.get(url, headers=_github_headers(accept_diff=True), timeout=15)

    if resp.status_code != 200:
        raise RuntimeError(
            f"GitHub diff API returned {resp.status_code} for {owner}/{repo}@{sha}"
        )

    return resp.text


def get_recent_commits_with_diffs(owner: str, repo: str, n: int = 10):
    """
    Fetch the last n commits, including:
    - sha
    - authorName
    - authorEmail
    - message
    - diff (raw text)
    """
    basic_commits = get_recent_commits(owner, repo, n)
    results = []

    for commit in basic_commits:
        sha = commit["sha"]
        commit_info = commit["commit"]
        author_info = commit_info.get("author") or {}

        author_name = author_info.get("name")
        author_email = author_info.get("email")
        message = commit_info.get("message")

        diff = get_commit_diff(owner, repo, sha)

        results.append({
            "sha": sha,
            "authorName": author_name,
            "authorEmail": author_email,
            "message": message,
            "diff": diff
        })

    return results