# ACV - Auto Commit Version

This workflow performs an automatic git commit with the standardized format and creates a version tag.

## Steps:

1. Stage all changes for commit:
```bash
git add .
```

2. Create commit with AUTOCOMMIT format using current date/time:
```bash
git commit -m "AUTOCOMMIT MMDDYY HH:MM"
```

3. Create version tag with RC-M.DD.HMM format where:
   - M = month number (no leading zeros)
   - DD = day with leading zero if needed
   - HMM = hour and minute (24-hour format)

```bash
git tag "RC-M.DD.HMM"
```

## Example:
For 9/5/2025 at 8:56 AM, this would create:
- Commit: "AUTOCOMMIT 090525 08:56"
- Tag: "RC-9.05.856"

The workflow will automatically calculate the current date and time to generate the proper format.
