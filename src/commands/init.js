const fs = require('fs-extra');
const chalk = require('chalk');
const { getDeployments } = require('../utils/clasp');
const { getDefaultConfig, saveConfig, CONFIG_FILENAME } = require('../utils/config');

async function init(options) {
  try {
    console.log(chalk.blue('⚙️ Initializing ascol configuration...'));

    if (!(await fs.pathExists('.clasp.json'))) {
      throw new Error('.clasp.json not found. Please run this in a clasp project.');
    }
    const claspConfig = await fs.readJson('.clasp.json');

    const deployments = await getDeployments();
    const headDeployment = deployments.find(d => d.versionNumber === undefined);
    const headId = headDeployment ? headDeployment.deploymentId : "";

    // 1. デフォルト構造を取得
    const config = getDefaultConfig();

    // 2. 実データを流し込む
    config.scriptId = claspConfig.scriptId;
    if (options.srcDir) config.build.srcDir = options.srcDir;
    if (options.distDir) config.build.distDir = options.distDir;
    
    if (headId) {
      config.deployments.push({ name: 'head', id: headId });
    }

    // 3. 保存
    await saveConfig(config);

    // 4. フォルダの自動作成 (設定値を参照)
    await fs.ensureDir(config.build.srcDir);
    for (const dir of config.build.transpile.clientSourceDirs) {
      await fs.ensureDir(dir);
    }

    console.log(chalk.green(`\n✔ Generated ${CONFIG_FILENAME} successfully!`));
    console.log(chalk.gray(`  Script ID   : ${config.scriptId}`));
    console.log(chalk.gray(`  HEAD Dep ID : ${headId}`));

  } catch (error) {
    console.error(chalk.red('\nInit failed:'), error.message);
    process.exit(1);
  }
}

module.exports = init;