export class ChatValidationError extends Error {
  constructor() {
    super("Invalid chat input");
    this.name = "ChatValidationError";
  }
}

export function parseChatInput(value: unknown): { body: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ChatValidationError();
  }
  const body = (value as Record<string, unknown>).body;
  if (typeof body !== "string") throw new ChatValidationError();
  const trimmed = body.trim();
  if (trimmed.length < 1 || trimmed.length > 280) throw new ChatValidationError();
  return { body: trimmed };
}
