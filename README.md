# UNDER CONSTRUCTION

# lilFetch
An MCP (Model Context Protocol) server that scrapes webpages using [crawl4ai](https://github.com/unclecode/crawl4ai) and Playwright for more robust scraping.

## Features
- Scrape multiple URLs to structured Markdown.
- Handles dynamic content with browser automation (via Playwright).
- Outputs timestamped filenames with domain and description.
- Easy integration with VS Code via MCP.

## Quick Start (For JS/Node Developers)
No Python knowledge required! Just clone, install via npm, and configure in VS Code. The recommended global install makes it usable in *any* workspace without path management.

### Option 1: Global Install (Recommended - Effortless, Cross-Workspace Use)
Install once globally, then `npx lilfetch` works anywhere. The Python backend (`.venv`/deps) stays in the cloned repo.

1. **Clone the Repo** (do this once; keep the folder for the backend):
   ```
   git clone https://github.com/yourusername/webpage-to-readme-scraper.git lilfetch-install
   cd lilfetch-install
   ```

2. **Install Node Dependencies** (sets up Python backend automatically):
   ```
   npm install
   ```
   - Runs `postinstall` to create `.venv`, install `crawl4ai`/Playwright, and browsers.
   - Requires: Node.js 14+, Python 3.8+ (auto-detected; install via [python.org](https://python.org) or `brew install python` on macOS if missing). First run takes 1-2 min.

3. **Install Globally** (one-time; enables `npx lilfetch` in any terminal/workspace):
   ```
   npm run global-install
   ```
   - Or: `npm install -g .`
   - **macOS/Linux Note**: If permission error, configure user-owned globals (one-time):
     ```
     mkdir ~/.npm-global
     npm config set prefix '~/.npm-global'
     export PATH=~/.npm-global/bin:$PATH  # Add to ~/.zshrc or ~/.bash_profile
     ```
     Then rerun without `sudo`. On Windows, use admin prompt if needed.

4. **Configure in Any VS Code Workspace** (add to `.vscode/mcp.json` or global MCP settings):
   ```jsonc
   {
     "servers": {
       "lilFetch": {
         "type": "stdio",
         "command": "npx",
         "args": ["lilfetch"]
       }
     }
   }
   ```
   - No paths or variables! Reload window (Cmd+Shift+P > "Developer: Reload Window") to activate.

5. **Test It**:
   - Manual: In any terminal, `npx lilfetch` (starts server; send MCP JSON to stdin or Ctrl+C to stop).
   - In Copilot Chat (any workspace): "Use lilFetch to scrape https://example.com to Markdown." Should output JSON with scraped Markdown.
   - Verify setup: If errors, check console for Python/browser issues (see Troubleshooting).

### Option 2: Local Tarball (Fallback - Per-Project Isolation)
If avoiding globals (e.g., restricted env), use the tgz method:

1. Follow steps 1-2 from Option 1.
2. **Pack**:
   ```
   npm run pack
   ```
   - Creates `lilfetch-1.0.0.tgz`.

3. **Configure in Target Workspace** (use absolute path to tgz):
   ```jsonc
   {
     "servers": {
       "lilFetch": {
         "type": "stdio",
         "command": "npx",
         "args": ["/absolute/path/to/lilfetch-install/lilfetch-1.0.0.tgz"]
       }
     }
   }
   ```
4. Test as above; repack after changes.

## Tool Usage
The server exposes one tool: `scrape_to_markdown`
- **Parameters**:
  - `urls`: Array of strings (required) – URLs to scrape.
  - `description`: String (optional, default "scrape") – Label for output files.
- **Output**: JSON array with scraped Markdown, success status, and filename suggestions.

Example call (in MCP context):
```json
{
  "name": "scrape_to_markdown",
  "arguments": {
    "urls": ["https://example.com"],
    "description": "example-site"
  }
}
```

## Development
- Edit `mcp_server.py` for Python logic.
- Update `bin/lilfetch.js` for wrapper changes.
- Bump version in `package.json`, then `npm run pack`.
- For global testing: `npm install -g .` then `npx lilfetch`.

## Requirements
- Node.js >=14
- Python 3.8+ (with pip)
- ~200MB disk for browsers (Playwright)

## Troubleshooting
- **Python not found**: Install Python 3.8+ and ensure `python3` is in PATH.
- **Venv issues**: Delete `.venv` and rerun `npm install`.
- **Browser errors**: Run `python -m playwright install` manually in `.venv/bin`.
- **Windows users**: Use `python` instead of `python3` if needed; adjust paths in `bin/lilfetch.

License: MIT
