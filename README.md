# NPM Package Trace

Vantage 2: A web-based malware detection tool for analyzing NPM packages. Vantage2 scans package repositories for suspicious commit patterns and provides risk scoring based on code-level and behavior-level heuristics.

Built by **Group 1** — Boston University EC521 (Fall 2025)

## Prerequisites

- **Python 3.8+** (for backend)
- **Node.js 18+** (for frontend)
- **npm** (comes with Node.js)
- **Git**

## Installation

### Option 1: Using Make (Recommended)

```bash
# Clone the repository
git clone https://github.com/thomas211738/npm-package-trace.git
cd npm-package-trace

# Install all dependencies
make install
```

### Option 2: Manual Installation

#### Backend Setup
```bash
cd Vantage2/flask_backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

#### Frontend Setup
```bash
cd Vantage2/frontend

# Install dependencies
npm install
```

## Running the Application

### Option 1: Using Make (Easiest)

```bash
# Run both backend and frontend together
make dev
```

This will start:
- **Backend**: http://localhost:5001
- **Frontend**: http://localhost:5173

### Option 2: Run Servers Separately

#### Terminal 1 - Backend
```bash
make dev-backend
# OR manually:
cd Vantage2/flask_backend
source venv/bin/activate
python app.py
```

#### Terminal 2 - Frontend
```bash
make dev-frontend
# OR manually:
cd Vantage2/frontend
npm run dev
```

## Usage

1. Open your browser to **http://localhost:5173**
2. Search for an NPM package (e.g., "react", "express", "colors")
3. Select a package from the dropdown
4. (Optional) Click "Show Advanced Options" to customize the number of commits to scan
5. Click **"Scan Package"**
6. View the risk summary and commit analysis
7. Click on any commit row to see detailed information
8. Click "View on GitHub" to inspect the commit directly

## Features

- **Package Search**: Search and analyze any NPM package from the registry
- **Commit Analysis**: Scan recent commits for suspicious patterns
- **Risk Scoring**: Automatically score commits based on:
  - Encoded payloads with eval
  - Suspicious install scripts
  - Network access with child processes
  - Secret/credential access
  - Infinite loops (sabotage)
  - New dependencies
  - New or hibernating authors
  - Unusually large code changes
- **Dependency Viewer**: View package dependencies at a glance
- **GitHub Integration**: Direct links to view commits on GitHub
- **Interactive UI**: Click on any commit to see detailed analysis

## Features

- **Package Search**: Search and analyze any NPM package from the registry
- **Commit Analysis**: Scan recent commits for suspicious patterns
- **Risk Scoring**: Automatically score commits based on:
  - Encoded payloads with eval
  - Suspicious install scripts
  - Network access with child processes
  - Secret/credential access
  - Infinite loops (sabotage)
  - New dependencies
  - New or hibernating authors
  - Unusually large code changes
- **Dependency Viewer**: View package dependencies at a glance
- **GitHub Integration**: Direct links to view commits on GitHub
- **Interactive UI**: Click on any commit to see detailed analysis

## Risk Levels

- **Low (0-9)**: No suspicious patterns detected
- **Medium (10-60)**: Some concerning patterns found
- **High (61-100)**: High chance of malicious activity

## Detection Heuristics

### Code-Level
- **Encoded Payload + Eval**: Base64/hex blobs with eval() or Function()
- **Suspicious Install Scripts**: postinstall/preinstall scripts downloading code
- **Child Process + Network**: Using exec/spawn with curl/wget
- **Secret Access**: Reading process.env, .env files, or SSH keys
- **Infinite Loops**: while(true) or for(;;) at top level
- **New Dependencies**: Additions to package.json dependencies

### Behavior-Level
- **New Author**: First-time contributor in the scan window
- **Hibernating Author**: Author returning after 90+ days of inactivity
- **Sudden Large Diff**: Commit 5x larger than author's average

## Testing

```bash
# Run backend tests
make test
```

## Cleanup

```bash
# Remove all dependencies and build artifacts
make clean
```

## Project Structure

```
npm-package-trace/
├── Vantage2/
│   ├── flask_backend/          # Python Flask backend
│   │   ├── app.py             # Main Flask application
│   │   ├── requirements.txt   # Python dependencies
│   │   ├── risk/              # Risk scoring logic
│   │   │   └── score_commit.py
│   │   └── services/          # External API integrations
│   │       ├── github_commits.py
│   │       └── npm_resolver.py
│   └── frontend/              # React frontend
│       ├── src/
│       │   ├── App.jsx        # Main React component
│       │   └── index.css      # Tailwind styles
│       ├── package.json       # Node dependencies
│       └── vite.config.js     # Vite configuration
├── Makefile
└── README.md
```

## Related Resources

- [NPM Registry API](https://registry.npmjs.org)
- [GitHub API Documentation](https://docs.github.com/en/rest)
- [Common NPM Attack Patterns](https://snyk.io/blog/npm-security-best-practices/)

## Quick Reference

```bash
# Complete setup and run
make install && make dev

# Backend only
make dev-backend

# Frontend only  
make dev-frontend

# Clean everything
make clean
```

---
