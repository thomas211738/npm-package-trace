.PHONY: help install install-backend install-frontend dev dev-backend dev-frontend build clean test

help:
	@echo "Vantage2 - NPM Package Malware Detector"
	@echo ""
	@echo "Available targets:"
	@echo "  make install          - Install all dependencies (backend + frontend)"
	@echo "  make install-backend  - Install Python backend dependencies"
	@echo "  make install-frontend - Install React frontend dependencies"
	@echo "  make dev              - Run both backend and frontend in development mode"
	@echo "  make dev-backend      - Run Flask backend only"
	@echo "  make dev-frontend     - Run React frontend only"
	@echo "  make build            - Build frontend for production"
	@echo "  make clean            - Remove all build artifacts and dependencies"
	@echo "  make test             - Run backend tests"
	@echo ""
	@echo "Quick start:"
	@echo "  1. make install"
	@echo "  2. make dev"
	@echo ""

# Install all dependencies
install: install-backend install-frontend
	@echo "✓ All dependencies installed successfully!"

# Install backend dependencies
install-backend:
	@echo "Installing Flask backend dependencies..."
	cd Vantage2/flask_backend && \
	python3 -m venv venv && \
	. venv/bin/activate && \
	pip install -r requirements.txt
	@echo "✓ Backend dependencies installed"

# Install frontend dependencies
install-frontend:
	@echo "Installing React frontend dependencies..."
	cd Vantage2/frontend && npm install
	@echo "✓ Frontend dependencies installed"

# Run both backend and frontend in development mode
dev:
	@echo "Starting Vantage2 in development mode..."
	@echo "Backend will run on http://localhost:5001"
	@echo "Frontend will run on http://localhost:5173"
	@echo ""
	@echo "Press Ctrl+C to stop both servers"
	@make -j2 dev-backend dev-frontend

# Run backend only
dev-backend:
	@echo "Starting Flask backend on http://localhost:5001..."
	cd Vantage2/flask_backend && \
	. venv/bin/activate && \
	python app.py

# Run frontend only
dev-frontend:
	@echo "Starting React frontend on http://localhost:5173..."
	cd Vantage2/frontend && npm run dev


# Clean all build artifacts
clean:
	@echo "Cleaning build artifacts..."
	rm -rf Vantage2/flask_backend/venv
	rm -rf Vantage2/flask_backend/__pycache__
	rm -rf Vantage2/flask_backend/**/__pycache__
	rm -rf Vantage2/frontend/node_modules
	rm -rf Vantage2/frontend/dist
	@echo "✓ Cleanup complete"