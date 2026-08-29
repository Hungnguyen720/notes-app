# Repository guidance

## Project scope

This repository contains a dependency-free production Notes application for the browser. Preserve its ability to create, restore, edit, and delete notes using browser `localStorage`. Do not add a frontend framework, backend, production dependency, remote service, analytics, or deployment integration unless the task explicitly requires one.

## Architecture

- `index.html` defines the application structure and accessible controls.
- `styles.css` contains all presentation and responsive layout rules.
- `script.js` contains the browser behavior and stores notes under `notes-app.notes.v1`.
- `test/` contains behavioral tests run with Node's built-in test runner and JSDOM.
- `scripts/build.mjs` copies the three static application files into the generated, ignored `dist/` directory.
- `.github/workflows/ci.yml` runs the repository verification command without secrets or write permissions.

## Allowed development commands

Use the pinned Node.js and npm versions before running repository commands.

```sh
nvm use
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
npm run verify
```

`npm ci` is the supported clean installation command. `npm run verify` is the required final check and must remain identical locally and in CI. Individual scripts are useful while iterating, but do not substitute them for the complete verification command before handoff.

## Change expectations

- Preserve existing Notes behavior and the `notes-app.notes.v1` storage format unless a task explicitly changes it.
- Add or update meaningful behavioral tests when behavior changes.
- Keep tooling proportionate to this static application and keep production dependencies empty.
- Do not commit `node_modules/`, `dist/`, coverage output, credentials, tokens, or local environment files.
- Do not introduce CI secrets, deployment steps, write permissions, or external service requirements without explicit authorization.
- Do not commit, push, open pull requests, merge, or change external settings unless the task explicitly authorizes that action.
