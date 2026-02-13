const fs = require('fs-extra');
const chalk = require('chalk');
const { runClasp, getDeployments } = require('../utils/clasp');
const { getConfig } = require('../utils/config'); // Use shared config
const setId = require('./set-id');

async function deploy(options) {
  const { new: isNew, name, target, src, version: versionOption, description } = options;

  try {
    const config = await getConfig();
    config.deployments = config.deployments || [];

    let activeVersion; // claspに渡す -v の値
    let targetDeploymentId = null;

    // --- 1. Version (Resource) の特定 ---
    if (src === 'head') {
      // 新規バージョン作成時は activeVersion を指定しない（claspが最新を固める）
      console.log(chalk.blue('🚀 Preparation: Creating a new version from HEAD'));
    } else {
      // 既存の何かからバージョン番号を取得する
      if (versionOption) {
        activeVersion = versionOption;
      } else if (src) {
        // 環境名(test等)からIDを引き、リモートのバージョン番号を特定する
        const srcEnv = config.deployments.find(d => d.name === src);
        if (!srcEnv) throw new Error(`Source environment "${src}" not found in config.`);

        const remoteList = await getDeployments(); 
        const remoteSrc = remoteList.find(d => d.deploymentId === srcEnv.id);
        if (!remoteSrc) throw new Error(`Deployment ID for "${src}" was not found on Google Cloud.`);
        
        activeVersion = remoteSrc.versionNumber;
        console.log(chalk.green(`✔ Using Version ${activeVersion} from "${src}".`));
      }
    }

    // --- 2. Deployment 実行 ---
    let claspArgs = ['deploy'];

    // 【軸A】新規デプロイ環境か、既存の更新か
    if (!isNew) {
      // target（既存環境名）からIDを特定して指定
      const targetEnv = config.deployments.find(d => d.name === target);
      if (!targetEnv) throw new Error(`Target environment "${target}" is not registered.`);
      claspArgs.push('-i', targetEnv.id);
    }

    // 【軸B】新規バージョン作成(head)か、既存バージョン指定か
    if (src === 'head') {
      // 新規作成時は description が必須
      claspArgs.push('-d', description);
    } else {
      // 既存バージョンをデプロイメントに紐付ける
      claspArgs.push('-v', activeVersion);
    }

    // --- 3. 実行 ---
    console.log(chalk.cyan(`> Executing: clasp ${claspArgs.join(' ')}`));
    const output = await runClasp(claspArgs);

    // --- 4. 後処理 (新規作成時のみ config 保存) ---
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