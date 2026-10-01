# Name Splitter by SWC

A tiny web app that turns slash separated names into one per line and auto-copies the result to your clipboard.

## Features
- Paste or type names separated by `/`, `,`, `|`, or new lines
- One-click split with automatic copy to clipboard
- Count badge for total names
- Optional de-duplication and space trimming
- Pure HTML CSS and JavaScript

## Quick start
1. Open `index.html` in your browser
2. Paste: `陈怀广/陈美玲/陈启濠/陈启扬/梁惠玲/陈功顺`
3. Click Split now

## Keyboard shortcuts
- Control plus Enter or Command plus Enter to split and copy

## Deploy to GitHub Pages
```bash
git init
git add .
git commit -m "Initial commit Name Splitter by SWC"
git branch -M main
git remote add origin https://github.com/<your-username>/name-splitter-by-swc.git
git push -u origin main
```
Then in GitHub repo settings enable Pages to deploy from the `main` branch root.

## License
MIT

## Input cleaning
Leading numbering, bullets, hashes, brackets and other symbols before the first
Unicode letter are removed from each name. For example, `7） 林俊宏` becomes
`林俊宏`, and `8) Ingrid Jonker-Kikkert` becomes `Ingrid Jonker-Kikkert`.
Punctuation inside names is retained. Output is one unnumbered name per line.
Cleaning happens before duplicate detection and does not require Trim spaces.

## Tests
With Node.js installed, run:
```bash
node --test tests/name-cleaning.test.cjs
node --check app.js
```
No dependencies or build step are required. Tests exercise the real application
script with lightweight browser element stubs, including output and count updates.
