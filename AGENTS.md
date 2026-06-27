# Repository Guidelines

## Project Structure & Module Organization

This is a private Next.js 15 + React 19 TypeScript app for tracking job application emails. App routes and server pages live in `app/`, including API routes under `app/api/`. Reusable UI components live in `components/`. Shared business logic, Gmail integration, auth, classification, and Prisma access live in `lib/`. Common TypeScript shapes live in `types/`. Prisma schema, seed data, and migrations are in `prisma/`. Project-specific verification scripts are in `scripts/`.

## Build, Test, and Development Commands

- `npm run dev`: start the local Next.js development server.
- `npm run build`: create a production build and run Next/TypeScript checks.
- `npm run start`: serve the built app.
- `npm run prisma:generate`: regenerate the Prisma client after schema changes.
- `npm run prisma:migrate`: create/apply local Prisma migrations.
- `npm run prisma:seed`: seed the local database.
- `npx tsx scripts/check-email-lifecycle.ts`: run a focused lifecycle classification check. Similar checks exist for sync decisions and role similarity.

## Coding Style & Naming Conventions

Use strict TypeScript and keep `allowJs` disabled. Follow the existing style: two-space indentation, double quotes, semicolons, named exports for shared helpers, and PascalCase for React components. Use camelCase for functions, local variables, and object fields. Keep route handlers colocated in `app/api/.../route.ts`; keep domain logic in `lib/` rather than embedding it in UI components.

## Testing Guidelines

There is no formal test runner configured yet. For now, add focused `scripts/check-*.ts` files for deterministic business rules and run them with `npx tsx`. When changing Prisma models, Gmail sync, or classification behavior, include checks that cover the new path and at least one regression case. Keep script output clear and fail by throwing an error.

## Commit & Pull Request Guidelines

Git history may be unavailable in restricted environments, so use concise, imperative commit messages such as `Add Gmail sync preview checks` or `Update application matching logic`. Pull requests should describe the user-facing change, note database migrations or environment variable changes, list commands run, and include screenshots for UI changes.

## Security & Configuration Tips

Keep secrets in `.env.local`; never commit Gmail, NextAuth, database, or Gemini credentials. `.env.local`, `.env*.local`, `.next`, and `node_modules` are ignored. Treat Gmail data as sensitive: avoid logging full email bodies unless the code path is explicitly development-only.
