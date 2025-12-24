/// <reference types="vite/client" />

// Extend ImportMeta interface for Vite environment variables
interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string;
    readonly VITE_SUPABASE_ANON_KEY: string;
    readonly VITE_DATABASE_URL?: string;
    // DEV, PROD, SSR are already defined by Vite's ImportMetaEnv
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
