#!/usr/bin/env node

import { Command } from 'commander';
import { input, select, confirm } from '@inquirer/prompts';
import { spawn } from 'node:child_process';

const program = new Command();

const managers = ['npm', 'pnpm', 'yarn', 'bun'];

program
  .name('next-setup')
  .description('Create a Next.js application with interactive setup or CLI flags')
  .version('1.0.0')
  .argument('[project-name]', 'Folder name for the new project')
  .option('-y, --yes', 'Use recommended defaults for unspecified settings')
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
  .option('--pm <manager>', 'Package manager: npm, pnpm, yarn, bun')
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

  const interactive = !options.yes && process.stdin.isTTY;

  // Project name
  const name = projectName ?? (
    interactive
      ? await input({
          message: 'Project name:',
          default: 'my-next-app'
        })
      : 'my-next-app'
  );

  // Validate project name
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

  console.log(
    `\nCreating Next.js project "${name}" with ${pm}...\n`
  );

  // Execute create-next-app
  await new Promise((resolve, reject) => {
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
        resolve();
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

  // Success message
  console.log(`
Done! Start your project:

  cd ${name}
  ${pm === 'npm' ? 'npm run dev' : `${pm} dev`}
`);
}
