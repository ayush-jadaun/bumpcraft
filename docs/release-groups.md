# Release Groups

Release groups let you batch multiple commits into a named release instead of auto-releasing on every merge.

## Why Use Groups?

- **Coordinated releases** — collect changes across multiple PRs into one version bump
- **QA gates** — accumulate changes, review them as a group, then release when ready
- **Themed releases** — name your groups (`v3-launch`, `q1-features`) for clarity

## How It Works

Groups are stored as JSON files in `.bumpcraft/groups/`. No database needed.

### 1. Create a Group

```bash
bumpcraft group create "v3-launch"
```

Creates `.bumpcraft/groups/v3-launch.json`.

### 2. Add Commits

```bash
# Adds all commits since the last tag to the group
bumpcraft group add "v3-launch"
```

You can run this multiple times as new commits land.

### 3. Check Status

```bash
bumpcraft group status "v3-launch"
# Output:
# Group: v3-launch
# Commits: 5
#  - abc1234 feat: add dark mode
#  - def5678 fix: crash on login
#  - ...
```

### 4. Release the Group

```bash
bumpcraft group release "v3-launch"
# Output: Released group "v3-launch" as 1.3.0
```

This runs the full pipeline using only the group's stored commits, then deletes the group file.

### 5. List All Groups

```bash
bumpcraft group list
# Output:
# - v3-launch (5 commits)
# - hotfix-batch (2 commits)
```

## Storage Format

Each group is a JSON file at `.bumpcraft/groups/<name>.json`:

```json
{
  "name": "v3-launch",
  "createdAt": "2026-03-18T10:00:00.000Z",
  "commits": [
    "abc1234 feat: add dark mode",
    "def5678 fix: crash on login"
  ]
}
```

Add `.bumpcraft/` to your `.gitignore` if you don't want to track groups in version control.
