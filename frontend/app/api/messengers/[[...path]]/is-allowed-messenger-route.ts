export function isAllowedMessengerRoute(
  method: string,
  resource: string,
): boolean {
  switch (method) {
    case "GET":
      return resource === "";
    case "POST":
      return /^(TELEGRAM|MAX)\/(link|confirm)$/.test(resource);
    case "PATCH":
      return /^(TELEGRAM|MAX)\/notifications$/.test(resource);
    case "DELETE":
      return /^(TELEGRAM|MAX)$/.test(resource);
    default:
      return false;
  }
}
