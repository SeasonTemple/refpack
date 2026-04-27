export interface SkillDependencySpec {
  npm?: string[];
}

export interface SkillConfigInstruction {
  adapter: string;
  instructions: string;
}

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  source: string;
  target: string;
  adapters?: string[];
  dependencies?: SkillDependencySpec;
  requiresScripts?: boolean;
  configInstructions?: SkillConfigInstruction[];
}

export interface SkillsManifest {
  schemaVersion: string;
  name: string;
  skills: SkillDefinition[];
}

export const MANIFEST_FILE = "skills.json";
