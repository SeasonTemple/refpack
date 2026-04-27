import * as p from "@clack/prompts";
import figlet from "figlet";
import type { SkillDefinition } from "../manifest/types.js";
import { UserError } from "../errors/user-error.js";

export function renderIntro(title = "REFPACK", enabled = process.stdout.isTTY): void {
  if (!enabled) return;
  try {
    const banner = figlet.textSync(title, { horizontalLayout: "default", width: 80 });
    console.log(banner);
  } catch {
    // Banner is decorative. Failure should never block installation.
  }
  p.intro("refpack");
}

export function renderOutro(message: string): void {
  p.outro(message);
}

export async function promptForTarget(defaultValue?: string): Promise<string> {
  const value = await p.text({
    message: "Target skills directory",
    placeholder: defaultValue ?? "./skills",
    initialValue: defaultValue
  });
  return unwrapPrompt(value, "Init cancelled.");
}

export async function promptForRegistry(defaultValue?: string): Promise<string | undefined> {
  const value = await p.text({
    message: "Registry URL or JSON file",
    placeholder: defaultValue ?? "optional",
    initialValue: defaultValue,
    validate: () => undefined
  });
  const result = unwrapPrompt(value, "Init cancelled.");
  return result.trim() === "" ? undefined : result;
}

export async function selectSkills(skills: SkillDefinition[], required = true): Promise<string[]> {
  const selected = await p.multiselect({
    message: "Select skills to install",
    required,
    options: skills.map((skill) => ({
      value: skill.id,
      label: skill.name,
      hint: skill.description
    }))
  });

  return unwrapPrompt(selected, "Install cancelled.");
}

export async function confirmAction(message: string, initialValue = true): Promise<boolean> {
  const value = await p.confirm({ message, initialValue });
  return unwrapPrompt(value, "Cancelled.");
}

export function createSpinner(): ReturnType<typeof p.spinner> {
  return p.spinner();
}

function unwrapPrompt<T>(value: T | symbol, cancelMessage: string): T {
  if (p.isCancel(value)) {
    p.cancel(cancelMessage);
    throw new UserError(cancelMessage, "CANCELLED");
  }
  return value as T;
}
