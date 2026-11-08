export function buildLocalePath(
  pathname: string,
  targetLocale: "id" | "en",
  search = "",
): string {
  const segments = pathname.split("/");
  if (segments[1] === "id" || segments[1] === "en") {
    segments[1] = targetLocale;
  } else {
    segments.splice(1, 0, targetLocale);
  }
  return `${segments.join("/")}${search}`;
}
