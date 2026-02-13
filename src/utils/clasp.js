const execa = require('execa');
const chalk = require('chalk');
const fs = require('fs-extra');
const os = require('os');
const path = require('path');

const { spawn } = require('child_process');
const which = require('which');

/**
 * Execute clasp commands
 */
function runClasp(args, options = {}) {
  // execa は Promise を返すので、async/await も使えますが
  // 既存の Promise 形式に合わせた書き方にします
  const child = execa('clasp', args, {
    shell: false, // 安全。execaならWindowsでもこれで動く
    all: true     // stdout と stderr を統合して取得
  });

  let stdout = '';

  // リアルタイムに画面に出力する（deploy時の進捗が見える）
  child.stdout.on('data', (data) => {
    stdout += data.toString();
    if (!options.silent) process.stdout.write(data);
  });

  child.stderr.on('data', (data) => {
    // 警告やエラーも画面に出す
    if (!options.silent) process.stderr.write(data);
  });

  return child.then((result) => {
    // 成功時：蓄積した stdout を返す
    return stdout;
  }).catch((err) => {
    // 失敗時：エラーを投げる
    throw new Error(err.stderr || err.message);
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