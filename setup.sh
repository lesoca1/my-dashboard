#!/bin/bash
# Run this from your project root (my-dashboard/) to set up the new directory structure.
# Usage: bash setup.sh

echo "=== Setting up lcsorensen.org file structure ==="

# Step 1: Clean old app directory
echo "Removing old app/ contents..."
rm -rf app

# Step 2: Create directories
echo "Creating directories..."
mkdir -p app/components
mkdir -p app/lib
mkdir -p app/notes
mkdir -p "app/notes/[slug]"
mkdir -p app/tracker

# Step 3: Verify
echo ""
echo "Directory structure created:"
find app -type d | sort
echo ""
echo "=== Done! Now copy the downloaded files into these directories ==="
echo ""
echo "  app/layout.tsx"
echo "  app/page.tsx"
echo "  app/globals.css"
echo "  app/components/Nav.tsx"
echo "  app/lib/notes.ts"
echo "  app/notes/page.tsx"
echo "  app/notes/[slug]/page.tsx    <-- this file goes INSIDE the [slug] folder"
echo "  app/tracker/page.tsx"
echo ""
echo "Then run: npm run dev"