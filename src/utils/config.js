const fs = require('fs-extra');
const path = require('path');

const COMMAND_NAME    = 'ascol';
const CONFIG_FILENAME = `${COMMAND_NAME}.json`;

/**
 * Load configuration from the file.
 * Falls back to default values if the file or specific properties are missing.
 * @returns {Promise<Object>}
 */
async function getConfig() {
  if (!(await fs.pathExists(CONFIG_FILENAME))) {
    return {
      srcDir: 'src',
      distDir: 'dist',
      deployments: []
    };
  }
  
  const config = await fs.readJson(CONFIG_FILENAME);
  
  return {
    srcDir: config.srcDir || 'src',
    distDir: config.distDir || 'dist',
    deployments: config.deployments || []
  };
}

/**
 * Save configuration to the file.
 * @param {Object} config 
 */
async function saveConfig(config) {
  await fs.writeJson(CONFIG_FILENAME, config, { spaces: 2 });
}

module.exports = { getConfig, saveConfig, CONFIG_FILENAME, COMMAND_NAME };