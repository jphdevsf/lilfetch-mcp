#!/usr/bin/env node

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Detect install type and set paths
const isGlobalInstall = process.env.npm_config_global === 'true';
const VENV_PATH = isGlobalInstall ? path.join(os.homedir(), '.lilfetch-venv') : path.join(process.cwd(), '.venv');
const REQ_FILE = path.join(__dirname, '..', 'requirements.txt');

const installScope = isGlobalInstall ? 'globally' : 'locally';
const installType = isGlobalInstall ? 'Global' : 'Local';

function installPythonDeps() {
  console.error('lilFetch: Setting up Python environment...');
  console.error('lilFetch: ' + installType + ' installation detected.');

  // Detect and validate Python 3.10+
  let pythonBin;
  let version;
  const isWindows = os.platform() === 'win32';

  if (isWindows) {
    // Windows: Try Python Launcher first
    const pyCheck = spawnSync('py', ['-3', '--version']);
    if (pyCheck.status === 0) {
      pythonBin = 'py -3';
      version = pyCheck.stdout.toString().trim();
    } else {
      // Fallback to 'python'
      const pythonCheck = spawnSync('python', ['--version']);
      if (pythonCheck.status === 0) {
        pythonBin = 'python';
        version = pythonCheck.stdout.toString().trim();
      }
    }
  } else {
    // macOS/Linux: Try multiple Python 3 versions in order of preference
    const possibleBins = ['python3.12', 'python3.11', 'python3', 'python'];
    for (const bin of possibleBins) {
      const check = spawnSync(bin, ['--version']);
      if (check.status === 0) {
        const ver = check.stdout.toString().trim();
        // Quick check if 3.10+
        const pyVersionStr = ver.replace(/^Python /, '');
        const match = pyVersionStr.match(/^(\d+)\.(\d+)/);
        if (match && parseInt(match[1]) === 3 && parseInt(match[2]) >= 10) {
          pythonBin = bin;
          version = ver;
          break;
        }
      }
    }
  }

  if (!pythonBin || !version) {
    let installMsg = 'lilFetch: Python 3.10+ not found.';
    if (isWindows) {
      installMsg += ' Install from python.org or Microsoft Store, then re-run npm install.';
    } else {
      installMsg += ' Install via Homebrew: brew install python@3.12 (or python@3.11), then add to PATH and re-run npm install.';
    }
    // Check for pyenv
    const pyenvCheck = spawnSync('pyenv', ['--version']);
    if (pyenvCheck.status === 0) {
      installMsg += ' If using pyenv, run: pyenv install 3.12.0 && pyenv global 3.12.0';
    }
    console.error(installMsg);
    process.exit(1);
  }

  // Parse version (e.g., "Python 3.12.0" -> 3.12)
  const pyVersionStr = version.replace(/^Python /, '');
  const match = pyVersionStr.match(/^(\d+)\.(\d+)/);
  if (!match || parseInt(match[1]) !== 3 || parseInt(match[2]) < 10) {
    console.error(`lilFetch: Requires Python 3.10+. Detected: ${version}.`);
    if (isWindows) {
      console.error('Install Python 3.10+ from python.org and ensure "py" or "python" is in PATH.');
    } else {
      console.error('Install via Homebrew: brew install python@3.12 (or python@3.11) and add to PATH.');
    }
    process.exit(1);
  }
  console.error(`lilFetch: Python ${pythonBin} version OK: ${version}`);

  // Create venv if not exists
  if (!fs.existsSync(VENV_PATH)) {
    const venvArgs = isWindows ? ['-3', '-m', 'venv', VENV_PATH] : ['-m', 'venv', VENV_PATH];
    const venvCreate = spawnSync(pythonBin, venvArgs);
    if (venvCreate.status !== 0) {
      console.error(`lilFetch: Failed to create virtual environment ${installScope}.`);
      process.exit(1);
    }
    const venvLocation = isGlobalInstall ? 'user home (~/.lilfetch-venv)' : 'repo root (.venv)';
    console.error('lilFetch: Virtual environment created at', venvLocation);
  }

  // Activate venv and install requirements
  const venvPythonDir = isWindows ? 'Scripts' : 'bin';
  const venvPython = path.join(VENV_PATH, venvPythonDir, isWindows ? 'python.exe' : 'python');
  const venvPip = path.join(VENV_PATH, venvPythonDir, isWindows ? 'pip.exe' : 'pip');

  // Upgrade pip (use venv's pip directly)
  const pipUpgrade = spawnSync(venvPip, ['install', '--upgrade', 'pip'], { stdio: 'inherit' });

  // Install requirements
  if (fs.existsSync(REQ_FILE)) {
    const installReq = spawnSync(venvPip, ['install', '-r', REQ_FILE], { stdio: 'inherit' });
    if (installReq.status !== 0) {
      console.error(`lilFetch: Failed to install Python dependencies ${installScope}.`);
      process.exit(1);
    }
    console.error(`lilFetch: Python dependencies installed ${installScope}.`);
  }

    // Explicitly install Playwright Python package (for crawl4ai)
  const installPw = spawnSync(venvPip, ['install', 'playwright'], { stdio: 'inherit' });
  if (installPw.status !== 0) {
    console.error('lilFetch: Failed to install Playwright Python package.');
    process.exit(1);
  }
  console.error('lilFetch: Playwright Python package installed.');

  // Install Playwright browsers (for crawl4ai) - cross-platform
  const pwArgs = isWindows ? ['-m', 'playwright', 'install'] : ['-m', 'playwright', 'install'];
  const pwInstall = spawnSync(venvPython, pwArgs, { stdio: 'inherit' });
  if (pwInstall.status !== 0) {
    const manualCmd = isGlobalInstall ? path.join(os.homedir(), '.lilfetch-venv', venvPythonDir, isWindows ? 'python.exe' : 'python') : path.join(process.cwd(), '.venv', venvPythonDir, isWindows ? 'python.exe' : 'python');
    console.error(`lilFetch: Failed to install Playwright browsers ${installScope}. Run manually: ${manualCmd} ${isWindows ? '-m' : ''} playwright install`);
    // Don't exit, as it might work without on some systems (e.g., if browsers are pre-installed)
  } else {
    console.error(`lilFetch: Playwright browsers successfully installed ${installScope}.`);
  }

  console.error(`lilFetch: ${installType} setup complete!`);
}

// Run it
installPythonDeps();