#!/usr/bin/env node

import { Command } from 'commander';
import { input, select, confirm } from '@inquirer/prompts';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const program = new Command();

const managers = ['npm', 'pnpm', 'yarn', 'bun'];

program
  .name('stackit')
  .description(
    'Create a Next.js application with interactive setup or CLI flags'
  )
  .version('1.1.0')
  .argument('[project-name]', 'Folder name for the new project')
  .option(
    '-y, --yes',
    'Use recommended defaults for unspecified settings'
  )
  .option('--ts', 'Use TypeScript')
  .option('--js', 'Use JavaScript')
  .option('--tailwind', 'Enable Tailwind CSS')
  .option('--no-tailwind', 'Disable Tailwind CSS')
  .option('--eslint', 'Configure ESLint')
  .option('--biome', 'Configure Biome')
  .option('--no-linter', 'Do not configure a linter')
  .option('--src-dir', 'Put source files in src/')
  .option('--no-src-dir', 'Keep source files at project root')
  .option('--app-router', 'Use the App Router')
  .option('--no-app-router', 'Use the Pages Router')
  .option('--react-compiler', 'Enable React Compiler')
  .option('--no-react-compiler', 'Disable React Compiler')
  .option(
    '--pm <manager>',
    'Package manager: npm, pnpm, yarn, bun'
  )
  .option(
    '--node-version <version>',
    'Node.js version: lts, latest, current, 24, 24.18.0, etc.'
  )
  .option(
    '--no-nvmrc',
    'Do not generate an .nvmrc file'
  )
  .action(async (projectName, options) => {
    try {
      await createProject(projectName, options);
    } catch (error) {
      if (error.name === 'ExitPromptError') {
        process.exitCode = 130;
        return;
      }

      console.error(`\nError: ${error.message}`);
      process.exitCode = 1;
    }
  });

program.parse();

/**
 * Normalize Node.js version aliases.
 */
function normalizeNodeVersion(version) {
  const value = String(version).trim();

  if (value === 'lts' || value === 'lts/*') {
    return 'lts/*';
  }

  if (value === 'latest' || value === 'node') {
    return 'node';
  }

  if (value === 'current') {
    return process.version.slice(1);
  }

  if (/^v?\d+(?:\.\d+){0,2}$/.test(value)) {
    return value.replace(/^v/, '');
  }

  throw new Error(
    'Invalid Node.js version. Use lts, latest, current, ' +
    'or a numeric version such as 24 or 24.18.0.'
  );
}

/**
 * Create an .nvmrc file in the generated project.
 */
async function createNvmrc(projectDirectory, nodeVersion) {
  const nvmrcPath = resolve(projectDirectory, '.nvmrc');

  await writeFile(
    nvmrcPath,
    `${nodeVersion}\n`,
    {
      encoding: 'utf8',
      flag: 'wx'
    }
  );

  console.log(`\n✓ Created .nvmrc (${nodeVersion})`);
}

/**
 * Execute create-next-app.
 */
async function runCreateNextApp(args) {
  await new Promise((resolvePromise, reject) => {
    const child = spawn(
      process.platform === 'win32' ? 'npx.cmd' : 'npx',
      args,
      {
        stdio: 'inherit',
        shell: false
      }
    );

    child.on('error', reject);

    child.on('close', (code, signal) => {
      if (code === 0) {
        resolvePromise();
      } else {
        reject(
          new Error(
            signal
              ? `Scaffolding terminated by ${signal}`
              : `Scaffolding failed with exit code ${code}`
          )
        );
      }
    });
  });
}

/**
 * Create a Next.js project.
 */
