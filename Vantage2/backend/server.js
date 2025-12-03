// exposes post /scan, accepts package, lodash, numcommits, uses functions to resolve repo, fetch commits, score commits, returns json object with risk results

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const { getGithubRepoFromNpm } = require("./services/npmResolver");
const { getRecentCommitsWithDiffs } = require("./services/githubCommits");
const { scoreCommit } = require("./risk/scoreCommit");

const app = express();
app.use(bodyParser.json());
app.use(cors()); // allow react frontend on another port

// simple health check
app.get("/", (req, res) => {
  res.send("npm risk scanner backend is running");
});

// POST /scan, "package", "lodash", "numCommits"
app.post("/scan", async (req, res) => {
  const pkgName = req.body.package;
  const numCommits = req.body.numCommits || 10;

  if (!pkgName) {
    return res.status(400).json({ error: "Missing 'package' in body" });
  }

  try {
    // npm to GitHub repo
    const { owner, repo } = await getGithubRepoFromNpm(pkgName);

    // github, n recent commits and diffs
    const commits = await getRecentCommitsWithDiffs({
      owner,
      repo,
      n: numCommits
    });

    // score each commit
    const results = commits.map(c => {
      const scoring = scoreCommit({
        diff: c.diff,
        meta: {
          commitMessage: c.message,
          authorEmail: c.authorEmail,
          authorName: c.authorName
        }
      });

      return {
        sha: c.sha,
        authorName: c.authorName,
        authorEmail: c.authorEmail,
        message: c.message,
        risk_score: scoring.score,
        risk_level: scoring.level,
        flags: scoring.flags
      };
    });

    // return to frontend
    res.json({
      package: pkgName,
      repo: { owner, repo },
      commits: results
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message || "Internal error"
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});