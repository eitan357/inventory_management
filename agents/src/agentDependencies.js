'use strict';

const DEPENDENCY_MAP = {
  pmAgent:             [],
  requirementsAnalyst: [],
  systemArchitect:     ['requirementsAnalyst'],
  // Upgrade-mode analysis agents
  repoAnalyzer:        [],
  gapAnalyzer:         ['repoAnalyzer'],
  // Design layer — depends on either new-project or upgrade analysis
  dataArchitect:       ['requirementsAnalyst', 'systemArchitect', 'repoAnalyzer', 'gapAnalyzer'],
  apiDesigner:         ['requirementsAnalyst', 'systemArchitect', 'repoAnalyzer', 'gapAnalyzer'],
  frontendArchitect:   ['requirementsAnalyst', 'systemArchitect', 'repoAnalyzer', 'gapAnalyzer'],
  // Implementation layer
  backendDev:          ['systemArchitect', 'dataArchitect', 'apiDesigner', 'gapAnalyzer'],
  frontendDev:         ['systemArchitect', 'frontendArchitect', 'apiDesigner', 'gapAnalyzer'],
  authAgent:           ['systemArchitect', 'apiDesigner', 'dataArchitect', 'gapAnalyzer'],
  integrationAgent:    ['systemArchitect', 'apiDesigner', 'gapAnalyzer'],
  // Quality layer
  tester:              ['backendDev', 'frontendDev', 'authAgent', 'dataArchitect'],
  security:            ['backendDev', 'authAgent', 'apiDesigner'],
  reviewer:            ['backendDev', 'frontendDev', 'authAgent', 'integrationAgent'],
  // Operations layer
  devops:              ['systemArchitect', 'backendDev', 'frontendDev', 'repoAnalyzer'],
  documentation:       ['requirementsAnalyst', 'apiDesigner', 'backendDev', 'frontendDev', 'devops', 'gapAnalyzer'],
  summarizer:          ['requirementsAnalyst', 'systemArchitect', 'backendDev', 'frontendDev', 'authAgent', 'tester', 'devops', 'repoAnalyzer', 'gapAnalyzer'],
};

module.exports = { DEPENDENCY_MAP };
