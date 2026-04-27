export class UserError extends Error {
  readonly code: string;

  constructor(message: string, code = "USER_ERROR") {
    super(message);
    this.name = "UserError";
    this.code = code;
  }
}

export function toUserMessage(error: unknown): string {
  if (error instanceof UserError) return error.message;
  if (error instanceof Error) return error.message;
  return String(error);
}
