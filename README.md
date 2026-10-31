# StudioDashboard — Taky Apartment ERP

Source repository intended for the **Taky Apartment ERP** web app currently developed in Google AI Studio.

**Deployment status (2026-10-31): NOT LIVE.** The source code has not yet been synced from AI Studio into this repository. Do not assume that the GitHub repository itself is a running application.

## Original application
- [Open original app in Google AI Studio](https://aistudio.google.com/u/1/apps/7f1f5ab0-1401-49af-bfbd-5fc4f49c5310)
- [Deployment runbook](DEPLOYMENT.md)

## How to release the original application
1. In Google AI Studio open the app above, choose the **GitHub** integration and sync the full project to `ramajittilearn-ctrl/StudioDashboard` on `main`. Confirm that `package.json`, `src/`, and server files are present.
2. In AI Studio, select **Publish** and deploy to Cloud Run (subject to account eligibility and billing). Publishing is separate from pushing GitHub source.
3. Verify login and authorization, database persistence, payment webhooks, LINE OA secrets, and backups **before entering real tenant data**.
4. Share only the final **published production URL**. Development/preview URLs are not production hosting.

## Security and operational constraints
- Do not push API keys, .env files, service-account credentials, tenant records, slips, or real rental/financial data to this public repository.
- Check whether `src/server/storage.ts` or `data/dormitory_state.json` stores production state in local files. Container-local files are **not** a durable database in Cloud Run; configure a persistent database/object store and tested backups before operating the ERP.
- Protect all admin functions and payment/webhook endpoints with server-side authorization and authentication.
- Do not use real tenants or accept payments in an unverified deployment.

This repo currently holds deployment guidance and ignore rules only; it is not a substitute for the actual AI Studio source.
