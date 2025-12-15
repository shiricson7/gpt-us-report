export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;

  if (typeof Event !== "undefined" && err instanceof Event) {
    return err.type ? `Event: ${err.type}` : "Event error";
  }

  if (err && typeof err === "object") {
    const message = (err as { message?: unknown }).message;
    if (typeof message === "string" && message) return message;

    const details = (err as { details?: unknown }).details;
    if (typeof details === "string" && details) return details;

    const description = (err as { error_description?: unknown }).error_description;
    if (typeof description === "string" && description) return description;
  }

  try {
    const json = JSON.stringify(err);
    if (json && json !== "{}") return json;
  } catch {
    // ignore
  }
  return String(err);
}

