import { GigetSourceProvider } from "./giget-provider.js";
import { HttpArchiveSourceProvider } from "./http-archive-provider.js";
import { LocalSourceProvider } from "./local-provider.js";
import { SourceResolver } from "./provider.js";

export function createSourceResolver(): SourceResolver {
  return new SourceResolver([new LocalSourceProvider(), new HttpArchiveSourceProvider(), new GigetSourceProvider()]);
}
