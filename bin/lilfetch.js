#!/usr/bin/env node

const { spawnSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Prefer local venv if in repo, fallback to global for portability
const LOCAL_VENV_DIR = path.join(process.cwd(), '.venv');
const GLOBAL_VENV_DIR = path.join(os.homedir(), '.lilfetch-venv');
const VENV_PATH = fs.existsSync(LOCAL_VENV_DIR) ? LOCAL_VENV_DIR : GLOBAL_VENV_DIR;
const REQ_FILE = path.join(__dirname, '..', 'requirements.txt');
const MCP_SCRIPT = path.join(__dirname, '..', 'mcp_server.py');

// Setup function: Create venv, install deps, install browsers if needed (idempotent)
function setupPython() {
  console.error('lilFetch: Setting up Python environment...');

  const isWindows = os.platform() === 'win32';

  // Detect and validate Python 3.10+
  let systemPythonBin;
  let version;
  if (isWindows) {
    // Windows: Try Python Launcher first
    const pyCheck = spawnSync('py', ['-3', '--version']);
    if (pyCheck.status === 0) {
      systemPythonBin = 'py -3';
      version = pyCheck.stdout.toString().trim();
    } else {
      // Fallback to 'python'
      const pythonCheck = spawnSync('python', ['--version']);
      if (pythonCheck.status === 0) {
        systemPythonBin = 'python';
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
          systemPythonBin = bin;
          version = ver;
          break;
        }
      }
    }
  }

  if (!systemPythonBin || !version) {
    let installMsg = 'lilFetch: Python 3.10+ not found.';
    if (isWindows) {
      installMsg += ' Install from python.org or Microsoft Store, then re-run.';
    } else {
      installMsg += ' Install via Homebrew: brew install python@3.12 (or python@3.11), then add to PATH and re-run.';
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
  console.error(`lilFetch: Python ${systemPythonBin} version OK: ${version}`);

  // Ensure venv exists
  if (!fs.existsSync(VENV_PATH)) {
    const venvArgs = isWindows ? ['-3', '-m', 'venv', VENV_PATH] : ['-m', 'venv', VENV_PATH];
    const venvCreate = spawnSync(systemPythonBin, venvArgs);
    if (venvCreate.status !== 0) {
      console.error('lilFetch: Failed to create virtual environment.');
      process.exit(1);
    }
    const venvLocation = fs.existsSync(path.join(process.cwd(), '.venv')) ? 'repo root (.venv)' : 'user home (~/.lilfetch-venv)';
    console.error('lilFetch: Virtual environment created at', venvLocation);
  } else {
    console.error('lilFetch: Using existing virtual environment.');
  }

  // Install/upgrade requirements (always run for idempotency)
  const venvPythonDir = isWindows ? 'Scripts' : 'bin';
  const venvPython = path.join(VENV_PATH, venvPythonDir, isWindows ? 'python.exe' : 'python');
  const venvPip = path.join(VENV_PATH, venvPythonDir, isWindows ? 'pip.exe' : 'pip');

  // Upgrade pip
  spawnSync(venvPip, ['install', '--upgrade', 'pip'], { stdio: 'inherit' });

  // Install requirements
  if (fs.existsSync(REQ_FILE)) {
    const installReq = spawnSync(venvPip, ['install', '-r', REQ_FILE], { stdio: 'inherit' });
    if (installReq.status !== 0) {
      console.error('lilFetch: Failed to install Python dependencies.');
      process.exit(1);
    }
    console.error('lilFetch: Python dependencies installed/updated.');
  }

  // Install Playwright browsers (for crawl4ai) - idempotent
  const pwInstall = spawnSync(venvPython, ['-m', 'playwright', 'install'], { stdio: 'inherit' });
  if (pwInstall.status !== 0) {
    const manualVenvPython = path.join(VENV_PATH, venvPythonDir, isWindows ? 'python.exe' : 'python');
    const manualArgs = isWindows ? [] : ['-m'];
    manualArgs.push('playwright', 'install');
    console.error('lilFetch: Failed to install Playwright browsers. Run manually:', manualVenvPython, manualArgs.join(' '));
    // Don't exit, as it might work without on some systems (e.g., if browsers are pre-installed)
  } else {
    console.error('lilFetch: Playwright browsers installed/verified.');
  }

  console.error('lilFetch: Setup complete!');
}

// Run setup on first invocation (or always, it's idempotent)
setupPython();

// Spawn the Python MCP server, forwarding stdio
const venvPythonDir = os.platform() === 'win32' ? 'Scripts' : 'bin';
const venvPython = path.join(VENV_PATH, venvPythonDir, os.platform() === 'win32' ? 'python.exe' : 'python');

const pythonProc = spawn(venvPython, [MCP_SCRIPT], {
  stdio: 'inherit',
  env: {
    ...process.env,
    PYTHONPATH: path.dirname(MCP_SCRIPT)
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