# Team collaboration (short)

## Frontend
- Only the **router owner** edits `frontend/src/App.jsx` to register routes.
- Everyone else: put new screens in `frontend/src/pages/` and components in `frontend/src/components/`.
- If you add API helpers, create separate files under `frontend/src/services/` (e.g. `authApi.js`, `photosApi.js`).
- Before committing: in `frontend/` run `npm run format`.

## Backend
- Put new code in feature packages so files don’t clash:
  - `au.edu.rmit.sept.webapp.controller.<feature>`
  - `au.edu.rmit.sept.webapp.model.<feature>`
  - `au.edu.rmit.sept.webapp.repo.<feature>`
  - `au.edu.rmit.sept.webapp.dto.<feature>`
- Endpoints live under `/api/<feature>/...`.
- DB is managed by Hibernate (`ddl-auto=update`). If you add fields/tables, test locally and mention it in your PR.

## Branches
- Use short branches: `feat/<area>-<desc>` (e.g., `feat/auth-login`), `fix/...`, `chore/...`.
- Rebase/pull `main` before opening a PR.
