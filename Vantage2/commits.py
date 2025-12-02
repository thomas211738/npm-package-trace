import requests # library that allows HTTP requests to APIs

# npm registry contains metadata about npm packages 
NPM_REGISTRY = "https://registry.npmjs.org"

# request commit information
GITHUB_API = "https://api.github.com"

def get_github_repo_from_npm(package_name: str):
    # function to look up package on npm registry and extract the github repo
  
    # url to query the npm registry for the specific package
    url = f"{NPM_REGISTRY}/{package_name}"

    # send a GET request to the npm API
    resp = requests.get(url)

    # return an error if npm package not found
    if resp.status_code != 200:
        raise Exception(f"NPM package not found: {package_name}")

    # convert JSON response to a Python dictionary
    data = resp.json()

    # extract the "repository.url" field from package metadata
    repo_url = data.get("repository", {}).get("url", "")

    # no repo is provided in package.json then stop here.
    if not repo_url:
        raise Exception("No repository field found in package.json")

    # loop to clean the github repo from prefixes to get url in owner/repo format
    for prefix in (
        "git+https://github.com/",
        "https://github.com/",
        "git://github.com/",
    ):
        if repo_url.startswith(prefix):
            repo_url = repo_url[len(prefix):]  # strip prefix

    # remove the ".git" ending
    if repo_url.endswith(".git"):
        repo_url = repo_url[:-4]

    if "/" not in repo_url:
        raise Exception(f"Invalid repo URL: {repo_url}")

    # return the cleaned GitHub repo
    return repo_url


def fetch_latest_commits(repo: str, n: int = 10):
    # function to get latest n commits from github repo
    
    # split "owner/repo" into sep variables
    owner, name = repo.split("/")

    # github API URL to fetch commits
    url = f"{GITHUB_API}/repos/{owner}/{name}/commits?per_page={n}"

    # github API needs a User-Agent header
    headers = {"User-Agent": "commit-fetcher"}

    # send GET request to github
    resp = requests.get(url, headers=headers)
    
    if resp.status_code != 200:
        raise Exception(f"GitHub error {resp.status_code}: {resp.text}")

    return resp.json()

def run():
    
    # type in a package name
    package = input("Enter npm package name: ").strip()

    print("\nLooking up GitHub repo...")
    repo = get_github_repo_from_npm(package)
    print("Found repo:", repo)
    print(f"Found GitHub repo: {repo}")

    # get the 10 most recent commits
    commits = fetch_latest_commits(repo, n=10)

    # commit results
    print("\n=== Latest Commits ===\n")

    for c in commits:
        sha = c["sha"]                                   # commit hash
        msg = c["commit"]["message"].split("\n")[0]      # first line of commit message
        author = c["commit"]["author"]["name"]           # author name

        # short summary of each commit
        print(f"{sha[:7]} — {msg} (by {author})")

run()
