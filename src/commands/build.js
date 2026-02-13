const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const { getConfig } = require('../utils/config');

/**
 * Build process: Clean distDir and copy/transform files from srcDir
 */
async function build() {
  try {
    const { srcDir, distDir } = await getConfig();

    console.log(chalk.blue('🚀 Building and transforming files...'));

    // Check source directory
    if (!(await fs.pathExists(srcDir))) {
      throw new Error(`Source directory "${srcDir}" not found.`);
    }

    // Clean dist directory while preserving appsscript.json
    if (await fs.pathExists(distDir)) {
      const items = await fs.readdir(distDir);
      for (const item of items) {
        if (item !== 'appsscript.json') {
          await fs.remove(path.join(distDir, item));
          console.log(chalk.gray(`  [Removed] ${item}`));
        }
      }
    } else {
      await fs.ensureDir(distDir);
    }

    // Recursive copy and transform function
    const copyAndTransform = async (s, d) => {
      const stats = await fs.stat(s);

      if (stats.isDirectory()) {
        await fs.ensureDir(d);
        const children = await fs.readdir(s);
        for (const child of children) {
          await copyAndTransform(path.join(s, child), path.join(d, child));
        }
      } else {
        const ext = path.extname(s);
        let content = await fs.readFile(s, 'utf8');
        let targetPath = d;

        // Transformation: Wrap .js and .css into .html
        if (ext === '.js' && !s.endsWith('appsscript.json')) {
          content = `<script>\n\n${content}\n\n</script>`;
          targetPath += '.html';
        } else if (ext === '.css') {
          content = `<style>\n\n${content}\n\n</style>`;
          targetPath += '.html';
        }

        // Write file to target path
        await fs.writeFile(targetPath, content);
        console.log(chalk.gray(`  [Done] ${path.relative(process.cwd(), targetPath)}`));
      }
    };

    await copyAndTransform(srcDir, distDir);
    console.log(chalk.green('✨ Build finished successfully.'));

  } catch (error) {
    console.error(chalk.red('\nBuild failed:'), error.message);
    throw error;
  }
}

module.exports = build;