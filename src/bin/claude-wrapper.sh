#!/bin/bash
#
# Claude Code Wrapper for Gitify Prompt
#
# This wrapper enables automatic prompt capture by loading a hook module
# into the Claude Code process via NODE_OPTIONS.
#
# Installation:
#   1. Run: gitify-prompt init
#   2. The init command will set up this wrapper and create an alias
#
# Manual setup:
#   alias claude='GITIFY_PROMPT_PATH=/path/to/gitify-prompt /path/to/claude-wrapper.sh'

# Find the actual claude binary
CLAUDE_BIN=$(which claude 2>/dev/null)

# If claude is not in PATH, try common locations
if [ -z "$CLAUDE_BIN" ]; then
  if [ -f "$HOME/.nvm/versions/node/$(node -v)/bin/claude" ]; then
    CLAUDE_BIN="$HOME/.nvm/versions/node/$(node -v)/bin/claude"
  elif [ -f "/usr/local/bin/claude" ]; then
    CLAUDE_BIN="/usr/local/bin/claude"
  else
    echo "Error: claude command not found" >&2
    exit 1
  fi
fi

# Determine gitify-prompt installation path
if [ -z "$GITIFY_PROMPT_PATH" ]; then
  # Try to find gitify-prompt in PATH
  GITIFY_BIN=$(which gitify-prompt 2>/dev/null)
  if [ -n "$GITIFY_BIN" ]; then
    # Resolve symlinks to find actual installation
    GITIFY_PROMPT_PATH=$(dirname $(readlink -f "$GITIFY_BIN" 2>/dev/null || echo "$GITIFY_BIN"))
    GITIFY_PROMPT_PATH=$(dirname "$GITIFY_PROMPT_PATH")  # Go up one level from bin/
  else
    echo "Warning: gitify-prompt not found in PATH" >&2
    echo "Set GITIFY_PROMPT_PATH environment variable or install globally" >&2
  fi
fi

# Path to the hook module
HOOK_MODULE="${GITIFY_PROMPT_PATH}/dist/lib/claude-hook.js"

# Check if hook module exists
if [ ! -f "$HOOK_MODULE" ]; then
  # Hook module not found, run claude normally without capture
  exec "$CLAUDE_BIN" "$@"
  exit $?
fi

# Set NODE_OPTIONS to preload our hook module
# This loads the hook BEFORE Claude Code starts, in the same process
export NODE_OPTIONS="--require $HOOK_MODULE ${NODE_OPTIONS}"

# Run the actual Claude Code binary with all arguments
exec "$CLAUDE_BIN" "$@"
