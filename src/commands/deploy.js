const fs = require('fs-extra');
const chalk = require('chalk');
const { runClasp, getDeployments } = require('../utils/clasp');
const { getConfig } = require('../utils/config'); // Use shared config
const setId = require('./set-id');

async function deploy(options) {
  const { new: isNew, name, target, src, version: versionOption, description } = options;

  try {
    // Load config from config file instead of gas-project.json
    const config = await getConfig();
    config.deployments = config.deployments || [];

    let activeVersion;
    let targetDeploymentId = null;

    // --- 1. Identify Source ---
    if (src === 'head') {
      console.log(chalk.blue('🚀 Preparation: Use latest code from HEAD'));
    } else if (src) {
      // Copy version from existing environment (e.g., src === 'stage')
      const srcEnv = config.deployments.find(d => d.name === src);
      if (!srcEnv) throw new Error(`Source environment "${src}" not found in config.`);

      const remoteList = await getDeployments(); 
      const remoteSrc = remoteList.find(d => d.deploymentId === srcEnv.id);
      
      if (!remoteSrc) throw new Error(`Deployment ID for "${src}" was not found on Google Cloud.`);
      
      activeVersion = remoteSrc.versionNumber;
      console.log(chalk.green(`✔ Using Version ${activeVersion} from "${src}".`));

    } else if (versionOption) {
      activeVersion = versionOption;
    } else {
      throw new Error('Source missing. Use --src head, --src [name], or --version [num].');
    }

    // --- 2. Deploy to Target ---
    if (isNew) {
      if (!description) throw new Error('--description (-d) is required when using --new.');
      if (!name) throw new Error('--name is required when using --new.');
      if (!src && !versionOption) throw new Error('Either --src or --version(-v) must be specified when using --new.');
      if (src && versionOption) throw new Error('Cannot use both --src and --version(-v) options together.');
      
      let output = '';
      if (src === 'head') {
        console.log(chalk.blue('🚀 Creating a new version from HEAD...'));
        output = await runClasp(description ? ['deploy', '--description', description] : ['deploy']);
      } else {
        const sourceRef = src ? `version ${activeVersion} from ${src}` : `version ${activeVersion}`;
        console.log(chalk.blue(`🚀 Creating new deployment "${name}" from ${sourceRef}...`));
        output = await runClasp(['deploy', '-v', activeVersion, '--description', description]);
      }

      // Parse clasp output to get ID and Version
      const match = output.match(/Deployed\s+([^\s@]+)\s+@(\d+)/);
      if (!match) {
        throw new Error('Failed to parse clasp deploy output.');
      }

      targetDeploymentId = match[1];
      activeVersion = parseInt(match[2], 10);
      
      console.log(chalk.gray(`Created Version: ${activeVersion}`));
      console.log(chalk.green(`✔ Registered new environment: "${name}"`));
      
      // Update config via setId
      await setId(name, targetDeploymentId);

    } else {
      if (!target) throw new Error('--target is required for updating existing environments.');
      const targetEnv = config.deployments.find(d => d.name === target);
      if (!targetEnv) throw new Error(`Target environment "${target}" is not registered.`);

      console.log(chalk.blue(`🚀 Updating "${target}" to Version ${activeVersion}...`));
      await runClasp(['deploy', '--deploymentId', targetEnv.id, '--versionNumber', activeVersion]);
      
      // Refresh config via setId
      await setId(target, targetEnv.id);
    }

    console.log(chalk.magenta('\n✨ All operations completed successfully.'));

  } catch (error) {
    console.error(chalk.red('\nDeployment failed:'), error.message);
  }
}

module.exports = deploy;