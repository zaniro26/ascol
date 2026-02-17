const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const { getConfig } = require('../utils/config');

/**
 * Build process: 
 * 1. Clean distDir
 * 2. If file matches transpile rules (CSS or client JS), wrap in tags and save as .html
 * 3. Otherwise (appsscript.json, server JS, etc.), copy directly
 */
async function build() {
  try {
    const { build: buildConfig } = await getConfig();
    const { srcDir, distDir, transpile } = buildConfig;

    console.log(chalk.blue('🚀 Building and transforming files...'));

    // Check source directory
    if (!(await fs.pathExists(srcDir))) {
      throw new Error(`Source directory "${srcDir}" not found.`);
    }

    // Clean dist directory while preserving appsscript.json
    if (await fs.pathExists(distDir)) {
      await fs.emptyDir(distDir);
    } else {
      await fs.ensureDir(distDir);
    }

    const normalize = (p) => path.normalize(p).replace(/\\/g, '/').replace(/\/$/, '');
    const clientDirs = transpile.clientSourceDirs.map(d => normalize(d));

    /**
     * copyOrTransform
     */
    const copyOrTransform = async (s, d) => {
      const stats = await fs.stat(s);
      const normalizedS = normalize(s);

      if (stats.isDirectory()) {
        await fs.ensureDir(d);
        const children = await fs.readdir(s);
        for (const child of children) {
          await copyOrTransform(path.join(s, child), path.join(d, child));
        }
      } else {
        const ext = path.extname(s);
        const fileName = path.basename(s);

        let shouldTranspile = false;
        if (ext === '.css') {
          shouldTranspile = true; // CSSは常に変換
        } else if (ext === '.js') {
          // クライアントディレクトリ配下のJSのみ変換
          shouldTranspile = clientDirs.some(dir => normalizedS.startsWith(dir));
        }

        if (shouldTranspile) {
          let content = await fs.readFile(s, 'utf8');
          // Transformation: Wrap .js and .css into .html
          if (ext === '.js') {
            content = `<script>\n\n${content}\n\n</script>`;
          } else if (ext === '.css') {
            content = `<style>\n\n${content}\n\n</style>`;
          }
          const targetPath = d + '.html';
        // Write file to target path
          await fs.writeFile(targetPath, content);
          console.log(chalk.gray(`  [Transpiled] ${fileName} -> ${path.basename(targetPath)}`));
        } else {
          // copy
          await fs.copy(s, d);
          console.log(chalk.gray(`  [Copied]     ${fileName}`));
        }
      }
    };

    // exec
    await copyOrTransform(srcDir, distDir);
    
    console.log(chalk.green('\n✔ Build completed successfully.'));

  } catch (error) {
    console.error(chalk.red('\nBuild failed:'), error.message);
    process.exit(1);
  }
}

module.exports = build;