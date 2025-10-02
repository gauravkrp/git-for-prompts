#!/bin/bash

echo "🚀 Git for Prompts - Quick Start Setup"
echo "======================================"
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo ""
    echo "🔑 Setting up environment..."
    cp .env.example .env
    echo "   Created .env file - please add your API keys"
fi

# Initialize prompts repository
echo ""
echo "📁 Initializing prompts repository..."
node src/cli/index.js init

# Copy example prompts
echo ""
echo "📝 Copying example prompts..."
mkdir -p .prompts/prompts
cp examples/*.yaml .prompts/prompts/

echo ""
echo "✨ Setup complete!"
echo ""
echo "Quick commands to try:"
echo "  prompt list                    # List all prompts"
echo "  prompt history user-onboarding-welcome  # View history"
echo "  prompt test                    # Test all prompts (requires API key)"
echo ""
echo "📖 Read the README.md for full documentation"
echo ""
echo "⚠️  Don't forget to add your OpenAI API key to .env file!"