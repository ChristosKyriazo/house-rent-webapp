---
name: deploy-check
description: Run typecheck and lint to confirm the branch is clean before pushing. Use before any git push, especially to dev or main.
---

Run the following commands in sequence and report the results:

1. `npm run typecheck` — TypeScript check with no emit
2. `npm run lint` — ESLint (flat config)

If both pass, confirm the branch is ready to push and remind the user that pushing to `dev` deploys to staging and pushing to `main` deploys to production.

If either fails, show the errors clearly and do NOT suggest pushing until they are fixed. Offer to fix the issues.
