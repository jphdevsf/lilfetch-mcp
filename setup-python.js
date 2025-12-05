#!/usr/bin/env node

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Detect install type and set paths
const isGlobalInstall = process.env.npm_config_global === 'true';
const VENV_PATH = isGlobalInstall ? path.join(os.homedir(), '.lilfetch-venv') : path.join(process.cwd(), '.venv');
const REQ_FILE = path.join(__dirname, '..', 'requirements.txt');

function setupPython() {
  console.error('lilFetch: Setting up Python environment...');

  // Check for Python 3.8+
  const pythonCheck = spawnSync('python3', ['--version']);
  if (pythonCheck.status !== 0) {
    // Detect pyenv
    const pyenvCheck = spawnSync('pyenv', ['--version']);
    if (pyenvCheck.status === 0) {
      console.error('lilFetch: Python 3 not found. If using pyenv, install or switch to Python 3.8+ globally and re-run npm install');
    } else {
      console.error('lilFetch: Python 3 not found. Please install Python 3.8+ from python.org or via Homebrew: brew install python');
    }
    process.exit(1);
  }
  const version = pythonCheck.stdout.toString().trim();
  // Parse Python version (e.g., "Python 3.12.0" -> major.minor)
  const pyVersionStr = version.replace(/^Python /, '');
  const match = pyVersionStr.match(/^(\d+)\.(\d+)/);
  if (!match || parseInt(match[1]) !== 3 || parseInt(match[2]) < 8) {
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
    const venvLocation = isGlobalInstall ? 'user home (~/.lilfetch-venv)' : 'repo root (.venv)';
    console.error('lilFetch: Virtual environment created at', venvLocation);
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
    const manualCmd = isGlobalInstall ? path.join(os.homedir(), '.lilfetch-venv', pythonBin) : path.join(process.cwd(), '.venv', pythonBin);
    console.error('lilFetch: Failed to install Playwright browsers. Run manually:', manualCmd, '-m playwright install');
    // Don't exit, as it might work without on some systems
  } else {
    console.error('lilFetch: Playwright browsers installed.');
  }

  console.error('lilFetch: Setup complete!');
}

// Run it
setupPython();
console.log('Python setup complete for lilFetch!');