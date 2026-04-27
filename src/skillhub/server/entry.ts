import { createSkillHubApp } from "./app.js";
import { resolveSkillHubServerConfig } from "./config.js";
import { toUserMessage } from "../../errors/user-error.js";

try {
  const config = resolveSkillHubServerConfig();
  const app = await createSkillHubApp(config);
  await app.listen();
  console.log(`SkillHub listening at ${config.publicBaseUrl}`);
} catch (error) {
  console.error(toUserMessage(error));
  process.exit(1);
}
