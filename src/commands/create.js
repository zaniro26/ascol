const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const { runClasp, getDeployments } = require('../utils/clasp');
const { getDefaultConfig, saveConfig, COMMAND_NAME } = require('../utils/config');
const setId = require('./set-id');

/**
 * Initialize a new GAS project and create the initial config file
 */
async function create(options) {
  const { title, type } = options;

  if (!title) {
    console.error(chalk.red('Error: --title is required.'));
    return;
  }

  console.log(chalk.blue(`Creating project "${title}"...`));

  try {
    // 1. Execute clasp create with dist as rootDir
    const createArgs = ['create', '--title', title, '--rootDir', './dist'];
    if (type) {
      createArgs.push('--type', type);
    }
    await runClasp(createArgs);

    // 2. Load generated configuration
    const claspConfig = await fs.readJson('.clasp.json');
    const deployments = await getDeployments(); 
    const headId = deployments[0]?.deploymentId || "";

    // Initialize config file structure
    const config = getDefaultConfig();
    config.scriptId = claspConfig.scriptId;
    
    if (headId) {
      config.deployments.push({ name: 'head', id: headId });
    }
    await saveConfig(config);

    // 3. Prepare initial appsscript.json in src/
    const { srcDir, distDir } = config.build;
    await fs.ensureDir(srcDir);
    
    if (await fs.pathExists(path.join(distDir, 'appsscript.json'))) {
      await fs.copy(path.join(distDir, 'appsscript.json'), path.join(srcDir, 'appsscript.json'));
      console.log(chalk.green(`✔ Copied appsscript.json to ${srcDir}/`));
    }

    // 4. Guidance for Web Application setup
    const projectUrl = `https://script.google.com/home/projects/${claspConfig.scriptId}/edit`;
    console.log(chalk.green('\n✨ Project created and initialized successfully!'));
    console.log(chalk.yellow('--------------------------------------------------'));
    console.log(chalk.yellow('[Next steps for Web Application]'));
    console.log(` 1. Open the script editor in your browser:`);
    console.log(chalk.cyan(`    ${projectUrl}`));
    console.log('    Then, deploy as a Web App to enable HTTP(S) access.');

    console.log(' 2. Run the following command to sync the latest appsscript.json:');
    console.log(chalk.cyan(`    ${COMMAND_NAME} pull-config`));

    console.log('\n 3. Register your deployment ID (e.g., "prod", "stage", etc.):');
    console.log(chalk.cyan(`    ${COMMAND_NAME} set-id [Env name] [Deployment ID]`)); 
    console.log(chalk.yellow('--------------------------------------------------'));

  } catch (error) {
    console.error(chalk.red('\nAn error occurred during creation. Please check the logs above.'));
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = create;