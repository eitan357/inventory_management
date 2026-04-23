'use strict';

const readline = require('readline');
const chalk = require('chalk');

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

async function approveStep(stepName, description, details = null) {
  console.log('\n' + chalk.cyan('─'.repeat(60)));
  console.log(chalk.bold.yellow(`📋  ${stepName}`));
  console.log(chalk.white(description));
  if (details) {
    console.log('\n' + chalk.gray(details));
  }
  console.log(chalk.cyan('─'.repeat(60)));
  const answer = await ask(chalk.bold.green('▶  להמשיך? (y/n): '));
  return answer === 'y' || answer === 'yes' || answer === '';
}

async function showAgentOutput(agentName, summary, filesCreated) {
  console.log('\n' + chalk.cyan('═'.repeat(60)));
  console.log(chalk.bold.blue(`✅  ${agentName} Agent — הסתיים`));

  const MAX = 600;
  const display = summary.length > MAX ? summary.slice(0, MAX) + '...' : summary;
  console.log('\n' + chalk.gray(display));

  if (filesCreated.length > 0) {
    console.log(chalk.white('\nקבצים שנוצרו:'));
    filesCreated.forEach(f => console.log(chalk.green(`  ✓ ${f}`)));
  }
  console.log(chalk.cyan('═'.repeat(60)));

  const answer = await ask(chalk.bold.green('▶  להמשיך לשלב הבא? (y/n): '));
  return answer === 'y' || answer === 'yes' || answer === '';
}

module.exports = { approveStep, showAgentOutput, ask };
