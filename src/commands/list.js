const chalk = require('chalk');
const { getDeployments, runClasp } = require('../utils/clasp');
const { getConfig, CONFIG_FILENAME, COMMAND_NAME } = require('../utils/config');

/**
 * @param {Object} options - Command line options (e.g., --remote)
 */
async function list(options = {}) {
  try {
    const config = await getConfig();
    const localDeployments = config.deployments || [];

    // --- A. list (Local info only) ---
    if (!options.remote) {
      console.log('\n' + chalk.cyan.bold(`=== Local Environments (${CONFIG_FILENAME}) ===`));

      if (localDeployments.length === 0) {
        console.log(chalk.gray(`  No environments defined in ${CONFIG_FILENAME}.`));
      } else {
        // Calculate dynamic padding for local display
        const maxName = localDeployments.reduce((max, ld) => Math.max(max, ld.name.length), 0);

        localDeployments.forEach(ld => {
          const pName = ld.name.padEnd(maxName + 1);
          const idStr = ld.id ? chalk.gray(ld.id) : chalk.red('ID missing');
          console.log(`  ${pName} : ${idStr}`);
        });
      }

      // Suggest --remote option to see latest status
      console.log('\n' + chalk.gray('To see the latest status from Google Apps Script, run:'));
      console.log(chalk.white(`  ${COMMAND_NAME} list --remote\n`));
      return;
    }

    // --- B. list --remote (Combined remote info) ---
    console.log(chalk.gray('Fetching data from Google Apps Script...'));

    const [remoteDeployments, versionsRaw] = await Promise.all([
      getDeployments(),
      runClasp(['versions'], { silent: true }).catch(() => "")
    ]);

    // Helper to get string length excluding ANSI escape codes
    const getLen = (str) => str.replace(/\x1B\[\d+m/g, '').length;

    // 1. Remote Deployments List
    console.log('\n' + chalk.cyan.bold('=== Remote Deployments Summary ==='));
    const deployRows = [];
    const processedDeploymentIds = new Set();

    // Process environments defined in config file
    localDeployments.forEach(local => {
      const entry = { name: local.name, versionStr: '', descStr: '', idStr: '' };
      if (!local.id) {
        entry.versionStr = chalk.red('ID missing');
        entry.idStr = '[no id]';
      } else {
        const remote = remoteDeployments.find(r => r.deploymentId === local.id);
        entry.idStr = `[${local.id.substring(0, 8)}...]`;
        processedDeploymentIds.add(local.id);

        if (local.name.toLowerCase() === 'head') {
          entry.versionStr = chalk.green('Latest');
          entry.descStr = ''; 
        } else if (!remote) {
          entry.versionStr = chalk.red('No deploy');
          entry.descStr = '(not found on remote)';
        } else {
          entry.versionStr = `Ver ${remote.versionNumber}`;
          entry.descStr = remote.description || '(no description)';
        }
      }
      deployRows.push(entry);
    });

    // Process remote deployments not listed in config file
    remoteDeployments.forEach(remote => {
      if (!processedDeploymentIds.has(remote.deploymentId)) {
        deployRows.push({
          name: chalk.gray('[Untracked]'), 
          versionStr: `Ver ${remote.versionNumber}`,
          descStr: remote.description || '(no description)',
          idStr: `[${remote.deploymentId.substring(0, 8)}...]`
        });
      }
    });

    const maxDeployName = deployRows.reduce((max, r) => Math.max(max, getLen(r.name)), 0);
    const maxDeployVer  = deployRows.reduce((max, r) => Math.max(max, getLen(r.versionStr)), 0);
    const maxDeployDesc = deployRows.reduce((max, r) => Math.max(max, getLen(r.descStr)), 0);

    deployRows.forEach(row => {
      const pName = row.name + ' '.repeat((maxDeployName + 1) - getLen(row.name));
      const pVer  = row.versionStr + ' '.repeat((maxDeployVer + 1) - getLen(row.versionStr));
      const pDesc = row.descStr + ' '.repeat((maxDeployDesc + 1) - getLen(row.descStr));
      console.log(`  ${pName}: ${pVer}: ${pDesc}   ${chalk.gray(row.idStr)}`);
    });

    // 2. Version History
    console.log('\n' + chalk.cyan.bold('=== Version History ==='));

    // Fixed parsing: filter empty lines and ensure correct match
    const versionData = versionsRaw.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0) 
      .map(line => {
        const match = line.match(/^(?:-\s+)?(\d+)\s+-\s+(.*)/);
        if (match) {
          return { number: parseInt(match[1], 10), desc: match[2] };
        }
        // Fallback for different clasp version output formats
        const simpleMatch = line.match(/^(\d+)\s+(.*)/);
        return simpleMatch ? { number: parseInt(simpleMatch[1], 10), desc: simpleMatch[2] } : null;
      })
      .filter(v => v !== null)
      .reverse();

    if (versionData.length === 0) {
      console.log(chalk.gray('  No versions found.'));
    } else {
      const maxHistDesc = versionData.reduce((max, v) => Math.max(max, getLen(v.desc)), 0);
      versionData.forEach(v => {
        // Find all environments linked to this version number
        const envTags = remoteDeployments
          .filter(rd => rd.versionNumber === v.number)
          .map(rd => {
            const local = localDeployments.find(ld => ld.id === rd.deploymentId);
            return local 
              ? chalk.bgMagenta.white(` ${local.name} `) 
              : chalk.bgBlue.white(` [Untracked] `);
          });

        const envTagLine = envTags.length > 0 ? envTags.join(', ') : '';
        const verLabel = chalk.yellow(`Ver ${v.number.toString().padEnd(3)}`);
        const pDesc = v.desc + ' '.repeat((maxHistDesc + 3) - getLen(v.desc));
        console.log(`  ${verLabel} : ${pDesc}${envTagLine}`);
      });
    }
    console.log('');

  } catch (error) {
    console.error(chalk.red('\nFailed to list information:'), error.message);
  }
}

module.exports = list;