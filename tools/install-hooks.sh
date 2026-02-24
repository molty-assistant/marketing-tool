#!/bin/sh
set -eu

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "$REPO_ROOT" ]; then
  echo "install-hooks: run this command inside the repository" >&2
  exit 1
fi

SOURCE="$REPO_ROOT/tools/hooks/pre-push"
TARGET="$REPO_ROOT/.git/hooks/pre-push"

if [ ! -f "$SOURCE" ]; then
  echo "install-hooks: missing source hook at $SOURCE" >&2
  exit 1
fi

mkdir -p "$(dirname "$TARGET")"
cp "$SOURCE" "$TARGET"
chmod +x "$TARGET"

echo "Installed $TARGET from $SOURCE"
