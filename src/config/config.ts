import 'dotenv/config';

function loadEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} environment variable is not set`);
  }
  return value;
}

export const DISCORD_CONFIG = {
  BOT_TOKEN: loadEnv('DISCORD_BOT_TOKEN'),
  CLIENT_ID: loadEnv('DISCORD_CLIENT_ID'),
};

export const OPENAI_CONFIG = {
  API_KEY: loadEnv('OPENAI_API_KEY'),
};
