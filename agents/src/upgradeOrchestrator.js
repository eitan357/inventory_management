'use strict';

const Anthropic = require('@anthropic-ai/sdk');
const chalk = require('chalk');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const { ProjectContext } = require('./context');
const { approveStep, approveLayer } = require('./approval');
const { createFileSystemTools } = require('./tools/fileSystem');
const { createShellTools } = require('./tools/shell');
const { runLayerInParallel, runLayerSequential } = require('./layerRunner');

const { createRepoAnalyzerAgent } = require('./agents/repoAnalyzer');
const { createGapAnalyzerAgent } = require('./agents/gapAnalyzer');
const { createDataArchitectAgent } = require('./agents/dataArchitect');
const { createApiDesignerAgent } = require('./agents/apiDesigner');
const { createFrontendArchitectAgent } = require('./agents/frontendArchitect');
const { createBackendDevAgent } = require('./agents/backendDev');
const { createFrontendDevAgent } = require('./agents/frontendDev');
const { createAuthAgent } = require('./agents/authAgent');
const { createIntegrationAgent } = require('./agents/integrationAgent');
const { createSecurityAgent } = require('./agents/security');
const { createTesterAgent } = require('./agents/tester');
const { createReviewerAgent } = require('./agents/reviewer');
const { createDevOpsAgent } = require('./agents/devops');
const { createDocumentationAgent } = require('./agents/documentation');
const { createSummarizerAgent } = require('./agents/summarizer');

const AGENT_REGISTRY = {
  repoAnalyzer:    createRepoAnalyzerAgent,
  gapAnalyzer:     createGapAnalyzerAgent,
  dataArchitect:   createDataArchitectAgent,
  apiDesigner:     createApiDesignerAgent,
  frontendArchitect: createFrontendArchitectAgent,
  backendDev:      createBackendDevAgent,
  frontendDev:     createFrontendDevAgent,
  authAgent:       createAuthAgent,
  integrationAgent: createIntegrationAgent,
  tester:          createTesterAgent,
  security:        createSecurityAgent,
  reviewer:        createReviewerAgent,
  devops:          createDevOpsAgent,
  documentation:   createDocumentationAgent,
  summarizer:      createSummarizerAgent,
};

const UPGRADE_PLAN_SCHEMA = `{
  "projectName": "string",
  "description": "string — what is being upgraded (write in the detected language)",
  "language": "he OR en",
  "techStack": {
    "backend": "detected from existing code",
    "frontend": "detected OR none",
    "database": "detected",
    "deployment": "detected OR unknown",
    "auth": "detected OR none"
  },
  "upgradeMode": true,
  "layers": {
    "layer2": {
      "include": true,
      "reason": "why design layer is needed (or 'not needed')",
      "agents": ["dataArchitect", "apiDesigner"]
    },
    "layer3": {
      "agents": ["backendDev"],
      "includeFrontend": false,
      "includeIntegration": false
    },
    "layer4": { "agents": ["tester", "security", "reviewer"] },
    "layer5": { "agents": ["devops", "documentation", "summarizer"] }
  },
  "estimatedFiles": 12
}`;

function cloneRepo(repoUrl, outputDir) {
  const parentDir = path.dirname(outputDir);
  const dirName = path.basename(outputDir);

  if (fs.existsSync(outputDir)) {
    console.log(chalk.yellow(`  Directory already exists: ${outputDir}`));
    console.log(chalk.gray('  Using existing directory (not re-cloning)'));
    return;
  }

  fs.mkdirSync(parentDir, { recursive: true });
  console.log(chalk.yellow(`  Cloning ${repoUrl}...`));
  execSync(`git clone "${repoUrl}" "${dirName}"`, {
    cwd: parentDir,
    timeout: 120_000,
    stdio: 'pipe',
  });
  console.log(chalk.green('  Clone complete.'));
}

