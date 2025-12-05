# UNDER CONSTRUCTION

# lilFetch
An MCP (Model Context Protocol) server that scrapes webpages using [crawl4ai](https://github.com/unclecode/crawl4ai) and Playwright for more robust scraping. Tested on CoPilot in VSCode but may work for others.

## Features
- Enables html and/or text scraping of one or more urls directly in your chat prompt. Use the scraped response in followup queries for market research summarization, context for new file creation, etc.
- Leverages Playwright and a headless instance of Chromium to load JS heavy sites and web apps where basic `#fetch` and `curl` commands fall short.
- Strong focus on minimal commands and configuration to install and get scraping.

## Prerequisites

Before installing, ensure:
- **Node.js 14+**: Download from [nodejs.org](https://nodejs.org) or via Homebrew (`brew install node` on macOS).
- **Python 3.10+**: Auto-detected during setup. Install from [python.org](https://python.org) or Homebrew (`brew install python@3.12` on macOS). If using pyenv, set a 3.10+ version active (`pyenv global 3.12.0`).
- **First Run Time**: Setup downloads ~200MB (Playwright browsers) and takes 1-2 minutes.

## Installation

Install globally for use across workspaces, or restrict to local installation if you just want to test in this repo or enhance it further.

### Option 1: Global Install
For running `npx lilfetch` from any directory (portable CLI).

1. Clone the Repo
   ```
   git clone https://github.com/jphdevsf/lilfetch-mcp.git lilfetch-mcp
   cd lilfetch-mcp
   ```

2. Install Globally
   ```
   npm run global-install
   ```
   - Sets up Python venv in `~/.lilfetch-venv` (user-wide).

3. Configure in Any VS Code Workspace (add to `.vscode/mcp.json` or global MCP settings):
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

4. Test It
   - In new terminal window, run `npx lilfetch` to start MCP server.
   - In VS Code, prompt with something like...
   ```
   Use lilFetch to scrape top news headlines from www.cnn.com and write to a markdown file in root of my repo.
   ```

### Option 2: Local Install
For testing/extending in the repo.

1. Clone the Repo
   ```
   git clone https://github.com/jphdevsf/lilfetch-mcp.git lilfetch-mcp
   cd lilfetch-mcp
   ```

2. Install Locally
   ```
   npm install
   ```
   - Sets up `./node_modules/lilfetch/` and `.bin/lilfetch`.
   - Python venv in repo `.venv` (local to this project).

3. MCP.json Workspace Configuration
   Navigate to `.vscode/mcp.json` (create if missing) and add:
   ```jsonc
   {
     "servers": {
       "lilFetch": {
         "type": "stdio",
         "command": "node",
         "args": ["bin/lilfetch.js"]
       }
     }
   }
   ```

   **Note:** Ensure `bin/lilfetch.js` is executable: Run `chmod +x bin/lilfetch.js` in the terminal.

4. Test It
   - In new terminal window, navigate to this repo and run `npm run dev` or `./node_modules/.bin/lilfetch`.
   - In VS Code, prompt with something like...
   ```
   Use lilFetch to scrape top news headlines from www.cnn.com and write to a markdown file in root of my repo.
   ```

## Development
- Edit `mcp_server.py` for Python logic.
- Update `bin/lilfetch.js` for wrapper changes.
- Bump version in `package.json`, then `npm run pack`.
- For global testing: `npm install -g .` then `npx lilfetch`.

## Troubleshooting

- **Permission Errors (Global Install)**: See Prerequisites for user-owned NPM setup. Avoid sudo—use the config steps.
- **Python Not Found/Version Error**: Ensure Python 3.8+ is in PATH. For pyenv: `pyenv install 3.12.0 && pyenv global 3.12.0`, then re-run install. Check: `python3 --version`.
- **Venv/Deps Fail**: For local: Delete `.venv` and re-run `npm install`. For global: Delete `~/.lilfetch-venv` and re-run `npm install -g .`. Manual fix (local): `python3 -m venv .venv && .venv/bin/pip install -r requirements.txt && .venv/bin/python -m playwright install`. Manual fix (global): `python3 -m venv ~/.lilfetch-venv && ~/.lilfetch-venv/bin/pip install -r requirements.txt && ~/.lilfetch-venv/bin/python -m playwright install`.
- **Playwright Browsers Missing**: Run `python -m playwright install` in the venv (or manually as logged).
- **MCP Not Detected in VS Code**: Restart VS Code after config; ensure workspace is open correctly.
- **Uninstall**:
  - Global: `npm uninstall -g lilfetch` + `rm -rf ~/.lilfetch-venv`.
  - Local: `rm -rf node_modules package-lock.json .venv`.

License: MIT