async function createProject(projectName, options) {
  // Validate conflicting options
  if (options.ts && options.js) {
    throw new Error('Use either --ts or --js, not both.');
  }

  const linterFlags = [
    options.eslint,
    options.biome,
    options.linter === false
  ];

  if (linterFlags.filter(Boolean).length > 1) {
    throw new Error(
      'Choose only one of --eslint, --biome or --no-linter.'
    );
  }

  if (options.pm && !managers.includes(options.pm)) {
    throw new Error(
      `Invalid package manager. Choose: ${managers.join(', ')}.`
    );
  }

  if (options.nvmrc === false && options.nodeVersion) {
    throw new Error(
      'Cannot combine --node-version with --no-nvmrc.'
    );
  }

  const interactive = !options.yes && Boolean(process.stdin.isTTY);

  // Project name
  const name = projectName ?? (
    interactive
      ? await input({
          message: 'Project name:',
          default: 'my-next-app'
        })
      : 'my-next-app'
  );

  if (
    !/^[a-z0-9][a-z0-9._-]*$/.test(name) ||
    name === '.' ||
    name === '..'
  ) {
    throw new Error(
      'Project name must start with a lowercase letter or digit ' +
      'and contain only lowercase letters, digits, dots, ' +
      'underscores or hyphens.'
    );
  }

  // Language selection
  const language = options.ts
    ? 'ts'
    : options.js
      ? 'js'
      : interactive
        ? await select({
            message: 'Language:',
            choices: [
              { name: 'TypeScript', value: 'ts' },
              { name: 'JavaScript', value: 'js' }
            ],
            default: 'ts'
          })
        : 'ts';

  // Tailwind CSS
  const tailwind = options.tailwind ?? (
    interactive
      ? await confirm({
          message: 'Use Tailwind CSS?',
          default: true
        })
      : true
  );

  // Linter selection
  const linter = options.eslint
    ? 'eslint'
    : options.biome
      ? 'biome'
      : options.linter === false
        ? 'none'
        : interactive
          ? await select({
              message: 'Linter:',
              choices: [
                { name: 'ESLint', value: 'eslint' },
                { name: 'Biome', value: 'biome' },
                { name: 'None', value: 'none' }
              ],
              default: 'eslint'
            })
          : 'eslint';

  // Source directory
  const srcDir = options.srcDir ?? (
    interactive
      ? await confirm({
          message: 'Use src/ directory?',
          default: true
        })
      : true
  );

  // App Router
  const appRouter = options.appRouter ?? (
    interactive
      ? await confirm({
          message: 'Use App Router?',
          default: true
        })
      : true
  );

  // React Compiler
  const reactCompiler = options.reactCompiler ?? (
    interactive
      ? await confirm({
          message: 'Enable React Compiler?',
          default: false
        })
      : false
  );

  // Package manager
  const pm = options.pm ?? (
    interactive
      ? await select({
          message: 'Package manager:',
          choices: managers.map(value => ({
            name: value,
            value
          })),
          default: 'npm'
        })
      : 'npm'
  );

  // .nvmrc configuration
  const createNvmrcFile = options.nvmrc !== false && (
    options.nodeVersion !== undefined ||
    !interactive ||
    await confirm({
      message: 'Generate an .nvmrc file?',
      default: true
    })
  );

  let nodeVersion = null;

  if (createNvmrcFile) {
    let selectedVersion = options.nodeVersion;

    if (selectedVersion === undefined) {
      selectedVersion = interactive
        ? await select({
            message: 'Which Node.js version should this project use?',
            choices: [
              {
                name: 'Latest LTS (recommended)',
                value: 'lts'
              },
              {
                name: 'Latest Node.js release',
                value: 'latest'
              },
              {
                name: `Current Node.js (${process.version})`,
                value: 'current'
              },
              {
                name: 'Specify a version',
                value: 'custom'
              }
            ],
            default: 'lts'
          })
        : 'lts';
    }

    if (selectedVersion === 'custom') {
      selectedVersion = await input({
        message: 'Enter a Node.js version:',
        default: process.version.slice(1),
        validate: value => {
          try {
            normalizeNodeVersion(value);
            return true;
          } catch {
            return 'Enter a valid Node.js version.';
          }
        }
      });
    }

    nodeVersion = normalizeNodeVersion(selectedVersion);
  }

  // Build create-next-app arguments
  const args = [
    '--yes',
    'create-next-app@latest',
    name,
    language === 'ts' ? '--ts' : '--js',
    tailwind ? '--tailwind' : '--no-tailwind',
    linter === 'none' ? '--no-linter' : `--${linter}`,
    srcDir ? '--src-dir' : '--no-src-dir',
    appRouter ? '--app' : '--no-app',
    reactCompiler
      ? '--react-compiler'
      : '--no-react-compiler',
    `--use-${pm}`,
    '--yes'
  ];

  // Show configuration summary
  console.log('\n----------------------------------------');
  console.log('            Stackit Setup');
  console.log('----------------------------------------');
  console.log(`Project:        ${name}`);
  console.log(`Language:       ${language === 'ts' ? 'TypeScript' : 'JavaScript'}`);
  console.log(`Tailwind CSS:   ${tailwind ? 'Yes' : 'No'}`);
  console.log(`Linter:         ${linter}`);
  console.log(`Source folder:  ${srcDir ? 'src/' : 'root'}`);
  console.log(`App Router:     ${appRouter ? 'Yes' : 'No'}`);
  console.log(`React Compiler: ${reactCompiler ? 'Yes' : 'No'}`);
  console.log(`Package manager: ${pm}`);
  console.log(`Node.js:        ${nodeVersion ?? 'No .nvmrc'}`);
  console.log('----------------------------------------\n');

  console.log(`Creating Next.js project "${name}"...\n`);

  // Generate the Next.js application
  await runCreateNextApp(args);

  const projectDirectory = resolve(process.cwd(), name);

  // Generate .nvmrc after successful scaffolding
  if (createNvmrcFile) {
    await createNvmrc(projectDirectory, nodeVersion);
  }

  // Success message
  console.log('\n----------------------------------------');
  console.log('       Project created successfully!');
  console.log('----------------------------------------\n');

  console.log('Next steps:\n');
  console.log(`  cd ${name}`);

  if (createNvmrcFile) {
    console.log('  nvm install');
    console.log('  nvm use');
  }

  console.log(
    `  ${pm === 'npm' ? 'npm run dev' : `${pm} dev`}`
  );

  console.log('\nHappy coding!\n');
}
