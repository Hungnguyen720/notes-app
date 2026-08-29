# Notes App

A small static Notes application. Notes are created, edited, deleted, and persisted in the browser with `localStorage`. The application has no production dependencies or backend services.

## Requirements

- Node.js 22.14.0
- npm 10.9.2 (bundled with the pinned Node.js release)

The exact versions are recorded in `.nvmrc` and `package.json`. With `nvm` installed, select the expected Node.js version with:

```sh
nvm use
```

## Setup

Install the committed dependency graph exactly as recorded in `package-lock.json`:

```sh
npm ci
```

Open `index.html` directly in a browser to use the application. No development server is required.

## Verification

Run the same complete verification command used by CI:

```sh
npm run verify
```

It runs, in order:

- `npm run lint` — lint application and tooling JavaScript.
- `npm run typecheck` — type-check the browser JavaScript with TypeScript's JavaScript checker.
- `npm run test` — exercise note creation, persistence, editing, and deletion in a browser-like DOM.
- `npm run build` — create the deployable static files in the ignored `dist/` directory.

CI performs `npm ci` followed by `npm run verify` for every pull request and every push to `main`.
