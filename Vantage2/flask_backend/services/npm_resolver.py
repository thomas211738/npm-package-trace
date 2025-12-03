# resolve an npm package name to a GitHub {owner, repo} pair by looking at the package metadata from the npm registry

import re
import requests

NPM_REGISTRY_URL = "https://registry.npmjs.org"


def resolve_npm_package(package_name: str):
    """
    Given an npm package name (e.g. "colors" or "event-stream"),
    return a dict like:

        { "owner": "someuser", "repo": "somerepo" }

    by reading the "repository" or "homepage" fields from the
    npm registry metadata and extracting the GitHub URL.
    """
    if not package_name:
        raise ValueError("package_name is required")

    url = f"{NPM_REGISTRY_URL}/{package_name}"
    resp = requests.get(url, timeout=10)

    if resp.status_code != 200:
        raise RuntimeError(
            f"npm registry returned {resp.status_code} for package '{package_name}'"
        )

    data = resp.json()

    # try "repository" field first
    repo_meta = data.get("repository") or {}
    repo_url = repo_meta.get("url") or ""

    # fallback: some packages only have "homepage" pointing to github
    if "github.com" not in repo_url.lower():
        homepage = data.get("homepage") or ""
        if "github.com" in homepage.lower():
            repo_url = homepage

    if not repo_url or "github.com" not in repo_url.lower():
        raise RuntimeError(
            f"Could not find a GitHub repository URL for npm package '{package_name}'"
        )

    # extract "owner/repo" from URLs 
    m = re.search(r"github\.com[:/]+([^/]+)/([^/#\.]+)", repo_url)
    if not m:
        raise RuntimeError(
            f"Failed to parse GitHub owner/repo from URL '{repo_url}'"
        )

    owner = m.group(1)
    repo = m.group(2)

    return {"owner": owner, "repo": repo}