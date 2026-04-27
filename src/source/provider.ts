import { UserError } from "../errors/user-error.js";

export interface SourceResolution {
  dir: string;
  source: string;
  ref?: string;
  cleanup?: () => Promise<void>;
}

export interface SourceProvider {
  canResolve(source: string): Promise<boolean> | boolean;
  resolve(source: string): Promise<SourceResolution>;
}

export class SourceResolver {
  constructor(private readonly providers: SourceProvider[]) {}

  async resolve(source: string): Promise<SourceResolution> {
    for (const provider of this.providers) {
      if (await provider.canResolve(source)) {
        return provider.resolve(source);
      }
    }

    throw new UserError(`Unsupported source: ${source}`, "UNSUPPORTED_SOURCE");
  }
}
