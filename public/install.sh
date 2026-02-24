#!/usr/bin/env bash
# skills.ws installer — install agent skills from Commit Media
# Usage:
#   curl -fsSL https://skills.ws/install.sh | bash
#   curl -fsSL https://skills.ws/install.sh | bash -s -- --skill seo-geo

set -euo pipefail

REPO="san-npm/skills-ws"
BRANCH="main"
BASE_URL="https://raw.githubusercontent.com/$REPO/$BRANCH"
SKILLS_JSON_URL="https://skills.ws/skills.json"

GREEN='\033[0;32m'
DIM='\033[2m'
RESET='\033[0m'
BOLD='\033[1m'

# Detect target directory
detect_target() {
  if [ -d ".claude" ] || [ -f "AGENTS.md" ]; then
    echo ".claude/skills"
  elif [ -d ".openclaw" ] || [ -d "$HOME/openclaw" ]; then
    echo "${HOME}/openclaw/skills"
  elif [ -d ".cursor" ]; then
    echo ".cursor/skills"
  elif [ -d ".codex" ]; then
    echo ".codex/skills"
  else
    echo ".claude/skills"
  fi
}

TARGET_DIR=$(detect_target)
SPECIFIC_SKILL=""

# Parse args
while [[ $# -gt 0 ]]; do
  case $1 in
    --skill)
      SPECIFIC_SKILL="$2"
      shift 2
      ;;
    --dir)
      TARGET_DIR="$2"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

echo -e "${GREEN}${BOLD}skills.ws${RESET} — installing agent skills"
echo -e "${DIM}Target: ${TARGET_DIR}${RESET}"
echo ""

# Get skill list from skills.json
SKILLS=$(curl -fsSL "$SKILLS_JSON_URL" | python3 -c "
import json, sys
data = json.load(sys.stdin)
for s in data['skills']:
    print(s['name'])
" 2>/dev/null || curl -fsSL "$SKILLS_JSON_URL" | node -e "
const chunks = [];
process.stdin.on('data', c => chunks.push(c));
process.stdin.on('end', () => {
  const data = JSON.parse(Buffer.concat(chunks));
  data.skills.forEach(s => console.log(s.name));
});
")

if [ -n "$SPECIFIC_SKILL" ]; then
  # Validate skill name to prevent path traversal
  if ! echo "$SPECIFIC_SKILL" | grep -qE '^[a-z0-9-]+$'; then
    echo "Error: Invalid skill name. Only lowercase letters, numbers, and hyphens are allowed."
    exit 1
  fi
  SKILLS="$SPECIFIC_SKILL"
fi

INSTALLED=0
FAILED=0

for skill in $SKILLS; do
  SKILL_DIR="$TARGET_DIR/$skill"
  mkdir -p "$SKILL_DIR"

  SKILL_URL="$BASE_URL/skills-data/$skill/SKILL.md"
  if curl -fsSL "$SKILL_URL" -o "$SKILL_DIR/SKILL.md" 2>/dev/null; then
    echo -e "  ${GREEN}+${RESET} $skill"
    INSTALLED=$((INSTALLED + 1))
  else
    echo -e "  ${DIM}x $skill (not found)${RESET}"
    rmdir "$SKILL_DIR" 2>/dev/null || true
    FAILED=$((FAILED + 1))
  fi
done

echo ""
echo -e "${GREEN}${BOLD}Done.${RESET} Installed $INSTALLED skills to $TARGET_DIR"
if [ $FAILED -gt 0 ]; then
  echo -e "${DIM}$FAILED skills could not be fetched${RESET}"
fi
