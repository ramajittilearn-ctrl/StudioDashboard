# StudioDashboard — Production deployment runbook

Last verified: 2026-10-31. **Status: BLOCKED — actual app source not present in GitHub.**

## Ground truth
- AI Studio original: https://aistudio.google.com/u/1/apps/7f1f5ab0-1401-49af-bfbd-5fc4f49c5310
- Target GitHub repository: https://github.com/ramajittilearn-ctrl/StudioDashboard
- The source currently lives in the AI Studio workspace, which has `src/App.tsx`, `src/server/storage.ts`, and `data/dormitory_state.json` visible in its file explorer.
- Other repositories (Taky-apartment and ERP-GeminiArgon4) are distinct projects. Do not copy them over the app.
- GitHub and Cloud Run are separate operations. Publishing to Cloud Run does not automatically push to GitHub.

## 1 — Sync the exact original source
1. Open the AI Studio app.
2. Use the **GitHub** button at the top of the app (or the GitHub tab in Settings).
3. Connect your GitHub account. Select **existing repository** `ramajittilearn-ctrl/StudioDashboard` and branch `main`. Follow the UI prompts to sync/push source.
4. Reopen the GitHub link and confirm that `package.json`, `src/App.tsx`, `src/server/`, and the other relevant code files exist and match the source.
5. Inspect the proposed changes for secrets and personally identifiable information **before committing**. Never sync populated JSON state, payment slips, passwords, tokens, or production backups.

## 2 — Validate that the ERP is safe to host
**Mandatory checks before use with real people or real money:**
- [ ] App builds and starts from source; server routes respond.
- [ ] Login is required for admin pages and API routes, and unauthorized users cannot read or change other tenant records.
- [ ] LINE channel token, Gemini API key, bank/payment credentials, and webhook secrets are supplied as server-side secrets only.
- [ ] Google Form webhook verifies caller authenticity, rejects duplicates and malformed requests, and does not mark invoices as paid until reviewed or verified.
- [ ] All tenant, invoice, payment, and audit records are stored durably; do **not** rely on local JSON files inside Cloud Run containers.
- [ ] Test with fake data: add tenant, create invoice, submit payment, reconcile, refresh/restart, and confirm state persisted.
- [ ] Weekly backups are configured to an independent location, protected, and a test restore succeeds.
- [ ] Only authorized admin can restore/reset data; a production reset requires a tested backup and confirmation.

## 3 — Publish from AI Studio
1. In the original AI Studio app, click **Publish** (top right).
2. If eligible for Starter Tier, click **Get Started**, configure the unique app URL, and click **Publish App**. Otherwise choose the billed Google Cloud project required by the UI.
3. Copy the **published production URL** offered at the end. Do not use an `ais-dev-` or `ais-pre-` preview URL.
4. Check the production site in a private browser session; test sign-in, key workflows, and durable data persistence.
5. Before sharing externally, ensure public infrastructure exposure does not mean public tenant/admin access.

## 4 — Go / No-Go
Go only if code is available, production URL loads, real authentication/authorization is enforced, data persists across restarts, secrets remain private, and backups/restore work.
Otherwise **NO-GO** for real tenant or payment operations.

Reference:
- Google AI Studio Publish docs: https://ai.google.dev/gemini-api/docs/aistudio-deploying
- Google AI Studio GitHub sync: https://ai.google.dev/gemini-api/docs/aistudio-build-mode
