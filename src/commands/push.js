const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const { runClasp } = require('../utils/clasp');
const { getConfig, COMMAND_NAME } = require('../utils/config');
const build = require('./build');

async function push(options) {
  try {
    const { build: buildConfig } = await getConfig(); 
    const { distDir } = buildConfig; // Get dynamic distDir

    // Check for clasp project file (.clasp.json)
    if (!(await fs.pathExists('.clasp.json'))) {
      throw new Error(`.clasp.json not found. Please run "${COMMAND_NAME} create" or "clasp setting".'`);
    }

    // Run build unless skipped
    if (!options.skipBuild) {
      await build();
    } else {
      console.log(chalk.yellow('Skipping build...'));
    }

    // Check if distDir exists before pushing
    if (!(await fs.pathExists(distDir))) {
      throw new Error(`Distribution directory "${distDir}" not found. Run build first.`);
    }

    console.log(chalk.blue('Pushing code to Google Apps Script...'));
    
    // Execute clasp push
    await runClasp(['push', '-f']);

    console.log(chalk.green('✔ Push completed successfully.'));
  } catch (error) {
    console.error(chalk.red('Push failed:'), error.message);
    process.exit(1);
  }
}

module.exports = push;