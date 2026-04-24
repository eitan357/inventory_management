'use strict';

require('dotenv').config();

const readline = require('readline');
const path = require('path');
const chalk = require('chalk');
const { orchestrate } = require('./orchestrator');
const { orchestrateUpgrade } = require('./upgradeOrchestrator');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

async function collectMultiline(prompt) {
  console.log(chalk.yellow(prompt));
  console.log(chalk.gray('    (כתוב את הדרישות, ואז כתוב END בשורה נפרדת)\n'));
  const lines = [];
  while (true) {
    const line = await ask('');
    if (line.trim() === 'END') break;
    lines.push(line);
  }
  return lines.join('\n').trim();
}

async function main() {
  console.log(chalk.bold.cyan('\n╔════════════════════════════════════════╗'));
  console.log(chalk.bold.cyan('║      App Builder — Multi-Agent AI       ║'));
  console.log(chalk.bold.cyan('╚════════════════════════════════════════╝\n'));

  if (!process.env.ANTHROPIC_API_KEY) {
    console.log(chalk.red('❌  Missing ANTHROPIC_API_KEY in environment.'));
    console.log(chalk.yellow('    Create a .env file with: ANTHROPIC_API_KEY=your_key_here'));
    process.exit(1);
  }

  // Mode selection
  console.log(chalk.bold.white('בחר מצב:'));
  console.log(chalk.white('  1 — יצירת פרויקט חדש'));
  console.log(chalk.white('  2 — שדרוג פרויקט קיים מ-GitHub'));
  const modeInput = (await ask(chalk.yellow('\n▶  בחירה (1/2): '))).trim();
  const mode = modeInput === '2' ? 'upgrade' : 'new';

  if (mode === 'upgrade') {
    await runUpgradeMode();
  } else {
    await runNewProjectMode();
  }

  rl.close();
}

async function runNewProjectMode() {
  const projectName = (await ask(chalk.yellow('\n📦  שם הפרויקט: '))).trim();
  if (!projectName) {
    console.log(chalk.red('❌  שם הפרויקט חובה.'));
    process.exit(1);
  }

  const requirements = await collectMultiline('\n📝  תאר את האפליקציה שאתה רוצה לבנות.');
  if (!requirements) {
    console.log(chalk.red('❌  הדרישות אינן יכולות להיות ריקות.'));
    process.exit(1);
  }

  const outputDir = path.resolve(process.cwd(), 'output', projectName.replace(/\s+/g, '-').toLowerCase());

  try {
    await orchestrate(requirements, projectName, outputDir);
  } catch (err) {
    console.error(chalk.red('\n❌  שגיאה:'), err.message);
    if (process.env.DEBUG) console.error(err.stack);
    process.exit(1);
  }
}

async function runUpgradeMode() {
  const repoUrl = (await ask(chalk.yellow('\n🔗  GitHub repo URL (לדוגמה: https://github.com/user/repo): '))).trim();
  if (!repoUrl || !repoUrl.startsWith('http')) {
    console.log(chalk.red('❌  כתובת URL תקינה נדרשת.'));
    process.exit(1);
  }

  const projectName = (await ask(chalk.yellow('📦  שם הפרויקט (לתיקיית output): '))).trim();
  if (!projectName) {
    console.log(chalk.red('❌  שם הפרויקט חובה.'));
    process.exit(1);
  }

  const upgradeRequirements = await collectMultiline('\n📝  מה אתה רוצה לשדרג או להוסיף לפרויקט?');
  if (!upgradeRequirements) {
    console.log(chalk.red('❌  נדרש לתאר מה לשדרג.'));
    process.exit(1);
  }

  const outputDir = path.resolve(process.cwd(), 'output', projectName.replace(/\s+/g, '-').toLowerCase());

  try {
    await orchestrateUpgrade(repoUrl, upgradeRequirements, projectName, outputDir);
  } catch (err) {
    console.error(chalk.red('\n❌  שגיאה:'), err.message);
    if (process.env.DEBUG) console.error(err.stack);
    process.exit(1);
  }
}

main();
