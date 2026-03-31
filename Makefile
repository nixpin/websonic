.PHONY: dev build preview verify clean help

# Default target
all: dev

# Start development server
dev:
	npm run dev

# Run production build (TypeScript check + Vite build)
build:
	npm run build

# Preview the production build locally (using /dist)
preview:
	npm run preview

# Build and then immediately start preview server
# Use this to verify everything is OK before pushing to Cloudflare
verify: clean build
	@echo "\n🚀 Build complete. Starting local preview server..."
	@echo "Check the UI for missing icons, styles, or JS errors.\n"
	npm run preview

# Remove build artifacts
clean:
	rm -rf dist
	rm -rf node_modules/.vite

# Help command to list all available tools
help:
	@echo "WebSonic Automation & Build Tools"
	@echo "------------------------------------------"
	@echo "make dev      - Start Vite development server"
	@echo "make build    - Run production build (TSC + Vite)"
	@echo "make preview  - Preview existing build from /dist"
	@echo "make verify   - BUILD + PREVIEW (Recommended before deploy!)"
	@echo "make clean    - Remove /dist and Vite cache"
