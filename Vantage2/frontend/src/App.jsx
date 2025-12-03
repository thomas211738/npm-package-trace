import { useState, useEffect, useRef } from 'react';

function App() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

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

  const handleSearch = () => {
    if (query.trim()) {
      window.open(`https://github.com/search?q=${encodeURIComponent(query)}&type=repositories`, '_blank');
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
                Search
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
        </div>
      </div>
    </div>
  );
}

export default App;