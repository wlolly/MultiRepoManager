/**
 * 社交媒体认证配置管理
 * 用于管理微信、WhatsApp等社交媒体认证所需的API密钥和配置
 */

import fs from 'fs';
import path from 'path';
import { z } from 'zod';

// 配置文件路径
const CONFIG_DIR = path.join(process.cwd(), 'config');
const CONFIG_FILE = path.join(CONFIG_DIR, 'social-auth-config.json');

// 确保配置目录存在
if (!fs.existsSync(CONFIG_DIR)) {
  try {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  } catch (err) {
    console.error('创建配置目录失败:', err);
  }
}

// 验证模式
const SocialAuthConfigSchema = z.object({
  wechat: z.object({
    enabled: z.boolean().default(false),
    appId: z.string().optional(),
    appSecret: z.string().optional(),
    callbackUrl: z.string().optional(),
    lastUpdated: z.date().optional()
  }).default({
    enabled: false
  }),
  whatsapp: z.object({
    enabled: z.boolean().default(false),
    appId: z.string().optional(),
    appSecret: z.string().optional(),
    callbackUrl: z.string().optional(),
    lastUpdated: z.date().optional()
  }).default({
    enabled: false
  })
});

type SocialAuthConfig = z.infer<typeof SocialAuthConfigSchema>;

// 默认配置
const defaultConfig: SocialAuthConfig = {
  wechat: {
    enabled: false
  },
  whatsapp: {
    enabled: false
  }
};

// 读取配置
function readConfig(): SocialAuthConfig {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      // 如果配置文件不存在，返回默认配置并创建配置文件
      saveConfig(defaultConfig);
      return defaultConfig;
    }

    const configData = fs.readFileSync(CONFIG_FILE, 'utf-8');
    const parsedConfig = JSON.parse(configData);
    
    // 验证和处理日期字段
    if (parsedConfig.wechat?.lastUpdated) {
      parsedConfig.wechat.lastUpdated = new Date(parsedConfig.wechat.lastUpdated);
    }
    if (parsedConfig.whatsapp?.lastUpdated) {
      parsedConfig.whatsapp.lastUpdated = new Date(parsedConfig.whatsapp.lastUpdated);
    }
    
    // 使用Zod验证配置格式
    const validatedConfig = SocialAuthConfigSchema.parse(parsedConfig);
    return validatedConfig;
  } catch (err) {
    console.error('读取社交认证配置失败:', err);
    // 返回默认配置
    return defaultConfig;
  }
}

// 保存配置
function saveConfig(config: SocialAuthConfig): boolean {
  try {
    // 确保配置格式正确
    const validatedConfig = SocialAuthConfigSchema.parse(config);
    
    // 将配置写入文件
    fs.writeFileSync(
      CONFIG_FILE, 
      JSON.stringify(validatedConfig, null, 2), 
      'utf-8'
    );
    
    console.log('社交认证配置已保存');
    return true;
  } catch (err) {
    console.error('保存社交认证配置失败:', err);
    return false;
  }
}

// 更新微信配置
function updateWechatConfig(
  enabled: boolean,
  appId?: string,
  appSecret?: string,
  callbackUrl?: string
): boolean {
  try {
    const config = readConfig();
    
    config.wechat = {
      ...config.wechat,
      enabled,
      appId: appId || config.wechat.appId,
      appSecret: appSecret || config.wechat.appSecret,
      callbackUrl: callbackUrl || config.wechat.callbackUrl,
      lastUpdated: new Date()
    };
    
    return saveConfig(config);
  } catch (err) {
    console.error('更新微信配置失败:', err);
    return false;
  }
}

// 更新WhatsApp配置
function updateWhatsappConfig(
  enabled: boolean,
  appId?: string,
  appSecret?: string,
  callbackUrl?: string
): boolean {
  try {
    const config = readConfig();
    
    config.whatsapp = {
      ...config.whatsapp,
      enabled,
      appId: appId || config.whatsapp.appId,
      appSecret: appSecret || config.whatsapp.appSecret,
      callbackUrl: callbackUrl || config.whatsapp.callbackUrl,
      lastUpdated: new Date()
    };
    
    return saveConfig(config);
  } catch (err) {
    console.error('更新WhatsApp配置失败:', err);
    return false;
  }
}

// 检查微信配置是否完整有效
function isWechatConfigValid(): boolean {
  const config = readConfig();
  return config.wechat.enabled && 
         !!config.wechat.appId && 
         !!config.wechat.appSecret;
}

// 检查WhatsApp配置是否完整有效
function isWhatsappConfigValid(): boolean {
  const config = readConfig();
  return config.whatsapp.enabled && 
         !!config.whatsapp.appId && 
         !!config.whatsapp.appSecret;
}

// 获取微信配置 (隐藏敏感信息)
function getWechatConfig(): any {
  const config = readConfig();
  return {
    enabled: config.wechat.enabled,
    appId: config.wechat.appId ? maskString(config.wechat.appId) : undefined,
    hasAppSecret: !!config.wechat.appSecret,
    callbackUrl: config.wechat.callbackUrl,
    lastUpdated: config.wechat.lastUpdated,
    isValid: isWechatConfigValid()
  };
}

// 获取WhatsApp配置 (隐藏敏感信息)
function getWhatsappConfig(): any {
  const config = readConfig();
  return {
    enabled: config.whatsapp.enabled,
    appId: config.whatsapp.appId ? maskString(config.whatsapp.appId) : undefined,
    hasAppSecret: !!config.whatsapp.appSecret,
    callbackUrl: config.whatsapp.callbackUrl,
    lastUpdated: config.whatsapp.lastUpdated,
    isValid: isWhatsappConfigValid()
  };
}

// 掩码字符串 (用于在接口返回时保护敏感信息)
function maskString(str: string): string {
  if (!str || str.length < 8) return '********';
  const visibleChars = 4;
  return str.substring(0, visibleChars) + '*'.repeat(str.length - visibleChars);
}

// 获取所有社交认证配置 (隐藏敏感信息)
function getAllConfigs(): any {
  return {
    wechat: getWechatConfig(),
    whatsapp: getWhatsappConfig()
  };
}

export default {
  readConfig,
  saveConfig,
  updateWechatConfig,
  updateWhatsappConfig,
  isWechatConfigValid,
  isWhatsappConfigValid,
  getWechatConfig,
  getWhatsappConfig,
  getAllConfigs
};