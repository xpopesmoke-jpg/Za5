# Za5: Home Chores

Chores, routines and supplies for a household, on the household's own floor plan. "Za5" is Croatian "za 5 minuta", the "in 5 minutes" people say about a chore they never get to. Said "Za Five" in English, "Za Pet" in Croatian.

The plan for v1 is [issue #1](https://github.com/xpopesmoke-jpg/za5/issues/1); the build is split into tickets linked from it. Product words are defined in [CONTEXT.md](CONTEXT.md), lasting decisions in [docs/adr](docs/adr).

## Stack

Next.js + TypeScript + Tailwind, Postgres via Drizzle, logins via Better Auth, tests with Vitest. English and Croatian on every screen. Deployed from GitHub to Coolify. The same foundations as the ARC gym app ([ADR-0002](docs/adr/0002-self-hosted-stack-like-arc.md)).

## Run it locally

1. `npm install`
2. Copy `.env.example` to `.env.local` and set `BETTER_AUTH_SECRET` (any long random text, e.g. `openssl rand -base64 32`).
3. `npm run db:migrate` (with no `DATABASE_URL` this uses a built-in local database in `.data/`)
4. `npm run dev` and open http://localhost:3000. Create an account, then name your home; you become its Owner.

## Commands

- `npm run dev`: run locally
- `npm test`: run the tests (each test gets its own in-memory database)
- `npm run typecheck`: generate route types and check TypeScript
- `npm run lint`: lint
- `npm run build` / `npm start`: production build and server (start also brings the database up to date)
- `npm run db:generate`: create a migration after changing `src/db/schema.ts`

## Deploying on Coolify

Create the app from this GitHub repo (Nixpacks, Node 22 from `.nvmrc`), add a Postgres database, and set these environment variables on the app:

- `DATABASE_URL`: the Postgres connection string from the Coolify database
- `BETTER_AUTH_SECRET`: a long random secret
- `BETTER_AUTH_URL`: the app's public address, e.g. `https://za5.yourdomain.com`

The start command (`npm start`) migrates the database before starting, so a deploy is all it takes.

## Languages

Every screen exists in English and Croatian. The address never shows the language: a person gets their phone's language the first time, and the switch on each screen changes it (remembered in a cookie). Messages live in `src/i18n/messages`, English first with Croatian matching key for key; server error messages are translated in `src/i18n/errors.ts`.
