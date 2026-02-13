const execa = require('execa');
const chalk = require('chalk');
const fs = require('fs-extra');
const os = require('os');
const path = require('path');

/**
 * Execute clasp commands using execa.
 * This handles cross-platform path resolution and safe argument passing.
 * @param {string[]} args - Command line arguments for clasp.
 * @param {Object} options - Execution options.
 * @param {boolean} options.silent - If true, suppresses output to the console.
 * @returns {Promise<string>} - The standard output of the command.
 */
function runClasp(args, options = {}) {
  // execa handles '.cmd' resolution automatically on Windows when shell: false
  const child = execa('clasp', args, {
    shell: false,
    all: true
  });

  let stdout = '';

  // Stream output to process.stdout in real-time unless silent option is enabled
  child.stdout.on('data', (data) => {
    stdout += data.toString();
    if (!options.silent) {
      process.stdout.write(data);
    }
  });

  // Stream errors/warnings to process.stderr
  child.stderr.on('data', (data) => {
    if (!options.silent) {
      process.stderr.write(data);
    }
  });

  return child.then((result) => {
    // Return the accumulated stdout on success
    return stdout;
  }).catch((err) => {
    // Standardize error reporting
    throw new Error(err.stderr || `Clasp execution failed: ${err.message}`);
  });
}

/**
 * Fetch all remote deployments as a JSON array.
 * @returns {Promise<Object[]>}
 */
async function getDeployments() {
  const stdout = await runClasp(['deployments', '--json'], { silent: true });
  try {
    return JSON.parse(stdout);
  } catch (e) {
    throw new Error('Failed to parse remote deployments list.');
  }
}

/**
 * Get the version number for a specific deployment ID.
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
 * Check if the clasp credentials file exists in the home directory.
 * @returns {Promise<boolean>}
 */
async function checkLogin() {
  const claspConfig = path.join(os.homedir(), '.clasprc.json');
  return await fs.pathExists(claspConfig);
}

/**
 * Ensure the user is logged in. Exits process if credentials are missing.
 */
const ensureLogin = async () => {
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