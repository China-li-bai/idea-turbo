import { validateEnv } from './lib/config/env';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      validateEnv();
    } catch (error) {
      console.error('❌ Environment validation failed:', error);
      process.exit(1);
    }
  }
}
