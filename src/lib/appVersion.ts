// expo-application is a native module — on a binary that received this
// code via OTA before that module was compiled in (same OTA-vs-build gap
// as index.js's background task note), even importing it throws at module
// evaluation time, not just when a function on it is called. A dynamic
// require() inside this try/catch, instead of a static top-level import,
// keeps that failure contained here.
export function getInstalledAppVersion(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Application = require('expo-application');
    return Application.nativeApplicationVersion ?? null;
  } catch {
    return null;
  }
}

function parseVersionParts(v: string): number[] {
  return v.split('.').map((n) => parseInt(n, 10) || 0);
}

// Plain major.minor.patch comparison — fine for our own self-authored
// version strings, no need for a full semver library.
export function isVersionAtLeast(current: string, min: string): boolean {
  const a = parseVersionParts(current);
  const b = parseVersionParts(min);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x > y;
  }
  return true;
}
