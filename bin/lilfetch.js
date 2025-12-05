#!/usr/bin/env node

const { spawnSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Paths (relative to repo root, assuming cwd is repo)
const REPO_ROOT = process.cwd();
const VENV_PATH = path.join(REPO_ROOT, '.venv');
const REQ_FILE = path.join(REPO_ROOT, 'requirements.txt');
const MCP_SCRIPT = path.join(REPO_ROOT, 'mcp_server.py');

// Setup function: Create venv, install deps, install browsers if needed
function setupPython() {
  console.error('lilFetch: Setting up Python environment...');

  // Check for Python 3.8+
  const pythonCheck = spawnSync('python3', ['--version']);
  if (pythonCheck.status !== 0) {
    console.error('lilFetch: Python 3 not found. Please install Python 3.8+ from python.org or via Homebrew: brew install python');
    process.exit(1);
  }
  const version = pythonCheck.stdout.toString().trim();
  if (!version.includes('3.8') && !version.includes('3.9') && !version.includes('3.10') && !version.includes('3.11') && !version.includes('3.12')) {
    console.error('lilFetch: Requires Python 3.8+. Detected:', version);
    process.exit(1);
  }
  console.error('lilFetch: Python version OK:', version);

  // Create venv if not exists
  if (!fs.existsSync(VENV_PATH)) {
    const venvCreate = spawnSync('python3', ['-m', 'venv', VENV_PATH]);
    if (venvCreate.status !== 0) {
      console.error('lilFetch: Failed to create virtual environment.');
      process.exit(1);
    }
    console.error('lilFetch: Virtual environment created.');
  }

  // Activate venv and install requirements
  const pythonBin = os.platform() === 'win32' ? 'Scripts/python.exe' : 'bin/python';
  const pipBin = os.platform() === 'win32' ? 'Scripts/pip.exe' : 'bin/pip';
  const venvPython = path.join(VENV_PATH, pythonBin);
  const venvPip = path.join(VENV_PATH, pipBin);

  // Upgrade pip
  spawnSync(venvPip, ['install', '--upgrade', 'pip'], { stdio: 'inherit' });

  // Install requirements
  if (fs.existsSync(REQ_FILE)) {
    const installReq = spawnSync(venvPip, ['install', '-r', REQ_FILE], { stdio: 'inherit' });
    if (installReq.status !== 0) {
      console.error('lilFetch: Failed to install Python dependencies.');
      process.exit(1);
    }
    console.error('lilFetch: Python dependencies installed.');
  }

  // Install Playwright browsers (for crawl4ai)
  const pwInstall = spawnSync(venvPython, ['-m', 'playwright', 'install'], { stdio: 'inherit' });
  if (pwInstall.status !== 0) {
    console.error('lilFetch: Failed to install Playwright browsers. Run manually: python -m playwright install');
    // Don't exit, as it might work without on some systems
  } else {
    console.error('lilFetch: Playwright browsers installed.');
  }

  console.error('lilFetch: Setup complete!');
}

// Run setup on first invocation (or always, it's idempotent)
setupPython();

// Spawn the Python MCP server, forwarding stdio
const pythonBin = os.platform() === 'win32' ? 'Scripts/python.exe' : 'bin/python';
const venvPython = path.join(VENV_PATH, pythonBin);

const pythonProc = spawn(venvPython, [MCP_SCRIPT], {
  stdio: 'inherit',
  env: {
    ...process.env,
    PYTHONPATH: REPO_ROOT
  }
});

pythonProc.on('error', (err) => {
  console.error('lilFetch: Failed to start Python process:', err.message);
  process.exit(1);
});

pythonProc.on('close', (code) => {
  process.exit(code);
});

// Forward signals
process.on('SIGINT', () => pythonProc.kill('SIGINT'));
process.on('SIGTERM', () => pythonProc.kill('SIGTERM'));