# Development notes

Jadepath is a SvelteKit 3 / Svelte 5 / TypeScript prototype for a kung fu school. The demo uses fictional records stored in the browser. It does not connect to a live school system.

## Current boundaries

- `src/lib/brand.ts` holds the working name and fictional school identity.
- `src/lib/domain.ts` holds students, classes, attendance, practice milestones, and record operations.
- `src/lib/demo.ts` creates fictional data relative to the local date.
- `src/lib/repository.ts` is the browser-storage adapter. It validates restored data and reports storage errors.
- The page creates its own state after mounting. No mutable student data is shared across server requests.
- Profile forms edit a draft. Canceling a form leaves saved data alone.
- Attendance is unique per student, class, and date. Undo affects only that check-in.
- The demo uses three daily class templates. It does not yet model cancellations, holidays, capacity enforcement, changing enrollment over time, or scheduled class occurrences.
- Dates follow the viewer's local timezone. The live version needs a school timezone.
- A browser refresh returns to Overview. Saved student and attendance changes persist in that browser.
- The native dialog provides keyboard focus containment and Escape support. Focus returns to the opening control when a dialog closes.
- `src/app.css` holds layout and typography. `src/theme.css` holds Midnight Jade colors, gradients, corners, and shadows. Theme tokens provide a starting point for a future light mode.
- Glass dialogs fall back to an opaque gradient when blur is unavailable or reduced transparency is requested. Keyboard focus remains visible and forced-colors mode restores system borders.
- Google Fonts supplies DM Sans, with local font fallbacks. Font hosting can change before publication.

## Before a live school uses it

Work through the school's student fields, curriculum, role permissions, and sign-in flow. Add authenticated school accounts and an API-backed repository with server validation, school isolation, and backups. Model dated class sessions and enrollment history before relying on historical attendance totals. Choose hosting and a matching SvelteKit adapter after the deployment requirements are decided.

The demo is not ready for real student information. No backend, account access, payments, or external messaging is connected.

## Local tools

- `npm run dev -- --host 127.0.0.1 --port 5174` starts the local preview.
- `npm run validate` checks types and Svelte diagnostics, runs the domain and storage tests, and builds the app.
- `npm run format:check` checks source formatting.
- `npm run format` formats the source.

After adding dependencies, restart the development server so SvelteKit's generated module files are refreshed.
