const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const { runClasp } = require('../utils/clasp');
const { getConfig, COMMAND_NAME } = require('../utils/config');

/**
 * Fetch the latest appsscript.json from Google and sync it to src/ and dist/
 * using a temporary workspace to bypass rootDir restrictions.
 */
async function pullConfig() {
  const tmpDir = `.${COMMAND_NAME}_tmp`;
  
  console.log(chalk.blue('Fetching the latest appsscript.json from Google...'));

  try {
    const { srcDir, distDir } = await getConfig();

    // 1. Create temporary working folder
    if (await fs.pathExists(tmpDir)) await fs.remove(tmpDir);
    await fs.ensureDir(tmpDir);

    // 2. Copy .clasp.json to tmp folder
    if (!(await fs.pathExists('.clasp.json'))) {
      throw new Error(`.clasp.json not found. Please run this in a ${COMMAND_NAME} create or clasp clone.`);
    }
    const claspConfig = await fs.readJson('.clasp.json');
    
    // 3. Remove 'rootDir' to pull files into the tmpDir directly
    delete claspConfig.rootDir;
    await fs.writeJson(path.join(tmpDir, '.clasp.json'), claspConfig);

    // 4. Run 'clasp pull' inside the tmp folder
    console.log(chalk.gray('Executing clasp pull in temporary workspace...'));
    const originalCwd = process.cwd();
    
    try {
      process.chdir(tmpDir);
      await runClasp(['pull']);
    } finally {
      process.chdir(originalCwd);
    }

    // 5. Copy appsscript.json to dist/ and src/
    const downloadedJson = path.join(tmpDir, 'appsscript.json');
    
    if (await fs.pathExists(downloadedJson)) {
      await fs.ensureDir(distDir);
      await fs.ensureDir(srcDir);
      
      await fs.copy(downloadedJson, path.join(distDir, 'appsscript.json'));
      await fs.copy(downloadedJson, path.join(srcDir, 'appsscript.json'));
      
      console.log(chalk.green(`✔ Successfully synchronized appsscript.json to ${srcDir}/ and ${distDir}/`));
    } else {
      throw new Error('appsscript.json was not found in the downloaded files.');
    }

  } catch (error) {
    console.error(chalk.red('\nFailed to pull configuration:'), error.message);
  } finally {
    // 6. Cleanup: Remove temporary folder
    if (await fs.pathExists(tmpDir)) {
      await fs.remove(tmpDir);
      console.log(chalk.gray(`Checked: Temporary folder ${tmpDir} removed.`));
    }
  }
}

module.exports = pullConfig;