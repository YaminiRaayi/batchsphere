# BatchSphere UI

Independent frontend app for the BatchSphere operations console.

## Stack

- React
- TypeScript
- Vite
- Tailwind CSS

## Run

```bash
cd ui
npm install
npm run dev
```

The app runs on `http://localhost:5173`.

## E2E

Run Playwright commands from this `core/ui` folder so npm uses the local `@playwright/test` package:

```bash
npm run test:e2e:list
npm run test:e2e:demo
```

If you use `npx`, keep the command on one line:

```bash
npx playwright test e2e/specs/00-happy-path-demo.spec.ts --project=chromium
```

Start clean before a new E2E cycle with:

```bash
npm run db:e2e:reset
```

## Current Scope

- App shell with sidebar navigation
- Dashboard concept screen
- Master data placeholder
- GRN queue placeholder
- Sampling placeholder
- Inventory placeholder

## Next Build Steps

1. Add API client and environment configuration.
2. Connect dashboard and GRN list to backend endpoints.
3. Build GRN create/detail/receive workflow.
4. Add inventory transaction and sampling detail views.
