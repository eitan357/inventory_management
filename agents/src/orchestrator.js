'use strict';

const Anthropic = require('@anthropic-ai/sdk');
const chalk = require('chalk');
const path = require('path');

const { ProjectContext } = require('./context');
const { approveStep, showAgentOutput } = require('./approval');
const { createFileSystemTools } = require('./tools/fileSystem');
const { createShellTools } = require('./tools/shell');

const { createArchitectAgent } = require('./agents/architect');
const { createDbDesignerAgent } = require('./agents/dbDesigner');
const { createBackendDevAgent } = require('./agents/backendDev');
const { createFrontendDevAgent } = require('./agents/frontendDev');
const { createSecurityAgent } = require('./agents/security');
const { createTesterAgent } = require('./agents/tester');
const { createReviewerAgent } = require('./agents/reviewer');
const { createDevOpsAgent } = require('./agents/devops');

const AGENT_REGISTRY = {
  architect: createArchitectAgent,
  dbDesigner: createDbDesignerAgent,
  backendDev: createBackendDevAgent,
  frontendDev: createFrontendDevAgent,
  security: createSecurityAgent,
  tester: createTesterAgent,
  reviewer: createReviewerAgent,
  devops: createDevOpsAgent,
};

async function createPlan(requirements, projectName) {
  const client = new Anthropic();

  const planSchema = `{
  "projectName": "string",
  "description": "string (2-3 sentences about what this app does)",
  "techStack": {
    "backend": "e.g. Node.js + Express + MongoDB",
    "frontend": "e.g. React Native + Expo OR React + Next.js OR none",
    "database": "e.g. MongoDB OR PostgreSQL OR SQLite",
    "deployment": "e.g. Docker + GitHub Actions"
  },
  "agents": [
    { "name": "architect", "order": 1, "reason": "why this agent is needed" },
    ...
  ],
  "estimatedFiles": 35
}`;

  const response = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 2048,
    system: [
      {
        type: 'text',
        text: `You are a Project Manager AI. Analyze requirements and produce a JSON execution plan.

Available agents: architect, dbDesigner, backendDev, frontendDev, security, tester, reviewer, devops

Rules:
- Include only agents that are truly needed
- architect is always first
- devops is always last
- Return ONLY valid JSON matching this schema exactly:
${planSchema}`,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: `Project Name: ${projectName}\n\nRequirements:\n${requirements}`,
      },
    ],
  });

  const text = response.content.find(b => b.type === 'text')?.text || '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('PM Agent failed to generate a valid JSON plan.');
  return JSON.parse(jsonMatch[0]);
}

async function orchestrate(requirements, projectName, outputDir) {
  console.log(chalk.bold.cyan('\n🚀  App Builder Agents — Starting\n'));

  // 1. Generate plan
  console.log(chalk.yellow('⏳  Generating project plan...'));
  const plan = await createPlan(requirements, projectName);

  // 2. Show plan → user approval
  const planDetails = [
    `📦  Project : ${plan.projectName}`,
    `📝  What it does: ${plan.description}`,
    '',
    '🛠   Tech Stack:',
    `    Backend   : ${plan.techStack.backend}`,
    `    Frontend  : ${plan.techStack.frontend}`,
    `    Database  : ${plan.techStack.database}`,
    `    Deployment: ${plan.techStack.deployment}`,
    '',
    `🤖  Agents (${plan.agents.length}):`,
    ...plan.agents
      .sort((a, b) => a.order - b.order)
      .map(a => `    ${a.order}. ${a.name.padEnd(12)} — ${a.reason}`),
    '',
    `📁  Estimated files : ~${plan.estimatedFiles}`,
    `📂  Output directory: ${outputDir}`,
  ].join('\n');

  const planApproved = await approveStep('תוכנית הפרויקט', 'בדוק את התוכנית לפני שנתחיל לבנות:', planDetails);
  if (!planApproved) {
    console.log(chalk.red('\n❌  הופסק על ידי המשתמש.'));
    return;
  }

  // 3. Setup
  const context = new ProjectContext(requirements, plan, outputDir);
  const fsTools = createFileSystemTools(outputDir);
  const shellTools = createShellTools(outputDir);
  const allTools = {
    tools: [...fsTools.tools, ...shellTools.tools],
    handlers: { ...fsTools.handlers, ...shellTools.handlers },
  };

  // 4. Run agents in order
  const sortedAgents = [...plan.agents].sort((a, b) => a.order - b.order);

  for (const agentConfig of sortedAgents) {
    const createAgent = AGENT_REGISTRY[agentConfig.name];
    if (!createAgent) {
      console.log(chalk.yellow(`⚠️   Unknown agent "${agentConfig.name}" — skipping`));
      continue;
    }

    // Approval before each agent
    const agentApproved = await approveStep(
      `${agentConfig.name} Agent (${agentConfig.order}/${sortedAgents.length})`,
      agentConfig.reason,
    );
    if (!agentApproved) {
      console.log(chalk.yellow(`⏭️   Skipping ${agentConfig.name}`));
      continue;
    }

    console.log(chalk.cyan(`\n⚙️   Running ${agentConfig.name} agent...`));

    // DevOps gets shell tools too; others get fs only
    const toolSet = agentConfig.name === 'devops' ? allTools : fsTools;
    const agent = createAgent(toolSet);

    const contextMessage = context.buildContextMessage(agentConfig.name);
    const result = await agent.run(contextMessage);

    context.addAgentOutput(agentConfig.name, result.summary, result.filesCreated);

    const continueApproved = await showAgentOutput(agentConfig.name, result.summary, result.filesCreated);
    if (!continueApproved) {
      console.log(chalk.yellow('\n⏹️   הופסק על ידי המשתמש.'));
      break;
    }
  }

  // 5. Done
  console.log(chalk.bold.green('\n✅  הבנייה הושלמה!'));
  console.log(chalk.white(`📂  קבצים ב: ${outputDir}`));
  console.log(chalk.white(`📊  סה"כ קבצים: ${context.allFilesCreated.length}`));
  context.allFilesCreated.forEach(f => console.log(chalk.green(`   ✓ ${f}`)));
}

module.exports = { orchestrate };
