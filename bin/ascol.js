#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const os = require('os');
const path = require('path');
const fs = require('fs');
const { ensureLogin } = require('../src/utils/clasp');

// package.json
const pkgPath = path.join(__dirname, '../package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

const program = new Command();

// sub command
const create = require('../src/commands/create');
const build = require('../src/commands/build');
const push = require('../src/commands/push');
const deploy = require('../src/commands/deploy');
const setId = require('../src/commands/set-id');
const pullConfig = require('../src/commands/pull-config');
const list = require('../src/commands/list');

program
  .name(pkg.name)
  .description(pkg.description)
  .version(pkg.version)
  .usage('<command> [command options]');

// create
program
  .command('create')
  .description('Create a new GAS project and initialize local settings')
  .requiredOption('-t, --title <title>', 'Project title')
  .option('--type <type>', 'Script type (standalone, sheets, docs, etc.)')
  .hook('preAction', ensureLogin)
  .action(create);

// build (No login check required)
program
  .command('build')
  .description('Transform source code in src/ and output to dist/')
  .action(build);

// push
program
  .command('push')
  .description('Build project and push code to GAS')
  .option('-s, --skip-build', 'Push without building (skips transformation)')
  .hook('preAction', ensureLogin)
  .action(push);  

// deploy
program
  .command('deploy')
  .description('Manage GAS deployments and environments')
  .option('--new', 'Create a new deployment ID')
  .option('-t, --target <target>', 'Update a target deploy environment name')
  .option('-n, --name <name>', 'Name for the new deploy environment')
  .option('-s, --src <source>', 'Source: "head" or existing environment name')
  .option('-v, --version <number>', 'Source: specific version number')
  .option('-d, --description <text>', 'New deployment version description')
  .hook('preAction', ensureLogin)
  .action(async (options) => {
    // --- 1. Type of deployment ---
    if (!options.new && !options.target) {
      console.error('Error: --new or --target is required (type of deployment)');
      process.exit(1);
    }
    if (options.new && options.target) {
      console.error('Error: Cannot specify both --new and --target.');
      process.exit(1);
    }

    // --- 2. Deployment resource ---
    if (!options.src && !options.version) {
      console.error('Error: --src or --version (-v) is required.');
      process.exit(1);
    }
    if (options.src && options.version) {
      console.error('Error: Cannot specify both --src and --version.');
      process.exit(1);
    }

    // --- 3. Name check for new deployment ---
    if (options.new && !options.name) {
      console.error('Error: --name is required when using --new.');
      process.exit(1);
    }

    // --- 4. Description check for new version (src: head) ---
    const isHead = options.src === 'head';
    if (isHead) {
      if (!options.description) {
        console.error('Error: --description (-d) is required when --src is "head".');
        process.exit(1);
      }
    } else if (options.description) {
      console.warn('Warning: --description is ignored when not creating a new version from "head".');
    }
    
    await deploy(options);
  });

// set-id
program
  .command('set-id')
  .description('Link an existing Deployment ID to an environment name')
  .argument('<name>', 'Environment name')
  .argument('<id>', 'Deployment ID')
  .action(setId);

// pull-config
program
  .command('pull-config')
  .description('Fetch the latest appsscript.json from Google and save it locally')
  .hook('preAction', ensureLogin)
  .action(pullConfig);

// list
program
  .command('list')
  .description('List environments and deployments')
  .option('-r, --remote', 'see the latest status from Google Apps Script')
  .action(list);

program.parse(process.argv);