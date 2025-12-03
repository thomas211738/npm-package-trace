# talks to the github api to fetch commit history and diffs for a given repository

import os
import requests

GITHUB_API_BASE = "https://api.github.com"
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN")  # helps with rate limits


def _github_headers(accept_diff: bool = False):
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
    Fetch the last n commits. If n > 100, fetch multiple pages.
    GitHub paginates commits 100 at a time.
    """
    commits = []
    page = 1

    while len(commits) < n:
        remaining = n - len(commits)
        per_page = min(remaining, 100)  # GitHub max

        url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}/commits"
        params = {"per_page": per_page, "page": page}

        resp = requests.get(url, headers=_github_headers(), params=params, timeout=15)
        if resp.status_code != 200:
            raise RuntimeError(
                f"GitHub commits API returned {resp.status_code} for {owner}/{repo}"
            )

        page_commits = resp.json()
        if not page_commits:
            break  # no more commits available

        commits.extend(page_commits)
        page += 1

    return commits[:n]


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
    Fetch last n commits and attach diffs.
    """
    basic_commits = get_recent_commits(owner, repo, n)
    results = []

    for commit in basic_commits:
        sha = commit["sha"]
        commit_info = commit["commit"]
        author_info = commit_info.get("author") or {}

        diff = get_commit_diff(owner, repo, sha)

        results.append({
            "sha": sha,
            "authorName": author_info.get("name"),
            "authorEmail": author_info.get("email"),
            "message": commit_info.get("message"),
            "diff": diff,
        })

    return results
