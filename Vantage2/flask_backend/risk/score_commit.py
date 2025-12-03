# heuristic-based risk scoring for a single commit diff, this is where we encode what we've seen in real npm attacks likeencoded payloads and eval, suspicious postinstall scripts, child_process and curl/wget, stealing env vars/secrets, infinite loops (sabotage), new dependencies in package.json

import re

def score_commit(diff: str):
    """
    Given a git diff (string), return a dict:
    {
      "score": int (0-100),
      "level": "low" | "medium" | "high",
      "flags": [string, ...]
    }
    """
    flags = []
    score = 0
    d = diff or ""
    lower = d.lower()

    # encoded payloads and eval or Function
    base64_like = re.findall(r"[A-Za-z0-9+/]{30,}={0,2}", d)
    has_hex_blob = re.search(r"0x[0-9a-fA-F]{16,}", d) is not None
    uses_eval = "eval(" in d or "Function(" in d or "new Function" in d

    if (base64_like or has_hex_blob) and uses_eval:
        flags.append("encoded_payload_eval")
        score += 50

    # suspicious postinstall/preinstall scripts
    if "postinstall" in lower or "preinstall" in lower:
        if "curl " in lower or "wget " in lower or "http://" in lower or "https://" in lower:
            flags.append("new_postinstall_script")
            score += 40

    # child_process and network calls (download & execute)
    uses_child_process = ("child_process" in lower or "exec(" in lower or "spawn(" in lower)
    uses_network = ("curl " in lower or "wget " in lower or "http://" in lower or "https://" in lower)

    if uses_child_process and uses_network:
        flags.append("child_process_network")
        score += 40

    # stealing env vars/secrets
    if "process.env" in d or ".env" in lower or ".ssh" in lower or "id_rsa" in lower:
        flags.append("secret_fs_access")
        score += 40

    # infinite loops/sabotage
    if "while (true)" in d or "for (;;)" in d:
        flags.append("infinite_loop_top_level")
        score += 40

    # new dependencies in package.json
    if "package.json" in d and '"dependencies"' in d:
        added_dep_lines = [
            line for line in d.splitlines()
            if line.strip().startswith("+") and ":" in line and '"' in line
        ]
        if added_dep_lines:
            flags.append("new_dependency")
            score += 20

    # cap total score at 100
    score = min(score, 100)

    if score >= 70:
        level = "high"
    elif score >= 30:
        level = "medium"
    else:
        level = "low"

    return {
        "score": score,
        "level": level,
        "flags": flags
    }