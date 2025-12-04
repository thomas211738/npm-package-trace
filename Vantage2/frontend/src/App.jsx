import { useState, useEffect, useRef } from "react";
import warningImg from "./assets/man_shooting.png";

// map raw flag ids from backend to readable labels
const FLAG_LABELS = {
  encoded_payload_eval: "Encoded script + dangerous eval",
  new_postinstall_script: "Suspicious install script downloading code",
  child_process_network: "Downloads and executes external code",
  secret_fs_access: "Accessing env vars or SSH keys",
  infinite_loop_top_level: "Infinite loop at top level (possible sabotage)",
  new_dependency: "New dependency added to package.json",
  new_author: "Completely new contributor in this window",
  hibernating_author: "Dormant author suddenly returned after a long gap",
  sudden_large_diff: "Unusually large code change vs this author’s normal",
};

const getScoreColor = (score) => {
  if (score <= 9) return "bg-green-100 text-green-800";
  if (score <= 60) return "bg-yellow-100 text-yellow-800";
  return "bg-red-100 text-red-800";
};

const getFlagColor = (flagId) => {
  const key = (flagId || "").toLowerCase();

  if (key.includes("dependency")) return "bg-blue-100 text-blue-800";
  if (key.includes("encoded")) return "bg-purple-100 text-purple-800";
  if (key.includes("postinstall") || key.includes("suspicious"))
    return "bg-red-100 text-red-800";
  if (key.includes("child_process") || key.includes("network"))
    return "bg-red-100 text-red-800";
  if (key.includes("secret") || key.includes("env") || key.includes("ssh"))
    return "bg-orange-100 text-orange-800";
  if (key.includes("infinite") || key.includes("loop"))
    return "bg-pink-100 text-pink-800";
  if (key.includes("author") || key.includes("dormant"))
    return "bg-indigo-100 text-indigo-800";
  if (key.includes("large") || key.includes("diff"))
    return "bg-pink-100 text-pink-800";

  return "bg-gray-200 text-gray-700";
};

