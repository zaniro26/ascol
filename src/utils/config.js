const fs = require('fs-extra');
const path = require('path');
const os = require('os');

const COMMAND_NAME    = 'ascol';
const CONFIG_FILENAME = `${COMMAND_NAME}.json`;

/**
 * ascol.json のデフォルト構造を定義
 */
function getDefaultConfig() {
  return {
    scriptId: '',
    build: {
      srcDir: 'src',
      distDir: 'dist',
      transpile: {
        clientSourceDirs: ['src/client/'] // 文字列から配列に変更
      }
    },
    deployments: []
  };
}

/**
 * 設定の読み込み（階層構造に対応したマージ）
 */
async function getConfig() {
  const defaultConfig = getDefaultConfig();

  if (!(await fs.pathExists(CONFIG_FILENAME))) {
    return defaultConfig;
  }
  
  const fileConfig = await fs.readJson(CONFIG_FILENAME);
  
  // ネストされたオブジェクトを安全にマージ
  return {
    ...defaultConfig,
    ...fileConfig,
    build: {
      ...defaultConfig.build,
      ...(fileConfig.build || {}),
      transpile: {
        ...defaultConfig.build.transpile,
        ...((fileConfig.build && fileConfig.build.transpile) || {})
      }
    }
  };
}

/**
 * 設定の保存（OS標準の改行コードを適用）
 */
async function saveConfig(config) {
  const jsonString = JSON.stringify(config, null, 2).replace(/\n/g, os.EOL);
  await fs.writeFile(CONFIG_FILENAME, jsonString, 'utf8');
}

module.exports = { 
  getConfig, 
  saveConfig, 
  getDefaultConfig, 
  CONFIG_FILENAME, 
  COMMAND_NAME 
};