'use strict';

const { DEPENDENCY_MAP } = require('./agentDependencies');

class ProjectContext {
  constructor(requirements, plan, outputDir) {
    this.requirements = requirements;
    this.plan = plan;
    this.outputDir = outputDir;
    this.agentOutputs = {};
    this.allFilesCreated = [];
  }

  addAgentOutput(agentName, summary, files) {
    this.agentOutputs[agentName] = { summary, files };
    this.allFilesCreated.push(...files);
  }

  buildScopedContext(agentName) {
    const lang = this.plan.language || 'en';
    const langInstruction = lang === 'he'
      ? 'Write all documentation files, comments, README files, and user-facing text in Hebrew (עברית). Code identifiers, variable names, function names, and technical terms remain in English.'
      : 'Write all documentation and comments in English.';

    const lines = [
      '# Project Requirements',
      this.requirements,
      '',
      '# Tech Stack Decisions',
      JSON.stringify(this.plan.techStack, null, 2),
      '',
      '# Output Language',
      langInstruction,
      '',
    ];

    if (this.plan.upgradeMode) {
      lines.push(
        '# Mode: UPGRADE EXISTING PROJECT',
        'You are UPGRADING an existing codebase — not building from scratch.',
        '- Use read_file to read existing files BEFORE modifying them',
        '- Preserve all existing functionality — only add or change what is in docs/upgrade-plan.md',
        '- When overwriting a file: read it first, keep all existing logic, add only the new parts',
        '- If a file should NOT change (listed in upgrade-plan.md "What NOT to Touch"), do not write it',
        '',
      );
    }

    lines.push(
      '# Output Directory',
      this.outputDir,
      '',
    );

    const deps = DEPENDENCY_MAP[agentName] || [];

    if (deps.length > 0) {
      lines.push('# Context From Dependencies', '');
      for (const depName of deps) {
        const output = this.agentOutputs[depName];
        if (!output) {
          lines.push(`## ${depName} Agent`, '(not run — optional agent skipped)', '');
          continue;
        }
        lines.push(
          `## ${depName} Agent Output`,
          output.summary,
          '',
          `Files created: ${output.files.join(', ')}`,
          '',
        );
      }
    }

    lines.push(
      `# Your Task — ${agentName} Agent`,
      `You are the ${agentName} agent. Using the context above, complete your specific role.`,
      'Write ALL output files using the write_file tool.',
      'Paths are relative to the output directory — do NOT include the output directory path itself.',
      '',
    );

    return lines.join('\n');
  }

  // Alias kept for backward compatibility
  buildContextMessage(agentName) {
    return this.buildScopedContext(agentName);
  }
}

module.exports = { ProjectContext };
