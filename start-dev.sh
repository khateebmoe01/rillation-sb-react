#!/bin/bash
# Start the development server

cd "$(dirname "$0")"

echo "🚀 Starting Rillation Revenue Analytics development server..."
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: No .env file found"
    echo "   The app may not connect to Supabase without credentials"
    echo "   Create a .env file with:"
    echo "   VITE_SUPABASE_URL=your-url"
    echo "   VITE_SUPABASE_ANON_KEY=your-key"
    echo ""
fi

# Start the dev server
npm run dev

