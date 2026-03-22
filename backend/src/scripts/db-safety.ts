const LOCAL_DATABASE_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

export function isSafeResetTarget(databaseUrl: string): boolean {
  try {
    const parsedUrl = new URL(databaseUrl);

    return LOCAL_DATABASE_HOSTS.has(parsedUrl.hostname);
  } catch {
    return false;
  }
}
