function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

function optional(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

export const env = {
  get DATABASE_URL() { return required('DATABASE_URL'); },
  get GOOGLE_CLIENT_ID() { return required('GOOGLE_CLIENT_ID'); },
  get GOOGLE_CLIENT_SECRET() { return required('GOOGLE_CLIENT_SECRET'); },
  get GOOGLE_REDIRECT_URI() { return required('GOOGLE_REDIRECT_URI'); },
  get SESSION_SECRET() { return required('SESSION_SECRET'); },
  get PORT() { return parseInt(optional('PORT', '3000'), 10); },
  get BASE_URL() { return optional('BASE_URL', 'http://localhost:3000'); },
};
