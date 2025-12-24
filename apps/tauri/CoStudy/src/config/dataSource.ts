/**
 * 数据源配置管理
 * 
 * 遵循 Linus 编码哲学：
 * 1. 简单胜过复杂 - 统一的配置入口
 * 2. 透明度 - 数据源选择逻辑清晰可见
 * 3. 默认安全 - 默认使用本地数据库（所有环境）
 * 
 * 数据源策略：
 * - 默认：本地 SQLite (PGlite) - 适用所有环境（包括 iOS 14）
 * - 可选：Supabase - 需要明确配置环境变量 VITE_DATA_SOURCE=supabase
 * - iOS 14 兼容：支持 Supabase，但不自动切换
 */

import type { PGlite } from "@electric-sql/pglite";
import type { DataSource, DataAccessConfig } from "@/services/UnifiedDataAccess";

/**
 * 检测是否为 iOS 14 或更早版本
 */
function isIOS14orBelow(): boolean {
    if (typeof navigator === "undefined") return false;
    const userAgent = navigator.userAgent;
    const match = userAgent.match(/OS (\d+)_/);
    if (match && match[1]) {
        const version = parseInt(match[1], 10);
        return version <= 14;
    }
    return false;
}

/**
 * 从环境变量读取数据源配置
 * 
 * 优先级：
 * 1. 环境变量 VITE_DATA_SOURCE（明确指定）
 * 2. 默认 'local'（本地 SQLite）
 * 
 * 注意：即使在 iOS 14 环境，默认也使用本地 SQLite
 * 只有明确设置 VITE_DATA_SOURCE=supabase 时才使用 Supabase
 */
export function getDataSourceFromEnv(): DataSource {
    // 检查环境变量 - 只有明确设置时才使用
    const envDataSource = import.meta.env?.VITE_DATA_SOURCE;
    if (envDataSource === 'supabase' || envDataSource === 'hybrid') {
        console.info('[DataSource] 环境变量指定使用:', envDataSource);
        return envDataSource as DataSource;
    }

    // 默认使用本地数据库（包括 iOS 14）
    return 'local';
}

/**
 * 获取 Supabase 配置
 */
export function getSupabaseConfig() {
    return {
        url: import.meta.env?.VITE_SUPABASE_URL || '',
        anonKey: import.meta.env?.VITE_SUPABASE_ANON_KEY || '',
    };
}

/**
 * 创建默认数据访问配置
 * 
 * @param localDb - 可选的本地数据库实例（如果已初始化）
 */
export function createDefaultDataAccessConfig(localDb?: PGlite): DataAccessConfig {
    const dataSource = getDataSourceFromEnv();

    const config: DataAccessConfig = {
        dataSource,
    };

    // 如果使用本地或混合模式，需要本地数据库
    if (dataSource === 'local' || dataSource === 'hybrid') {
        if (!localDb) {
            console.warn('[DataSource] 本地数据库未提供，但数据源配置需要本地数据库');
        }
        config.localDb = localDb;
    }

    // 如果使用 Supabase 或混合模式，添加 Supabase 配置
    if (dataSource === 'supabase' || dataSource === 'hybrid') {
        config.supabaseConfig = getSupabaseConfig();
    }

    return config;
}

/**
 * 日志记录：数据源配置信息
 */
export function logDataSourceConfig(config: DataAccessConfig): void {
    console.group('[DataSource] 配置信息');
    console.log('数据源类型:', config.dataSource);
    console.log('本地数据库:', config.localDb ? '✓ 已配置' : '✗ 未配置');
    console.log('Supabase:', config.supabaseConfig ? '✓ 已配置' : '✗ 未配置');
    console.groupEnd();
}

// 导出类型检查工具
export { isIOS14orBelow };
