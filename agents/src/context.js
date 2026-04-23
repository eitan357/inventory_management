'use strict';

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

  buildContextMessage(currentAgentName) {
    const lines = [
      '# Project Requirements',
      this.requirements,
      '',
      '# Tech Stack Decisions',
      JSON.stringify(this.plan.techStack, null, 2),
      '',
      '# Output Directory',
      this.outputDir,
      '',
    ];

    const previousOutputs = Object.entries(this.agentOutputs);
    if (previousOutputs.length > 0) {
      lines.push('# Work Done By Previous Agents', '');
      for (const [agentName, output] of previousOutputs) {
        lines.push(
          `## ${agentName} Agent`,
          output.summary,
          '',
          `Files created: ${output.files.join(', ')}`,
          '',
        );
      }
    }

    lines.push(
      `# Your Task — ${currentAgentName} Agent`,
      `You are the ${currentAgentName} agent. Using the context above, complete your specific role.`,
      'Write ALL output files using the write_file tool.',
      'Paths are relative to the output directory — do NOT include the output directory path itself.',
      '',
    );

    return lines.join('\n');
  }
}

module.exports = { ProjectContext };
