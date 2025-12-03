import { useState } from "react";

function App() {
  const [pkgName, setPkgName] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = pkgName.trim();
    if (!trimmed) return;

    setLoading(true);
    setError("");
    setResults(null);

    try {
      const res = await fetch("http://localhost:5001/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          package: trimmed,
          numCommits: 10,
        }),
      });

      if (!res.ok) {
        throw new Error(`Backend responded with status ${res.status}`);
      }

      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.error(err);
      setError("Failed to analyze package. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8">
      <h1 className="text-3xl font-bold mb-4">
        npm Package Trace – Vantage 2
      </h1>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col sm:flex-row gap-3 mb-6 max-w-xl"
      >
        <input
          className="flex-1 px-3 py-2 rounded text-slate-900"
          placeholder="Enter npm package (e.g., colors, event-stream)"
          value={pkgName}
          onChange={(e) => setPkgName(e.target.value)}
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded bg-cyan-500 font-semibold disabled:opacity-60"
        >
          {loading ? "Scanning..." : "Scan"}
        </button>
      </form>

      {error && (
        <p className="text-red-400 mb-4">
          {error}
        </p>
      )}

      {results && (
        <div className="bg-slate-800 rounded-lg p-4 max-w-4xl">
          <h2 className="text-xl font-semibold mb-2">
            Results for <span className="text-cyan-400">{results.package || pkgName}</span>
          </h2>

          {results.commits && results.commits.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-700">
                  <tr>
                    <th className="py-2 pr-4">Commit SHA</th>
                    <th className="py-2 pr-4">Author</th>
                    <th className="py-2 pr-4">Risk Score</th>
                    <th className="py-2 pr-4">Risk Level</th>
                    <th className="py-2 pr-4">Flags</th>
                    <th className="py-2">Message</th>
                  </tr>
                </thead>
                <tbody>
                  {results.commits.map((c) => (
                    <tr key={c.sha} className="border-b border-slate-800">
                      <td className="py-2 pr-4 font-mono text-xs">
                        {c.sha.slice(0, 8)}…
                      </td>
                      <td className="py-2 pr-4">{c.authorName}</td>
                      <td className="py-2 pr-4">{c.risk_score}</td>
                      <td className="py-2 pr-4 capitalize">{c.risk_level}</td>
                      <td className="py-2 pr-4">
                        {c.flags && c.flags.length > 0
                          ? c.flags.join(", ")
                          : "None"}
                      </td>
                      <td className="py-2">{c.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No commits found.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
