// gives npm package name, calls npm registry, reads repository field, parses out owner and repo for github

const https = require("https");

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, res => {
        let data = "";
        res.on("data", chunk => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });
}

// extract owner and repo from "git+https://github.com/user/repo.git"
function parseGithubRepoUrl(repoUrl) {
  if (!repoUrl) return null;

  // remove "git+" prefix and ".git" suffix
  repoUrl = repoUrl.replace(/^git\+/, "").replace(/\.git$/, "");

  // expect something like https://github.com/owner/repo
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) return null;

  return {
    owner: match[1],
    repo: match[2]
  };
}

// main function for npm name gives owner and repo
async function getGithubRepoFromNpm(pkgName) {
  const url = `https://registry.npmjs.org/${encodeURIComponent(pkgName)}`;
  const data = await fetchJson(url);

  const repoInfo = data.repository;
  if (!repoInfo || !repoInfo.url) {
    throw new Error("No repository info found in npm metadata");
  }

  const parsed = parseGithubRepoUrl(repoInfo.url);
  if (!parsed) {
    throw new Error("Repository URL is not a GitHub repo");
  }

  return parsed;
}

module.exports = { getGithubRepoFromNpm };