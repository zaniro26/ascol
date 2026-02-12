const execa = require('execa');
const chalk = require('chalk');
const fs = require('fs-extra');
const os = require('os');
const path = require('path');

const { spawn } = require('child_process');

/**
 * Execute clasp commands
 */
function runClasp(args, options = {}) {
  return new Promise((resolve, reject) => {
    // Windows compatibility: shell: true is required for npm commands like 'clasp'
    const spawnOptions = { 
      shell: true,
      stdio: options.silent ? 'pipe' : 'inherit' 
    };

    const clasp = spawn('clasp', args, spawnOptions);

    let stdout = '';
    let stderr = '';

    if (options.silent) {
      clasp.stdout.on('data', (data) => { stdout += data.toString(); });
      clasp.stderr.on('data', (data) => { stderr += data.toString(); });
    }

    clasp.on('close', (code) => {
      if (code === 0) {
        resolve(options.silent ? stdout : '');
      } else {
        const errorMsg = options.silent ? stderr : `clasp exited with code ${code}`;
        reject(new Error(errorMsg));
      }
    });

    // Handle spawn errors (like command not found)
    clasp.on('error', (err) => {
      reject(new Error(`Failed to start clasp: ${err.message}`));
    });
  });
}

/**
 * Get all deployments as a JSON array
 * @returns {Promise<Object[]>}
 */
async function getDeployments() {
  const { stdout } = await execa('clasp', ['deployments', '--json'], { silent: true });
  return JSON.parse(stdout);
}

/**
 * Get the current version number for a specific deployment ID
 * @param {string} targetId 
 * @returns {Promise<number>}
 */
async function getVersionById(targetId) {
  const deployments = await getDeployments();
  const found = deployments.find(d => d.deploymentId === targetId);
  if (!found) throw new Error(`Deployment ID ${targetId} not found on Google Cloud.`);
  return found.versionNumber;
}

/**
 * Check if clasp login config file exists
 * @returns {Promise<boolean>}
 */
async function checkLogin() {
  const claspConfig = path.join(os.homedir(), '.clasprc.json');
  return await fs.pathExists(claspConfig);
}

/**
 * 
 */
const ensureLogin = async () => {
  const loginConfigPath = path.join(os.homedir(), '.clasprc.json');

  if (!(await checkLogin())) {
    console.error(chalk.red('\nError: Clasp login credentials not found.'));
    console.error(chalk.gray(`Checked for: ${loginConfigPath}`));
    console.error(chalk.yellow('Please run "clasp login" to authenticate with your Google account.\n'));
    process.exit(1);
  }
};

module.exports = { 
  runClasp, 
  getDeployments, 
  getVersionById, 
  checkLogin,
  ensureLogin
};