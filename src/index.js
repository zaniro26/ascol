#!/usr/bin/env node

/* requirements */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 引数の取得
const args = process.argv.slice(2);
const command = args[0];

const cwd = process.cwd();
const configPath = path.join(cwd, 'gas-project.json');

// --- ユーティリティ ---

const getPaths = () => ({
  src: path.join(cwd, 'src'),
  dist: path.join(cwd, 'dist')
});

/**
 * gas-project.json を初期化・読み込みする
 */
const initProjectConfig = () => {
  if (!fs.existsSync(configPath)) {
    console.log('⚙️ Creating gas-project.json for the first time...');
    const defaultConfig = { deployId: "" };
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
    console.log('✅ Generated: gas-project.json (deployId is empty)');
  }
};

const readConfig = () => {
  if (fs.existsSync(configPath)) {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
  return { deployId: "" };
};

const saveConfig = (config) => {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
};

/**
 * clasp deployments から最新のバージョンIDを取得する
 * 見つからない場合は null を返す（エラーにはしない）
 */
const fetchLatestDeploymentId = () => {
  try {
    // stdioをinheritせず、出力を受け取る
    const output = execSync('clasp deployments', { encoding: 'utf8' });
    
    // 正規表現: - (ID) @(Version)
    const regex = /- ([a-zA-Z0-9-_]+)\s+@([0-9]+)/g;
    let match;
    let maxVersion = -1;
    let targetId = null;

    while ((match = regex.exec(output)) !== null) {
      const id = match[1];
      const version = parseInt(match[2], 10);
      
      if (version > maxVersion) {
        maxVersion = version;
        targetId = id;
      }
    }

    return targetId; // ID または null
  } catch (e) {
    console.error('⚠️ Warning: Failed to fetch deployments list.');
    return null;
  }
};

// --- コマンド処理 ---

const test = () => {
    console.log('🧪 Running tests...');

    // test-project/src (ターゲットフォルダ) のパスを作る
    const targetSrc = path.join(cwd, 'src');
    if (fs.existsSync(targetSrc)) {
        console.log('Source files:', fs.readdirSync(targetSrc));
    } else {
        console.log('src directory not found.');
    }
};

const build = () => {
  const { src, dist } = getPaths();
  console.log('🚀 Building...');

  if (!fs.existsSync(src)) {
    console.error('❌ Error: src directory not found.');
    return;
  }
  if (!fs.existsSync(dist)) fs.mkdirSync(dist, { recursive: true });

  // 1. 同期（srcにないものをdistから消す。appsscript.jsonは死守）
  const syncDist = (s, d) => {
    if (!fs.existsSync(d)) return;
    fs.readdirSync(d).forEach(item => {
      if (item === 'appsscript.json') return;
      
      const sPath = path.join(s, item);
      const dPath = path.join(d, item);
      
      // 変換後ファイル名から変換前を逆算
      let checkSPath = sPath;
      if (item.endsWith('.js.html')) checkSPath = sPath.replace('.js.html', '.js');
      if (item.endsWith('.css.html')) checkSPath = sPath.replace('.css.html', '.css');

      if (!fs.existsSync(checkSPath)) {
        fs.rmSync(dPath, { recursive: true, force: true });
        console.log(`  [Removed] ${path.relative(cwd, dPath)}`);
      } else if (fs.statSync(dPath).isDirectory()) {
        syncDist(checkSPath, dPath);
      }
    });
  };
  syncDist(src, dist);

  // 2. コピー & トランスパイル
  const copyAndTransform = (s, d) => {
    if (fs.statSync(s).isDirectory()) {
      if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
      fs.readdirSync(s).forEach(child => copyAndTransform(path.join(s, child), path.join(d, child)));
    } else {
      const ext = path.extname(s);
      let content = fs.readFileSync(s, 'utf8');
      let targetPath = d;

      if (ext === '.js') {
        content = `<script>\n\n${content}\n\n</script>`;
        targetPath += '.html';
      } else if (ext === '.css') {
        content = `<style>\n\n${content}\n\n</style>`;
        targetPath += '.html';
      }

      fs.writeFileSync(targetPath, content);
      console.log(`  [Done] ${path.relative(cwd, targetPath)}`);
    }
  };
  copyAndTransform(src, dist);
  console.log('✨ Build finished.');
};

const reset = () => {
  const { dist } = getPaths();
  console.log('🧹 Resetting dist (excluding appsscript.json)...');
  if (!fs.existsSync(dist)) return;

  fs.readdirSync(dist).forEach(item => {
    if (item === 'appsscript.json') return;
    fs.rmSync(path.join(dist, item), { recursive: true, force: true });
    console.log(`  [Removed] ${item}`);
  });
  console.log('✨ Reset finished.');
};

const push = () => {
  console.log('🚢 Pushing to GAS...');
  try {
    execSync('clasp push', { stdio: 'inherit' });
    console.log('✅ Push completed.');
  } catch (e) {
    console.error('❌ Push failed.');
  }
};

const deploy = () => {
  console.log('🚀 Starting deployment process...');

  // 1. 引数解析 (-d 必須)
  const dIndex = args.indexOf('-d');
  if (dIndex === -1 || dIndex + 1 >= args.length) {
    console.error('❌ Error: Description is required. Use -d "Your comment"');
    process.exit(1);
  }
  const description = args[dIndex + 1];

  // 2. 設定読み込み
  let config = readConfig();
  let deployId = config.deployId;

  // 3. deployId の解決ロジック
  if (!deployId) {
    console.log('⚠️ deployId is empty. checking existing deployments...');
    
    // 一覧を取得してみる
    const latestId = fetchLatestDeploymentId();

    if (latestId) {
      // ケースA: 過去のデプロイが見つかった -> それを使う
      deployId = latestId;
      config.deployId = deployId;
      saveConfig(config);
      console.log(`💾 [Update] Found existing deployment. Saved ID (${deployId}) to gas-project.json`);
    } else {
      // ケースB: 過去のデプロイがない (@HEADのみ) -> 新規作成
      console.log('🆕 No numbered deployment found. Creating a NEW deployment...');
      try {
        // 新規デプロイ実行 (ID指定なし)
        execSync(`clasp deploy --description "${description}"`, { stdio: 'inherit' });
        
        // 直後にIDを取得して保存
        const newId = fetchLatestDeploymentId();
        if (newId) {
            config.deployId = newId;
            saveConfig(config);
            console.log(`💾 [Update] Captured new deployment ID. Saved (${newId}) to gas-project.json`);
        }
        console.log('✅ New deployment created successfully!');
        return; // 新規作成できたのでここで終了
      } catch (e) {
        console.error('❌ New deployment failed.');
        process.exit(1);
      }
    }
  }

  // 4. 既存IDへの上書きデプロイ実行 (ケースA または 既にIDがあった場合)
  if (deployId) {
    console.log(`ship: Deploying to existing ID: ${deployId}`);
    console.log(`📝 Description: ${description}`);
    try {
      execSync(`clasp deploy --description "${description}" -i ${deployId}`, { stdio: 'inherit' });
      console.log('✅ Deployment completed successfully!');
    } catch (e) {
      console.error('❌ Deployment failed.');
      process.exit(1);
    }
  }
};


// --- 前処理: Configファイルの生成制御 ---

// reset, test 以外なら gas-project.json を生成/確保する
const NO_CONFIG_COMMANDS = ['reset', 'test'];
if (!NO_CONFIG_COMMANDS.includes(command)) {
  initProjectConfig();
}

// --- メイン処理 (分岐) ---
switch (command) {
  case 'build':
    build();
    break;
  case 'push':
    push();
    break;
  case 'deploy':
    deploy();
    break;
  case 'test':
    test();
    break;
  case 'reset':
    reset();
    break;
  default:
    console.log('❓ Usage: gas-build-core [build | push | deploy | reset | test]');
    process.exit(1);
}
