#!/bin/bash
# Version bump script for Watchtower
# Usage: ./scripts/bump-version.sh <major|minor|patch>

set -e

VERSION_TYPE=${1:-patch}

# Get current version from pyproject.toml
CURRENT_VERSION=$(grep "^version = " pyproject.toml | sed 's/version = "\([^"]*\)"/\1/')

# Split version into components
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"

# Bump version based on type
case $VERSION_TYPE in
  major)
    MAJOR=$((MAJOR + 1))
    MINOR=0
    PATCH=0
    ;;
  minor)
    MINOR=$((MINOR + 1))
    PATCH=0
    ;;
  patch)
    PATCH=$((PATCH + 1))
    ;;
  *)
    echo "Usage: $0 <major|minor|patch>"
    exit 1
    ;;
esac

NEW_VERSION="$MAJOR.$MINOR.$PATCH"
echo "Bumping version: $CURRENT_VERSION -> $NEW_VERSION"

# Update pyproject.toml
sed -i '' "s/^version = \".*\"/version = \"$NEW_VERSION\"/" pyproject.toml

# Update CLI package.json
sed -i '' "s/\"version\": \".*\"/\"version\": \"$NEW_VERSION\"/" packages/cli/package.json

# Update web package.json
sed -i '' "s/\"version\": \".*\"/\"version\": \"$NEW_VERSION\"/" packages/web/package.json

# Update root package.json
sed -i '' "s/\"version\": \".*\"/\"version\": \"$NEW_VERSION\"/" package.json

# Update SDK version reference in README if present
if [ -f "README.md" ]; then
  sed -i '' "s/watchtower-adk==[0-9.]*/watchtower-adk==$NEW_VERSION/g" README.md
fi

echo "✅ Version bumped to $NEW_VERSION"
echo "Don't forget to:"
echo "  1. Commit the changes: git add -A && git commit -m 'chore: bump version to $NEW_VERSION'"
echo "  2. Create SDK tag:  git tag sdk-v$NEW_VERSION"
echo "  3. Create CLI tag:  git tag cli-v$NEW_VERSION"
echo "  4. Push SDK tag:    git push origin sdk-v$NEW_VERSION"
echo "  5. Push CLI tag:    git push origin cli-v$NEW_VERSION"
echo ""
echo "Or to release both at once:"
echo "  git tag sdk-v$NEW_VERSION && git tag cli-v$NEW_VERSION"
echo "  git push origin sdk-v$NEW_VERSION cli-v$NEW_VERSION"
