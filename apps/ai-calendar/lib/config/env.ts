const requiredEnvVars = [
  'NODE_ENV',
] as const;

const optionalEnvVars = [
  'OPENAI_API_KEY',
  'GEMINI_API_KEY',
  'GLM_API_KEY',
  'BAILIAN_API_KEY',
  'NEXT_PUBLIC_UMAMI_SCRIPT_URL',
  'NEXT_PUBLIC_UMAMI_WEBSITE_ID',
] as const;

export type RequiredEnvVar = typeof requiredEnvVars[number];
export type OptionalEnvVar = typeof optionalEnvVars[number];

interface EnvConfig {
  required: Record<RequiredEnvVar, string>;
  optional: Record<OptionalEnvVar, string | undefined>;
}

export function validateEnv(): EnvConfig {
  const missingVars: string[] = [];

  const required = {} as Record<RequiredEnvVar, string>;
  for (const key of requiredEnvVars) {
    const value = process.env[key];
    if (!value) {
      missingVars.push(key);
    } else {
      required[key] = value;
    }
  }

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  const optional = {} as Record<OptionalEnvVar, string | undefined>;
  for (const key of optionalEnvVars) {
    optional[key] = process.env[key];
  }

  const configuredProviders = [
    optional.OPENAI_API_KEY && 'openai',
    optional.GEMINI_API_KEY && 'gemini',
    optional.GLM_API_KEY && 'glm',
    optional.BAILIAN_API_KEY && 'bailian',
  ].filter(Boolean);

  console.log('✅ Environment variables validated');
  console.log(`📦 Configured AI providers: ${configuredProviders.length > 0 ? configuredProviders.join(', ') : 'none'}`);

  return { required, optional };
}

export function getEnvVar(key: RequiredEnvVar): string;
export function getEnvVar(key: OptionalEnvVar): string | undefined;
export function getEnvVar(key: RequiredEnvVar | OptionalEnvVar): string | undefined {
  return process.env[key];
}
