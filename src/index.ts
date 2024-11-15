#!/usr/bin/env node
import { execa } from 'execa';
import prompts from 'prompts';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

async function generateSecret(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

async function main() {
  console.log(chalk.bold('\n🧱 Welcome to Payload Blocks Starter!\n'));

  const response = await prompts([
    {
      type: 'text',
      name: 'projectName',
      message: 'What is the name of your project?',
      validate: value => value.length > 0 ? true : 'Project name is required'
    },
    {
      type: 'select',
      name: 'databaseType',
      message: 'Which database would you like to use?',
      choices: [
        { title: 'MongoDB', value: 'mongodb' },
        { title: 'PostgreSQL', value: 'postgres' }
      ]
    },
    {
      type: 'text',
      name: 'databaseUrl',
      message: 'Enter your database URL:',
      validate: value => value.length > 0 ? true : 'Database URL is required'
    }
  ]);

  const spinner = ora('Creating your project...').start();

  try {
    const payloadSecret = await generateSecret();

    // Clone the repository
    await execa('git', [
      'clone',
      'https://github.com/ByeDolly/Payload-Blocks-Starter.git',
      response.projectName
    ]);

    // Remove .git directory
    await fs.rm(path.join(process.cwd(), response.projectName, '.git'), { recursive: true, force: true });

    // Update package.json
    const packageJsonPath = path.join(process.cwd(), response.projectName, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
    packageJson.name = response.projectName;
    await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

    // Create .env file
    const envContent = `
DATABASE_URL=${response.databaseUrl}
PAYLOAD_SECRET=${payloadSecret}
NEXT_PUBLIC_URL=http://localhost:3000
    `.trim();

    await fs.writeFile(path.join(process.cwd(), response.projectName, '.env'), envContent);

    // Configure database
    const projectPath = path.join(process.cwd(), response.projectName);
    const srcPath = path.join(projectPath, 'src');

    if (response.databaseType === 'postgres') {
      // Install postgres adapter with specific version
      await execa('pnpm', ['install', '@payloadcms/db-postgres@3.0.0-beta.126'], { cwd: projectPath });
      
      // Delete MongoDB config
      await fs.unlink(path.join(srcPath, 'mongo.payload.config.ts'));
      
      // Rename Postgres config
      await fs.rename(
        path.join(srcPath, 'postgres.payload.config.ts'),
        path.join(srcPath, 'payload.config.ts')
      );
    } else {
      // Install mongodb adapter with specific version
      await execa('pnpm', ['install', '@payloadcms/db-mongodb@3.0.0-beta.126'], { cwd: projectPath });
      
      // Delete Postgres config
      await fs.unlink(path.join(srcPath, 'postgres.payload.config.ts'));
      
      // Rename MongoDB config
      await fs.rename(
        path.join(srcPath, 'mongo.payload.config.ts'),
        path.join(srcPath, 'payload.config.ts')
      );
    }

    spinner.succeed(chalk.green('Project created successfully!'));
    
    console.log('\nNext steps:');
    console.log(chalk.cyan(`1. cd ${response.projectName}`));
    console.log(chalk.cyan('2. pnpm install'));
    console.log(chalk.cyan('3. pnpm dev'));
    
  } catch (error) {
    spinner.fail(chalk.red('Failed to create project'));
    console.error(error);
    process.exit(1);
  }
}

main().catch(console.error);