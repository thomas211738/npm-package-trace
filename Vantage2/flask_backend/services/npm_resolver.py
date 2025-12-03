# resolves an npm package name to a github repo

import requests
from urllib.parse import urlparse

NPM_REGISTRY_URL = "https://registry.npmjs.org"


def resolve_repo_from_npm(package_name: str):
    """
    Given an npm package name, return:
      { "owner": "someuser", "repo": "somerepo" }
    or None if no GitHub repo can be found.
    """
    url = f"{NPM_REGISTRY_URL}/{package_name}"
    resp = requests.get(url, timeout=10)

    if resp.status_code != 200:
        raise RuntimeError(f"npm registry returned {resp.status_code} for package '{package_name}'")

    data = resp.json()

    # try top-level repository
    repo = data.get("repository") or {}
    repo_url = repo.get("url")

    # if missing, try latest version's repository field
    if not repo_url:
        dist_tags = data.get("dist-tags") or {}
        latest_version = dist_tags.get("latest")
        if latest_version:
            versions = data.get("versions") or {}
            version_info = versions.get(latest_version) or {}
            repo2 = version_info.get("repository") or {}
            repo_url = repo2.get("url")

    if not repo_url:
        return None

    # clean up repo url
    repo_url = repo_url.replace("git+", "").strip()
    if repo_url.endswith(".git"):
        repo_url = repo_url[:-4]

    parsed = urlparse(repo_url)
    parts = parsed.path.strip("/").split("/")

    # expect something like "/owner/repo"
    if len(parts) < 2:
        return None

    owner, repo = parts[0], parts[1]
    return {"owner": owner, "repo": repo}