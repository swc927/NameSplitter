# Name Splitter handover

## Current state — 1 October 2026
- Repository: https://github.com/swc927/NameSplitter (existing public repository).
- Pulled default branch `main`, base commit `563350c`.
- Local feature branch: `fix/leading-name-prefixes`.
- User authorized pushing to the existing public repository and deploying to
  Netlify on 1 October 2026. Release prepared on the feature branch; production
  release uses `main` after checks pass.

## Architecture and setup
Static browser application: `index.html`, `style.css`, and `app.js`.
Open `index.html` in a browser. No install or build step is required.
`preprocessRaw` prepares separators and existing labels; `parseNames` handles
chunks, cleaning, formatting and duplicates; `runSplit` updates output and count.

## Completed change and decisions
`stripLeadingJunk` strips characters before the first Unicode letter, after
existing name-label cleanup and before formatting and duplicate detection.
This handles attached/spaced hashes, numbering, full-width numbering, bullets,
and repeated symbols without deleting punctuation inside names.
Output intentionally contains one unnumbered name per line.

## Screenshot investigation
The available screenshot shows retained numbering on several rows but no number
on row seven. Existing preprocessing strips only numbered markers with a matched
space and a limited letter range. Other marker-cleaning rules handle different
subsets, leaving inconsistent prefixes. The precise original input whitespace
cannot be recovered from screenshot pixels. Tests reproduce mixed prefix inputs
and confirm uniform output, including an eight-row output/count check.

## Verification
16 focused tests passed: requested Chinese and Latin cases, attached numbering,
full-width digits/spaces, mixed symbols, internal punctuation/combining accents,
duplicate options, empty marker entries, deceased/name labels, capitalisation,
and output/count updates. `node --check app.js` passed.
Run `node --test tests/name-cleaning.test.cjs` to repeat.
Tests use browser element stubs; real-browser clipboard/paste interaction was
not tested in this change.

## Deployment and next actions
Existing Netlify project: `name-splitter`, https://name-splitter.netlify.app.
Deploy only the runtime files `index.html`, `app.js`, and `style.css`.
Before each push, inspect the exact staged diff, run relevant checks and scan for
secrets. Do not publish the source screenshot or input records.
After deployment, verify live runtime assets match this release and recheck
name cleaning against the live script.

## Verified production release
- Source release commit: `bd37c56aeb623445ddd66f35cafdda0ef2e63d62`, pushed
  to `main` and verified against GitHub's remote reference.
- Netlify production deploy: `6abdb5c626ed97db0e397f26`, state `ready`.
- Published 1 October 2026 at 09:22 Singapore time.
- Live URL: https://name-splitter.netlify.app.
- All three live runtime files were retrieved and matched the local release
  byte for byte. 16 tests, JavaScript syntax, staged diff and secret checks passed.
- CLI link by Git remote found no configured connection. Linked explicitly to
  the existing site after all three prior live files matched repository `main`.
  Future GitHub pushes should not be assumed to auto-deploy; repeat an explicit
  CLI deployment from `dist` containing only the three runtime files.
