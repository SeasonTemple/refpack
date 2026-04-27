import { execa } from "execa";
import { UserError } from "../errors/user-error.js";

export interface DependencyInstallOptions {
  cwd: string;
  dependencies: string[];
  allowScripts: boolean;
  packageManager?: "npm" | "pnpm" | "yarn" | "bun";
  silent?: boolean;
}

export async function installDependencies(options: DependencyInstallOptions): Promise<void> {
  if (options.dependencies.length === 0) return;

  const packageManager = options.packageManager ?? "npm";
  const args = buildInstallArgs(packageManager, options.dependencies, options.allowScripts);

  try {
    await execa(packageManager, args, {
      cwd: options.cwd,
      stdout: options.silent ? "pipe" : "inherit",
      stderr: options.silent ? "pipe" : "inherit"
    });
  } catch (error) {
    throw new UserError(`Dependency install failed with ${packageManager}: ${(error as Error).message}`, "DEPENDENCY_INSTALL_FAILED");
  }
}

function buildInstallArgs(packageManager: string, dependencies: string[], allowScripts: boolean): string[] {
  switch (packageManager) {
    case "pnpm":
      return ["add", ...dependencies, ...(allowScripts ? [] : ["--ignore-scripts"])];
    case "yarn":
      return ["add", ...dependencies, ...(allowScripts ? [] : ["--ignore-scripts"])];
    case "bun":
      return ["add", ...dependencies, ...(allowScripts ? [] : ["--ignore-scripts"])];
    case "npm":
    default:
      return ["install", ...dependencies, ...(allowScripts ? [] : ["--ignore-scripts"])];
  }
}
