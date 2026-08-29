# Contributing

## Development setup

Use Node.js 22.14.0 and npm 10.9.2, the supported versions pinned by this repository. With `nvm` installed, run `nvm use`, then install the committed dependency graph:

```sh
npm ci
```

## Verification

Before opening a pull request, run the complete verification command:

```sh
npm run verify
```

This runs the repository checks in order:

- `npm run lint` lints application and tooling JavaScript.
- `npm run typecheck` type-checks the browser JavaScript.
- `npm run test` runs the behavioral tests.
- `npm run build` copies the deployable static files into the ignored `dist/` directory.

## Architecture

Notes is a dependency-free static browser application with no frontend framework, backend, or production dependencies:

- `index.html` defines the application structure and accessible controls.
- `styles.css` contains presentation and responsive layout rules.
- `script.js` implements browser behavior and persists notes in `localStorage`.
- `test/` contains behavioral tests run with Node's built-in test runner and JSDOM.
- `scripts/build.mjs` copies the three static application files into `dist/`.

## Pull requests

Keep pull requests focused on the requested change and include relevant tests when behavior changes. Preserve note creation, restoration, editing, and deletion, as well as compatibility with the `notes-app.notes.v1` storage format, unless the change explicitly requires otherwise. Avoid unrelated runtime, tooling, dependency, or CI changes.