function App() {
  // dependencies panel state
  const [dependencies, setDependencies] = useState(null);
  const [depsLoading, setDepsLoading] = useState(false);
  const [depsError, setDepsError] = useState(null);

  // main scan state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [commitDepth, setCommitDepth] = useState(10);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const [scanResults, setScanResults] = useState(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState(null);
  const [activeCommit, setActiveCommit] = useState(null);

  // search npm as user types
  useEffect(() => {
    const searchPackages = async () => {
      if (query.length < 2) {
        setResults([]);
        setShowDropdown(false);
        return;
      }
      setIsLoading(true);
      setShowDropdown(true);
      try {
        const response = await fetch(
          `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(
            query
          )}&size=5`
        );
        const data = await response.json();
        setResults(data.objects || []);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(searchPackages, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // close dropdown when clicking outside
  useEffect(() => {
    const handler = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // fetch dependencies for selected package
  const fetchDependencies = async (packageName) => {
    setDepsLoading(true);
    setDepsError(null);
    setDependencies(null);

    try {
      const res = await fetch(
        `https://registry.npmjs.org/${encodeURIComponent(packageName)}`
      );
      if (!res.ok) throw new Error(`Registry error: ${res.status}`);

      const data = await res.json();
      const latestTag = data["dist-tags"]?.latest;
      const latestMeta = latestTag && data.versions?.[latestTag];
      const deps = latestMeta?.dependencies || {};
      setDependencies(deps);
    } catch (err) {
      setDepsError(err.message || "Failed to load dependencies");
      setDependencies(null);
    } finally {
      setDepsLoading(false);
    }
  };

  const handleSelectPackage = (pkg) => {
    setQuery(pkg.package.name);
    setSelectedPackage(pkg.package);
    setShowDropdown(false);
    setScanResults(null);
    setScanError(null);
    setActiveCommit(null);

    fetchDependencies(pkg.package.name);
  };

  const handleSearch = async () => {
    if (!selectedPackage?.name) return;

    setScanLoading(true);
    setScanError(null);
    setScanResults(null);
    setActiveCommit(null);

    try {
      const res = await fetch("http://localhost:5001/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          package: selectedPackage.name,
          numCommits: commitDepth || 10,
        }),
      });

      if (!res.ok) throw new Error(`Backend error: ${res.status}`);

      const data = await res.json();
      setScanResults(data);
    } catch (err) {
      setScanError(err.message);
    } finally {
      setScanLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  const getCommitUrl = (sha) => {
    if (!selectedPackage?.links?.repository) return null;
    let url = selectedPackage.links.repository;
    url = url.replace(/^git\+/, "").replace(/\.git$/, "");
    if (!url.startsWith("http")) {
      url = `https://${url}`;
    }
    return `${url}/commit/${sha}`;
  };

  // helper to pick a date field safely and format it
  const formatCommitDate = (commit) => {
    const raw =
      commit.authorDate ||
      commit.date ||
      commit.commitDate ||
      commit.timestamp ||
      null;
    if (!raw) return "Unknown";
    try {
      return new Date(raw).toLocaleString();
    } catch {
      return raw;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-10">
      <h1 className="text-4xl font-bold text-gray-800 mt-8">
        NPM Package Malware Detector
      </h1>
      <div className="w-full max-w-7xl px-4 mt-16">
        <h2 className="text-2xl font-semibold text-gray-700 text-center mb-10">
          Lookup an NPM package to analyze
        </h2>

        {/* search + dropdown */}
        <div className="relative mb-10">
          <div className="flex">
            <input
              ref={inputRef}
              type="text"
              placeholder="e.g., react or express"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => query.length >= 2 && setShowDropdown(true)}
              onKeyDown={handleKeyDown}
              className="flex-grow p-3 border border-gray-300 rounded-l-md focus:ring-2 focus:ring-blue-500"
            />

            <button
              onClick={handleSearch}
              disabled={scanLoading}
              className="bg-blue-600 text-white px-5 py-3 rounded-r-md hover:bg-blue-700"
            >
              {scanLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Scanning...</span>
                </div>
              ) : (
                "Scan Package"
              )}
            </button>
          </div>

          {/* advanced options */}
          <div className="mt-4">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-blue-600 underline text-sm"
            >
              {showAdvanced ? "Hide Advanced Options" : "Show Advanced Options"}
            </button>

            {showAdvanced && (
              <div className="mt-3 p-4 bg-gray-50 border rounded-lg shadow-sm">
                <label className="block text-sm font-semibold mb-2">
                  Number of commits to scan:
                </label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={commitDepth === "" ? "" : commitDepth}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "") {
                      setCommitDepth("");
                      return;
                    }
                    setCommitDepth(Number(val));
                  }}
                  className="p-2 border rounded-md w-32"
                />
              </div>
            )}
          </div>

          {/* package dropdown */}
          {showDropdown && query.length >= 2 && (
            <div
              ref={dropdownRef}
              className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-80 overflow-y-auto"
            >
              {isLoading ? (
                <div className="p-4 text-center text-gray-500">Loading...</div>
              ) : results.length > 0 ? (
                results.map((result) => (
                  <div
                    key={result.package.name}
                    onClick={() => handleSelectPackage(result)}
                    className="p-3 hover:bg-blue-50 cursor-pointer border-b"
                  >
                    <div className="font-semibold">
                      {result.package.name}
                    </div>
                    <div className="text-sm text-gray-600 truncate">
                      {result.package.description}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-gray-500">
                  No packages found
                </div>
              )}
            </div>
          )}
        </div>

        {/* selected package + dependencies */}
        {selectedPackage && (
          <div className="bg-white p-4 rounded-md shadow-md">
            <h3 className="text-lg font-bold">Selected Package</h3>
            <p>
              <strong>Name:</strong> {selectedPackage.name}
            </p>
            <p>
              <strong>Version:</strong> {selectedPackage.version}
            </p>

            {selectedPackage.description && (
              <p className="mt-2">
                <strong>Description:</strong> {selectedPackage.description}
              </p>
            )}

            <div className="mt-4">
              <h4 className="font-semibold mb-2">Dependencies:</h4>

              {depsLoading && (
                <p className="text-gray-500 italic">Loading dependencies…</p>
              )}

              {depsError && !depsLoading && (
                <p className="text-red-600 text-sm">{depsError}</p>
              )}

              {!depsLoading &&
                !depsError &&
                dependencies &&
                Object.keys(dependencies).length > 0 && (
                  <ul className="list-disc ml-6 space-y-1 max-h-40 overflow-y-auto">
                    {Object.entries(dependencies).map(
                      ([dep, version]) => (
                        <li key={dep} className="text-gray-700">
                          <span className="font-medium">{dep}</span>:{" "}
                          {version}
                        </li>
                      )
                    )}
                  </ul>
                )}

              {!depsLoading &&
                !depsError &&
                (!dependencies ||
                  Object.keys(dependencies).length === 0) && (
                  <p className="text-gray-500 italic">
                    No dependencies listed in the latest version
                  </p>
                )}
            </div>
          </div>
        )}

        {/* backend error */}
        {scanError && (
          <div className="text-red-600 text-center mt-4">{scanError}</div>
        )}

        {/* scan results */}
        {scanResults && scanResults.commits && (
          <div className="mt-6 bg-white p-4 rounded-lg shadow-md">
            {/* risk Summary */}
            <div className="mb-6 p-4 bg-gray-50 border rounded-lg">
              <h3 className="font-semibold mb-2">Risk Summary</h3>
              {(() => {
                const scores = scanResults.commits.map(
                  (c) => c.risk_score
                );
                const avg =
                  scores.reduce((a, b) => a + b, 0) / scores.length;
                const highest = Math.max(...scores);
                const color =
                  highest <= 9
                    ? "text-green-700"
                    : highest <= 60
                    ? "text-yellow-700"
                    : "text-red-700";

                return (
                  <div
                    className={`font-medium ${color} flex justify-between items-center`}
                  >
                    <div>
                      <p>
                        Highest Commit Risk:{" "}
                        <strong>{highest}</strong>
                      </p>
                      <p>
                        Average Risk Score:{" "}
                        <strong>{avg.toFixed(1)}</strong>
                      </p>
                      <p>
                        Total Commits Scanned:{" "}
                        <strong>{scores.length}</strong>
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>

            <h3 className="text-xl font-bold mb-4">
              Scan Results for {scanResults.package}
            </h3>

            <table className="w-full text-sm table-fixed">
              <thead>
                <tr className="border-b">
                  <th className="p-2">SHA</th>
                  <th className="p-2">Author / Date</th>
                  <th className="p-2 w-2/5">Message</th>
                  <th className="p-2">Score</th>
                  <th className="p-2">Flags</th>
                </tr>
              </thead>

              <tbody>
                {scanResults.commits.map((c) => (
                  <tr
                    key={c.sha}
                    className="border-b hover:bg-gray-50 cursor-pointer"
                    onClick={() => setActiveCommit(c)}
                  >
                    <td className="p-2 font-mono">
                      {c.sha.slice(0, 7)}
                    </td>
                    <td className="p-2">
                      <div>{c.authorName}</div>
                      <div className="text-xs text-gray-500">
                        {formatCommitDate(c)}
                      </div>
                    </td>
                    <td className="p-2 break-words">{c.message}</td>
                    <td className="p-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${getScoreColor(
                          c.risk_score
                        )}`}
                      >
                        {c.risk_score}
                      </span>
                    </td>
                    <td className="p-2">
                      {c.flags && c.flags.length ? (
                        c.flags.map((f, i) => (
                          <span
                            key={i}
                            className={`inline-block px-2 py-1 rounded-full text-xs font-semibold mr-1 mb-1 ${getFlagColor(
                              f
                            )}`}
                          >
                            {FLAG_LABELS[f] || f}
                          </span>
                        ))
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* commit details */}
        {activeCommit && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-lg w-full">
              <h2 className="text-xl font-bold mb-4">Commit Details</h2>
              <div className="space-y-3">
                <div>
                  <span className="font-semibold text-gray-700">
                    SHA:
                  </span>
                  <span className="ml-2 font-mono bg-gray-100 px-2 py-1 rounded">
                    {activeCommit.sha}
                  </span>
                </div>

                <div>
                  <span className="font-semibold text-gray-700">
                    Committed at:
                  </span>
                  <span className="ml-2 text-gray-700">
                    {formatCommitDate(activeCommit)}
                  </span>
                </div>

                <div>
                  <p className="font-semibold text-gray-700">
                    Message:
                  </p>
                  <p className="mt-1 p-3 bg-gray-50 rounded border text-gray-800">
                    {activeCommit.message}
                  </p>
                </div>

                <div>
                  <span className="font-semibold text-gray-700">
                    Flags:
                  </span>
                  <span className="ml-2">
                    {activeCommit.flags &&
                    activeCommit.flags.length > 0 ? (
                      activeCommit.flags
                        .map((f) => FLAG_LABELS[f] || f)
                        .join(", ")
                    ) : (
                      <span className="text-gray-500 italic">
                        None
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* high risk visual warning */}
              {activeCommit.risk_score >= 61 && (
                <div className="mt-6 flex items-center space-x-4 p-3 border border-red-200 rounded-lg bg-red-50">
                  <img
                    src={warningImg}
                    alt="High risk commit"
                    className="h-16 w-auto object-contain"
                  />
                  <p className="text-red-700 text-sm font-semibold">
                    THIS COMMIT HAS A HIGH CHANCE OF BEING MALICIOUS!
                    <br />
                    You should read more into it here before trusting
                    this change.
                  </p>
                </div>
              )}

              <div className="mt-8 flex justify-end space-x-3">
                <button
                  className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                  onClick={() => setActiveCommit(null)}
                >
                  Close
                </button>
                {(() => {
                  const url = getCommitUrl(activeCommit.sha);
                  return url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
                    >
                      View on GitHub
                      <svg
                        className="w-4 h-4 ml-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </a>
                  ) : (
                    <button
                      disabled
                      className="px-4 py-2 bg-gray-300 text-gray-500 rounded cursor-not-allowed"
                      title="Repository URL not available"
                    >
                      Repo Link Unavailable
                    </button>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        <footer className="mt-10 text-gray-500 text-sm text-center">
          Built by Group 1 — Boston University EC521 (Fall 2025)
        </footer>
      </div>
    </div>
  );
}

export default App;