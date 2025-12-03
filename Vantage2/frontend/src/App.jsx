import { useState, useEffect, useRef } from 'react';

function App() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const [scanResults, setScanResults] = useState(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError,setScanError]= useState(null);

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
          `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=5`
        );
        const data = await response.json();
        setResults(data.objects || []);
      } catch (error) {
        console.error('Error fetching packages:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    const getScoreColor = (score) => {
  if (score <= 9) return "bg-green-100 text-green-800";
  if (score <= 60) return "bg-yellow-100 text-yellow-800";
  return "bg-red-100 text-red-800";
};

    const debounceTimer = setTimeout(searchPackages, 300);
    return () => clearTimeout(debounceTimer);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        !inputRef.current.contains(event.target)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectPackage = (pkg) => {
    setQuery(pkg.package.name);
    setSelectedPackage(pkg.package);
    setShowDropdown(false);
  };

const handleSearch = async () => {
  if (!selectedPackage?.name) return;

  setScanLoading(true);
  setScanError(null);
  setScanResults(null);

  try {
    const res = await fetch("http://localhost:5001/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        package: selectedPackage.name,
        numCommits: 10
      })
    });

    if (!res.ok) {
      throw new Error(`Backend error: ${res.status}`);
    }

    const data = await res.json();
    setScanResults(data);

  } catch (err) {
    setScanError(err.message);
  } finally {
    setScanLoading(false);
  }
};

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-10">
      <h1 className="text-4xl font-bold text-gray-800 mt-8">NPM Package Malware Detector</h1>
      <div className="flex flex-col items-center w-full mt-16">
        <div className="w-full max-w-lg px-4">
          <h2 className="text-2xl font-semibold text-gray-700 text-center mb-10">
            Lookup an NPM package to analyze
          </h2>
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
                className="flex-grow p-3 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSearch}
                className="bg-blue-600 text-white px-5 py-3 rounded-r-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {scanLoading ? "Scanning..." : "Scan Package"}
              </button>
            </div>

            {showDropdown && query.length >= 2 && (
              <div
                ref={dropdownRef}
                className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-80 overflow-y-auto"
              >
                {isLoading ? (
                  <div className="p-4 text-center text-gray-500">Loading...</div>
                ) : results.length > 0 ? (
                  results.map((result) => (
                    <div
                      key={result.package.name}
                      onClick={() => handleSelectPackage(result)}
                      className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      <div className="font-semibold text-gray-800">{result.package.name}</div>
                      <div className="text-sm text-gray-600 truncate">
                        {result.package.description || 'No description available'}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        v{result.package.version} • {result.package.publisher?.username || 'Unknown'}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-gray-500">No packages found</div>
                )}
              </div>
            )}
          </div>

          {selectedPackage && (
            <div className="bg-white p-4 rounded-md shadow-md">
              <h3 className="text-lg font-bold text-gray-800 mb-2">Selected Package</h3>
              <p className="text-gray-700">
                <span className="font-semibold">Name:</span> {selectedPackage.name}
              </p>
              <p className="text-gray-700">
                <span className="font-semibold">Version:</span> {selectedPackage.version}
              </p>
              {selectedPackage.description && (
                <p className="text-gray-700 mt-2">
                  <span className="font-semibold">Description:</span> {selectedPackage.description}
                </p>
              )}
            </div>
          )}
        
          {scanError && (
            <div className="mt-4 text-red-600 text-center">
              Error: {scanError}
            </div>
          )}

          {scanResults && (
            <div className="mt-6 bg-white p-4 rounded-lg shadow-md">
            <h3 className="text-xl font-bold mb-4">
              Scan Results for {scanResults.package}
            </h3>

          <p className="text-gray-700 mb-2">
          <strong>Repository:</strong> {scanResults.repo?.owner}/{scanResults.repo?.repo}
          </p>

          <h4 className="text-lg font-semibold mt-4 mb-2">Commits:</h4>

          <table className="w-full text-sm">
          <thead>
          <tr className="border-b">
          <th className="text-left p-2">SHA</th>
          <th className="text-left p-2">Author</th>
          <th className="text-left p-2">Message</th>
          <th className="text-left p-2">Score</th>
          <th className="text-left p-2">Flags</th>
          </tr>
          </thead>    
          <tbody>
          
          {scanResults.commits.map((c) => (
          <tr key={c.sha} className="border-b">
            <td className="p-2 font-mono">{c.sha.slice(0, 7)}</td>
            <td className="p-2">{c.authorName}</td>
            <td className="p-2">{c.message}</td>
            <td className="p-2 font-bold">{c.risk_score}</td>
            <td className="p-2">
              {c.flags?.length ? c.flags.join(", ") : "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)}
        </div>
      </div>
    </div>
  );
}

export default App;