async function createUpgradePlan(upgradeRequirements, projectName, currentStateContent) {
  const client = new Anthropic();

  const response = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 2048,
    system: [
      {
        type: 'text',
        text: `You are a Project Manager AI. Given an analysis of an existing codebase and a user's upgrade request, produce a focused JSON execution plan.

Key principle: MINIMAL SCOPE — only include agents that are actually needed for the requested changes.

Rules:
- layer2 (Design): include ONLY if new DB models or new API endpoints are needed
- layer3 backendDev: include if any server-side code changes are needed
- layer3 frontendDev: include ONLY if UI changes are needed
- layer3 authAgent: include ONLY if authentication is being added or changed
- layer3 integrationAgent: include ONLY if new third-party integrations are needed
- layer4 (Quality): always include tester, security, reviewer
- layer5 (Operations): always include devops, documentation, summarizer
- Detect language from the upgrade requirements text (he = Hebrew, en = English)
- Return ONLY valid JSON matching this schema exactly:
${UPGRADE_PLAN_SCHEMA}`,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: `Project Name: ${projectName}

## Current Codebase Analysis:
${currentStateContent.slice(0, 4000)}

## Upgrade Requirements:
${upgradeRequirements}`,
      },
    ],
  });

  const text = response.content.find(b => b.type === 'text')?.text || '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('PM Agent failed to generate a valid upgrade plan.');
  return JSON.parse(jsonMatch[0]);
}

function buildUpgradeLayers(plan) {
  const layers = [];
  const l3 = plan.layers?.layer3 || {};

  // Layer 2 — Design (optional)
  if (plan.layers?.layer2?.include !== false) {
    const l2agents = plan.layers?.layer2?.agents || [];
    if (l2agents.length > 0) {
      layers.push({ id: 2, name: 'Design', parallel: true, agents: l2agents });
    }
  }

  // Layer 3 — Implementation
  const implAgents = [...(l3.agents || [])];
  if (l3.includeFrontend === true) implAgents.push('frontendDev');
  if (l3.includeIntegration === true) implAgents.push('integrationAgent');
  if (implAgents.length > 0) {
    layers.push({ id: 3, name: 'Implementation', parallel: true, agents: implAgents });
  }

  // Layer 4 — Quality (always)
  layers.push({
    id: 4, name: 'Quality', parallel: true,
    agents: plan.layers?.layer4?.agents || ['tester', 'security', 'reviewer'],
  });

  // Layer 5 — Operations (always, no gate)
  layers.push({
    id: 5, name: 'Operations', parallel: true,
    agents: plan.layers?.layer5?.agents || ['devops', 'documentation', 'summarizer'],
    skipApprovalGate: true,
  });

  return layers;
}

function formatUpgradePlan(plan) {
  const l2 = plan.layers?.layer2 || {};
  const l3 = plan.layers?.layer3 || {};
  const lines = [
    `📦  Project : ${plan.projectName}`,
    `📝  ${plan.description}`,
    `🌐  Language : ${plan.language === 'he' ? 'Hebrew (עברית)' : 'English'}`,
    `🔧  Mode     : UPGRADE (existing project)`,
    '',
    '🛠   Detected Tech Stack:',
    `    Backend   : ${plan.techStack.backend}`,
    `    Frontend  : ${plan.techStack.frontend}`,
    `    Database  : ${plan.techStack.database}`,
    `    Auth      : ${plan.techStack.auth}`,
    '',
    '🤖  Agents Selected (minimal scope):',
  ];

  if (l2.include !== false && (l2.agents || []).length > 0) {
    lines.push(`    Layer 2 — Design        : ${l2.agents.join(', ')} (${l2.reason || ''})`);
  }
  const implAgents = [...(l3.agents || [])];
  if (l3.includeFrontend) implAgents.push('frontendDev');
  if (l3.includeIntegration) implAgents.push('integrationAgent');
  if (implAgents.length > 0) {
    lines.push(`    Layer 3 — Implementation: ${implAgents.join(', ')}`);
  }
  lines.push(
    `    Layer 4 — Quality       : tester, security, reviewer`,
    `    Layer 5 — Operations    : devops, documentation, summarizer`,
    '',
    `📁  Estimated changed files: ~${plan.estimatedFiles}`,
  );
  return lines.join('\n');
}

