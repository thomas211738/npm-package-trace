// given the owner, repo, and n, uses github api to get the n latest commits, fetches the diff and returns array of sha, authorname, authoremail, message, diff

const https = require("https");

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || null;

function fetchGithub(path, { acceptDiff = false } = {}) {
  const options = {
    hostname: "api.github.com",
    path,
    method: "GET",
    headers: {
      "User-Agent": "npm-risk-scanner-project",
      "Accept": acceptDiff
        ? "application/vnd.github.v3.diff"
        : "application/vnd.github+json"
    }
  };

  if (GITHUB_TOKEN) {
    options.headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
  }

  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let data = "";
      res.on("data", chunk => (data += chunk));
      res.on("end", () => {
        if (acceptDiff) {
          // raw diff
          resolve(data);
        } else {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        }
      });
    });

    req.on("error", reject);
    req.end();
  });
}

// get last n commits basic info
async function getRecentCommits({ owner, repo, n = 10 }) {
  const path = `/repos/${owner}/${repo}/commits?per_page=${n}`;
  const data = await fetchGithub(path);
  return data; // array of commits
}

// get diff for a specific commit sha
async function getCommitDiff({ owner, repo, sha }) {
  const path = `/repos/${owner}/${repo}/commits/${sha}`;
  const diff = await fetchGithub(path, { acceptDiff: true });
  return diff;
}

// get last n commits with diffs
async function getRecentCommitsWithDiffs({ owner, repo, n = 10 }) {
  const commits = await getRecentCommits({ owner, repo, n });

  const results = [];
  for (const c of commits) {
    const sha = c.sha;
    const authorName = c.commit.author.name;
    const authorEmail = c.commit.author.email;
    const message = c.commit.message;

    const diff = await getCommitDiff({ owner, repo, sha });

    results.push({
      sha,
      authorName,
      authorEmail,
      message,
      diff
    });
  }

  return results;
}

// export getCommitDiff so evaluation script can use it
module.exports = {
    getRecentCommitsWithDiffs,
    getCommitDiff
  };
  