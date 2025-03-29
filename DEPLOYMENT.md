# Deployment Guide

To deploy updates to the application, use these Git commands in sequence:

```bash
# 1. Stage all changes
git add .

# 2. Commit changes with a descriptive message
git commit -m "Fix: [Description of changes]"

# 3. Push to main branch
git push origin main
```

This will trigger the automatic deployment process on Vercel.

Note: Make sure all your changes are committed and your working directory is clean before running these commands. 