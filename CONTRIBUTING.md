# Contributing

This repository contains a dependency-free static Notes application for the browser. Use Node.js 22.14.0 and npm 10.9.2 for development.

## Setup and verification

Install the development tooling with:

```sh
npm ci
```

Run the complete verification suite before opening a pull request:

```sh
npm run verify
```

The individual checks are available when iterating:

```sh
npm run lint
npm run typecheck
npm run test
npm run build
```

## Repository structure

- `index.html` defines the application structure and accessible controls.
- `styles.css` contains presentation and responsive layout rules.
- `script.js` implements browser behavior and persists notes in `localStorage` under `notes-app.notes.v1`.
- `test/` contains behavioral tests run with Node's built-in test runner and JSDOM.
- `scripts/build.mjs` copies the static HTML, CSS, and JavaScript files into the generated `dist/` directory.

The production application has no framework, backend, remote service, or production dependency.

## Pull requests

Keep documentation-only pull requests focused: change only the documentation needed for the stated purpose, verify commands and architecture details against the repository, and avoid unrelated formatting or product changes. In the pull request, summarize what changed and why, list the checks run, and call out any follow-up work or known limitations.