async function orchestrateUpgrade(repoUrl, upgradeRequirements, projectName, outputDir) {
  console.log(chalk.bold.cyan('\n🔧  App Builder Agents — Upgrade Mode\n'));

  // 1. Clone repo
  console.log(chalk.yellow('📥  Step 1: Cloning repository...'));
  try {
    cloneRepo(repoUrl, outputDir);
  } catch (err) {
    console.log(chalk.red(`❌  Clone failed: ${err.message}`));
    console.log(chalk.yellow('    Make sure the URL is correct and you have access to the repo.'));
    return;
  }

  // 2. Setup tools (outputDir is now the cloned repo)
  const fsTools = createFileSystemTools(outputDir);
  const shellTools = createShellTools(outputDir);
  const toolSets = {
    fs: fsTools,
    all: {
      tools: [...fsTools.tools, ...shellTools.tools],
      handlers: { ...fsTools.handlers, ...shellTools.handlers },
    },
  };

  // 3. Run analysis layer (sequential: repoAnalyzer → gapAnalyzer)
  console.log(chalk.bold.cyan('\n━━━  Analysis Layer: Reading Existing Code  ━━━'));
  console.log(chalk.gray('Agents: repoAnalyzer → gapAnalyzer (sequential)'));

  const analysisPlan = {
    techStack: {},
    language: 'en',
    upgradeMode: true,
    upgradeRequirements,
  };
  const analysisContext = new ProjectContext(upgradeRequirements, analysisPlan, outputDir);

  const analysisResults = await runLayerSequential(
    [{ name: 'repoAnalyzer', needsShell: false }, { name: 'gapAnalyzer', needsShell: false }],
    analysisContext,
    toolSets,
    AGENT_REGISTRY,
  );

  // 4. Show analysis results → user approval
  const proceed = await approveLayer('Analysis — Existing Codebase + Upgrade Plan', analysisResults);
  if (!proceed) {
    console.log(chalk.red('\n❌  הופסק על ידי המשתמש.'));
    return;
  }

  // 5. Read current-state.md to inform PM Agent
  let currentStateContent = '';
  try {
    const { content } = fsTools.handlers.read_file({ file_path: 'docs/current-state.md' });
    currentStateContent = content || '';
  } catch (_) {
    currentStateContent = analysisResults.repoAnalyzer?.summary || '';
  }

  // 6. Generate focused upgrade plan via PM Agent
  console.log(chalk.yellow('\n⏳  Generating targeted upgrade plan...'));
  const plan = await createUpgradePlan(upgradeRequirements, projectName, currentStateContent);

  // 7. Show upgrade plan → user approval
  const planApproved = await approveStep(
    'תוכנית השדרוג',
    'בדוק אילו agents ירוצו לפני שנתחיל:',
    formatUpgradePlan(plan),
  );
  if (!planApproved) {
    console.log(chalk.red('\n❌  הופסק על ידי המשתמש.'));
    return;
  }

  // 8. Build full context for upgrade (includes analysis outputs)
  const fullContext = new ProjectContext(upgradeRequirements, plan, outputDir);
  // Carry over analysis agent outputs so upgrade agents have them in scope
  for (const [name, result] of Object.entries(analysisResults)) {
    if (result && result.summary) {
      fullContext.addAgentOutput(name, result.summary, result.filesCreated || []);
    }
  }

  // 9. Run upgrade layers
  const upgradeLayers = buildUpgradeLayers(plan);

  for (const layerDef of upgradeLayers) {
    const agentConfigs = layerDef.agents
      .filter(name => AGENT_REGISTRY[name])
      .map(name => ({ name, needsShell: name === 'devops' }));

    if (agentConfigs.length === 0) continue;

    console.log(chalk.bold.cyan(`\n━━━  Layer ${layerDef.id}: ${layerDef.name}  ━━━`));
    console.log(chalk.gray(`Agents: ${agentConfigs.map(a => a.name).join(', ')}`));

    let layerResults;
    if (layerDef.parallel) {
      layerResults = await runLayerInParallel(agentConfigs, fullContext, toolSets, AGENT_REGISTRY);
    } else {
      layerResults = await runLayerSequential(agentConfigs, fullContext, toolSets, AGENT_REGISTRY);
    }

    if (!layerDef.skipApprovalGate) {
      const cont = await approveLayer(`Layer ${layerDef.id} — ${layerDef.name}`, layerResults);
      if (!cont) {
        console.log(chalk.yellow('\n⏹️   הופסק על ידי המשתמש.'));
        break;
      }
    }
  }

  // 10. Done
  console.log(chalk.bold.green('\n✅  השדרוג הושלם!'));
  console.log(chalk.white(`📂  פרויקט ב: ${outputDir}`));
  console.log(chalk.white(`📊  קבצים שנוצרו/עודכנו: ${fullContext.allFilesCreated.length}`));
  fullContext.allFilesCreated.forEach(f => console.log(chalk.green(`   ✓ ${f}`)));
}

module.exports = { orchestrateUpgrade };
