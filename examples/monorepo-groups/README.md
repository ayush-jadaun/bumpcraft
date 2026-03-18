# Release Groups Example

Batch commits from multiple PRs into a single coordinated release.

## Use case

Your team merges 5 PRs over a week. Instead of releasing after each PR, you batch them into a release group and ship once on Friday.

## Workflow

```bash
# Monday: create a group for the upcoming release
bumpcraft group create sprint-42

# After each PR merge, add the new commits to the group
bumpcraft group add sprint-42

# Check what's accumulated
bumpcraft group status sprint-42

# Friday: release everything at once
bumpcraft group release sprint-42
```

## Step by step

### 1. Create a group

```bash
bumpcraft group create sprint-42
# Created group "sprint-42"
```

### 2. Add commits as PRs merge

After each PR merges to main, run:

```bash
bumpcraft group add sprint-42
# Added 3 commits to group "sprint-42"
```

This captures all commits since the last tag.

### 3. Check the group

```bash
bumpcraft group status sprint-42
# Group: sprint-42
# Commits: 12
#  - abc123 feat: add user profiles
#  - def456 fix: login crash
#  - ...
```

### 4. Release the group

```bash
bumpcraft group release sprint-42
# Released group "sprint-42" as 1.3.0
```

This runs the full pipeline (bump, changelog, tag, GitHub release) using only the commits in the group.

### 5. List all groups

```bash
bumpcraft group list
# - sprint-42 (12 commits)
# - hotfix-auth (2 commits)
```

## CI Integration

```yaml
# In your CI, after tests pass on main:
- name: Add to release group
  run: |
    npx bumpcraft group add weekly-release || true

# Separate scheduled job (e.g., Friday 3pm):
- name: Release weekly batch
  run: npx bumpcraft group release weekly-release --approve
```

## Notes

- Groups are stored as JSON files in `.bumpcraft/groups/`
- A group is deleted after a successful release
- If the group's commits produce no releasable bump (all `chore:`), the group is preserved
