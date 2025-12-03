// takes a git diff string and returns score (0-100), level (lown/medium/high), flags (heurisitic)

// each flag has weight, sum equals the score
const FLAG_WEIGHTS = {
    encoded_payload_eval: 40,      // H1
    new_postinstall_script: 35,    // H3
    child_process_network: 40,     // H4
    secret_fs_access: 35,          // H5
    infinite_loop_top_level: 50,   // H7
    new_dependency: 20             // H9
    // can add more later
  };
  
  // H1 – long encoded string + eval / Function
  function detectEncodedEval(diff) {
    const hasEval =
      diff.includes("eval(") ||
      diff.includes("Function(") ||
      diff.includes("new Function");
  
    // added long base64-ish or hex-ish string
    const longBase64 = /\+.*["'`][A-Za-z0-9+/=]{80,}["'`]/.test(diff);
    const longHex    = /\+.*["'`]0x[0-9a-fA-F]{80,}["'`]/.test(diff);
  
    return hasEval && (longBase64 || longHex);
  }
  
  // H3 – new postinstall / preinstall in package.json
  function detectNewPostinstall(diff) {
    // only look at added lines (+) matching "postinstall" or "preinstall"
    return /\+.*"postinstall"\s*:\s*"/.test(diff) ||
           /\+.*"preinstall"\s*:\s*"/.test(diff);
  }
  
  // H4 – child_process + network / external URL
  function detectChildProcessNetwork(diff) {
    const usesChildProcess =
      diff.includes("child_process.exec") ||
      diff.includes("child_process.spawn") ||
      diff.includes("execSync(") ||
      diff.includes("spawn(");
  
    const hasUrl =
      /https?:\/\/[^\s"']+/.test(diff) ||
      /curl\s+https?:\/\//.test(diff) ||
      /wget\s+https?:\/\//.test(diff) ||
      /Invoke-WebRequest/.test(diff);
  
    return usesChildProcess && hasUrl;
  }
  
  // H5 – FS access to secrets (.env, .ssh, id_rsa, etc.)
  function detectSecretFsAccess(diff) {
    if (!diff.includes("fs.")) return false;
  
    const secretPaths = [
      ".env", ".ssh", "id_rsa", "wallet",
      ".npmrc", "AppData", "Chrome", "Keychain"
    ];
  
    return secretPaths.some(s => diff.includes(s));
  }
  
  // H7 – infinite loop at top level
  function detectInfiniteLoopTopLevel(diff) {
    // any added while(true) or for(;;)
    return /\+.*while\s*\(\s*true\s*\)\s*{/.test(diff) ||
           /\+.*for\s*\(\s*;\s*;\s*\)\s*{/.test(diff);
  }
  
  // H9 – new dependency in package.json
  function detectNewDependency(diff) {
    // look for added lines in "dependencies" or "devDependencies"
    return /\+.*"dependencies"\s*:\s*{/.test(diff) ||
           /\+.*"devDependencies"\s*:\s*{/.test(diff) ||
           /\+.*"[^"]+"\s*:\s*"[0-9^~*.x]+"/.test(diff);
  }
  
  // main scoring function
  function scoreCommit({ diff, meta = {} }) {
    const flags = [];
  
    if (detectEncodedEval(diff))           flags.push("encoded_payload_eval");
    if (detectNewPostinstall(diff))       flags.push("new_postinstall_script");
    if (detectChildProcessNetwork(diff))  flags.push("child_process_network");
    if (detectSecretFsAccess(diff))       flags.push("secret_fs_access");
    if (detectInfiniteLoopTopLevel(diff)) flags.push("infinite_loop_top_level");
    if (detectNewDependency(diff))        flags.push("new_dependency");
  
    let score = 0;
    for (const f of flags) {
      score += FLAG_WEIGHTS[f] || 0;
    }
    if (score > 100) score = 100;
  
    const level =
      score >= 70 ? "high" :
      score >= 30 ? "medium" :
                    "low";
  
    return { score, level, flags };
  }
  
  module.exports = { scoreCommit };  