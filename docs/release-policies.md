# Release Policies

Release policies are configurable rules that control when and how releases can happen. They act as safety nets for teams.

## Configuration

Add policies to `.bumpcraftrc.json`:

```json
{
  "policies": {
    "requireApproval": ["major"],
    "autoRelease": ["patch"],
    "freezeAfter": "friday 17:00",
    "maxBumpPerDay": 5
  }
}
```

## Policy Options

### `requireApproval`

Array of bump types that require explicit approval before releasing.

```json
{ "requireApproval": ["major"] }
```

When a major bump is detected, `bumpcraft release` will exit with:
```
Release blocked: major bump requires approval. Run with --approve to override.
```

Override with `--approve`:
```bash
bumpcraft release --approve
```

In interactive mode (`-i`), the approval prompt handles this automatically.

### `autoRelease`

Array of bump types that can release without any confirmation. Default: `["patch", "minor", "major"]`.

```json
{ "autoRelease": ["patch"] }
```

This is the inverse of `requireApproval`. If a bump type is in neither list, it follows standard behavior.

### `freezeAfter`

Block releases after a specific day and time. Format: `"<day> <HH:MM>"`.

```json
{ "freezeAfter": "friday 17:00" }
```

When the freeze is active:
```
Release blocked: Release freeze is active (friday 17:00)
```

This is useful to prevent releases before weekends or during deployment windows.

Days: `sunday`, `monday`, `tuesday`, `wednesday`, `thursday`, `friday`, `saturday`

### `maxBumpPerDay`

Maximum number of releases allowed per day. Safety net against runaway CI loops.

```json
{ "maxBumpPerDay": 5 }
```

## Examples

### Conservative setup (for production services)

```json
{
  "policies": {
    "requireApproval": ["major", "minor"],
    "autoRelease": ["patch"],
    "freezeAfter": "friday 15:00",
    "maxBumpPerDay": 3
  }
}
```

### Liberal setup (for libraries)

```json
{
  "policies": {
    "requireApproval": [],
    "autoRelease": ["patch", "minor", "major"],
    "freezeAfter": null,
    "maxBumpPerDay": null
  }
}
```

### No policies (default)

```json
{
  "policies": {
    "requireApproval": [],
    "autoRelease": ["patch", "minor", "major"],
    "freezeAfter": null,
    "maxBumpPerDay": null
  }
}
```
