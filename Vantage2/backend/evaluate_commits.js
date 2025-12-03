// evaluates how good our heuristics are using a labeled dataset in evaluation_commits.json, printts TP, FP, TN, FN, precision, recall

const fs = require("fs");
const path = require("path");

const { getCommitDiff } = require("./services/githubCommits");
const { scoreCommit } = require("./risk/scoreCommit");

// path to the labeled dataset
const DATASET_PATH = path.join(__dirname, "evaluation_commits.json");

// risk score threshold for calling a commit malicious
// you can play with this number (30, 50, 70)
const THRESHOLD = 70;

async function main() {
  // load labeled commits
  const raw = fs.readFileSync(DATASET_PATH, "utf8");
  const commits = JSON.parse(raw);

  let TP = 0;
  let FP = 0;
  let TN = 0;
  let FN = 0;

  for (const item of commits) {
    const { owner, repo, sha, label } = item;

    console.log(`\n=== Evaluating ${owner}/${repo}@${sha} (label=${label}) ===`);

    try {
      // get diff for this specific commit
      const diff = await getCommitDiff({ owner, repo, sha });

      // score the commit using our heuristics
      const result = scoreCommit({ diff });

      const score = result.score;
      const level = result.level;
      const flags = result.flags;

      console.log(`  risk_score: ${score}`);
      console.log(`  risk_level: ${level}`);
      console.log(`  flags: ${flags.join(", ") || "none"}`);

      // convert score into a predicted label
      const predicted = score >= THRESHOLD ? "malicious" : "benign";

      console.log(`  predicted: ${predicted}`);

      // update confusion matrix
      if (label === "malicious" && predicted === "malicious") TP++;
      else if (label === "benign" && predicted === "malicious") FP++;
      else if (label === "benign" && predicted === "benign") TN++;
      else if (label === "malicious" && predicted === "benign") FN++;
      else {
        console.warn("  [WARN] unexpected label:", label);
      }
    } catch (err) {
      console.error("  [ERROR] failed to evaluate commit:", err.message);
    }
  }

  // compute precision and recall
  const precision = TP + FP === 0 ? 0 : TP / (TP + FP);
  const recall = TP + FN === 0 ? 0 : TP / (TP + FN);

  console.log("\n==============================");
  console.log("EVALUATION RESULTS (THRESHOLD =", THRESHOLD + ")");
  console.log("==============================");
  console.log("TP (malicious correctly flagged):", TP);
  console.log("FP (benign wrongly flagged):     ", FP);
  console.log("TN (benign correctly ignored):   ", TN);
  console.log("FN (malicious missed):           ", FN);
  console.log("------------------------------");
  console.log("Precision =", precision.toFixed(3));
  console.log("Recall    =", recall.toFixed(3));
  console.log("==============================\n");
}

main();