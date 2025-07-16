// Helper for env validation (for test only)
export function validateEnv(required, env) {
  const missing = required.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Helper for splitting buttons into rows of 5 (for test only)
export function splitButtonsIntoRows(buttons) {
  const rows = [];
  for (let i = 0; i < buttons.length; i += 5) {
    rows.push(buttons.slice(i, i + 5));
  }
  return rows;
}
