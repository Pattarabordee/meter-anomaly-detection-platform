export function readEnv(key: string, fallback = "") {
  const value = process.env[key];

  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed === "" ? fallback : trimmed;
}

export function readBooleanEnv(key: string, fallback: boolean) {
  const value = process.env[key];

  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on") {
    return true;
  }

  if (normalized === "false" || normalized === "0" || normalized === "no" || normalized === "off") {
    return false;
  }

  return fallback;
}
