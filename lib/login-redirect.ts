export function resolveLoginDestination(
  value: string | null | undefined,
): string {
  if (
    !value ||
    value.includes("\\") ||
    !/^\/(?:id|en)(?:\/|$)/.test(value)
  ) {
    return "/id";
  }

  return value;
}
