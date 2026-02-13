const fs = require('fs-extra');
const chalk = require('chalk');
const { runClasp, getDeployments } = require('../utils/clasp');
const { getConfig } = require('../utils/config');
const setId = require('./set-id');

async function deploy(options) {
  const { new: isNew, name, target, src, version: versionOption, description } = options;

  try {
    const config = await getConfig();
    config.deployments = config.deployments || [];

    let activeVersion; // Version number to pass to clasp -v
    let targetDeploymentId = null;

    // --- 1. Identify Version (Resource) ---
    if (src === 'head') {
      // For new versions, activeVersion is not specified (clasp creates it from HEAD)
      console.log(chalk.blue('🚀 Preparation: Creating a new version from HEAD'));
    } else {
      // Retrieve version number from existing sources
      if (versionOption) {
        activeVersion = versionOption;
      } else if (src) {
        // Resolve deployment ID from environment name (e.g., 'test') and fetch its remote version
        const srcEnv = config.deployments.find(d => d.name === src);
        if (!srcEnv) throw new Error(`Source environment "${src}" not found in config.`);

        const remoteList = await getDeployments(); 
        const remoteSrc = remoteList.find(d => d.deploymentId === srcEnv.id);
        if (!remoteSrc) throw new Error(`Deployment ID for "${src}" was not found on Google Cloud.`);
        
        activeVersion = remoteSrc.versionNumber;
        console.log(chalk.green(`✔ Using Version ${activeVersion} from "${src}".`));
      }
    }

    // --- 2. Build Deployment Arguments ---
    let claspArgs = ['deploy'];

    // [Axis A] New deployment environment vs. Updating existing one
    if (!isNew) {
      // Specify ID resolved from target environment name
      const targetEnv = config.deployments.find(d => d.name === target);
      if (!targetEnv) throw new Error(`Target environment "${target}" is not registered.`);
      claspArgs.push('-i', targetEnv.id);
    }

    // [Axis B] Create new version from HEAD vs. Use existing version number
    if (src === 'head') {
      // Description is mandatory when creating a new version
      claspArgs.push('-d', description);
    } else {
      // Bind an existing version to the deployment
      claspArgs.push('-v', activeVersion);
    }

    // --- 3. Execution ---
    console.log(chalk.cyan(`> Executing: clasp ${claspArgs.join(' ')}`));
    const output = await runClasp(claspArgs);

    // --- 4. Post-processing (Save config for new deployments) ---
    if (isNew) {
      const match = output.match(/Deployed\s+([^\s@]+)\s+@(\d+)/);
      if (!match) {
        throw new Error('Failed to parse clasp deploy output.');
      }
      
      targetDeploymentId = match[1];
      await setId(name, targetDeploymentId);
    }

    console.log(chalk.magenta('\n✨ All operations completed successfully.'));

  } catch (error) {
    console.error(chalk.red('\nDeployment failed:'), error.message);
  }
}

module.exports = deploy;