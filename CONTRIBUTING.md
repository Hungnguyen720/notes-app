# Contributing

## Local development

Local development uses Node.js 22.14.0 and npm 10.9.2. Select the pinned
Node.js version, then install the committed dependency graph with the supported
clean installation command:

```sh
nvm use
npm ci
```

Notes is a dependency-free static browser application. Keep its existing
architecture: `index.html` defines the structure, `styles.css` provides the
presentation, and `script.js` implements browser behavior and `localStorage`
persistence. Do not introduce a frontend framework, backend, production
dependency, or remote service unless the change explicitly requires one.

## Verification

Before opening a pull request, run the required complete verification command:

```sh
npm run verify
```

## Pull requests

- Keep each pull request focused on its stated purpose and document what changed.
- Preserve existing Notes behavior and storage unless the change explicitly
  requires otherwise.
- Add or update behavioral tests when behavior changes. Documentation-only work
  should not alter runtime files, dependencies, package scripts, or CI.
- Include the verification performed and any known risks in the pull-request
  description.
