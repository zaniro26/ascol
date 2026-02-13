const fs = require('fs-extra');
const chalk = require('chalk');
const { getConfig, saveConfig, CONFIG_FILENAME } = require('../utils/config');

/**
 * Register or update a deployment ID for a specific environment name
 * and display relevant Access URLs.
 */
async function setId(envName, deploymentId) {
  try {
    const config = await getConfig();
    const scriptId = config.scriptId;

    // 1. Update/Add environment
    const index = config.deployments.findIndex(d => d.name === envName);
    if (index !== -1) {
      config.deployments[index].id = deploymentId;
      console.log(chalk.yellow(`⚠ Updated existing environment: "${envName}"`));
    } else {
      config.deployments.push({ name: envName, id: deploymentId });
      console.log(chalk.green(`✔ Registered new environment: "${envName}"`));
    }

    await saveConfig(config);

    // 2. Display Access URLs with conditional logic
    console.log('\n' + chalk.blue('Access URLs:'));

    if (envName.toLowerCase() === 'head') {
      // For "head", we use /dev for Web App and /head for Library
      console.log(chalk.white('  Web App (Head):') + chalk.cyan(`https://script.google.com/macros/s/${deploymentId}/dev`));
      console.log(chalk.white('  Library (Head):') + chalk.cyan(`https://script.google.com/macros/library/d/${scriptId}/head`));
    } else {
      // For versioned environments
      console.log(chalk.white('  Web App:')        + chalk.cyan(`https://script.google.com/macros/s/${deploymentId}/exec`));
      console.log(chalk.white('  Library:')        + chalk.cyan(`https://script.google.com/macros/library/d/${scriptId}/[VERSION_NUMBER]`));
    }
    
    console.log('\n' + chalk.gray(`Configuration updated in ${CONFIG_FILENAME}`));

  } catch (error) {
    console.error(chalk.red('An error occurred:'), error.message);
  }
}

module.exports = setId;