/**
 * 社交媒体认证配置管理
 * 用于管理微信、WhatsApp等社交媒体认证所需的API密钥和配置
 */
import fs from 'fs';
import path from 'path';
import { z } from 'zod';

// 定义配置文件的架构
const SocialAuthPlatformSchema = z.object({
  enabled: z.boolean().default(false),
  appId: z.string().optional(),
  appSecret: z.string().optional(),
  callbackUrl: z.string().optional(),
  lastUpdated: z.string().optional()
});

const SocialAuthConfigSchema = z.object({
  wechat: SocialAuthPlatformSchema,
  whatsapp: SocialAuthPlatformSchema
});

type SocialAuthConfig = z.infer<typeof SocialAuthConfigSchema>;

// 默认配置
const defaultConfig: SocialAuthConfig = {
  wechat: {
    enabled: false,
    appId: '',
    appSecret: '',
    callbackUrl: ''
  },
  whatsapp: {
    enabled: false,
    appId: '',
    appSecret: '',
    callbackUrl: ''
  }
};

// 配置文件路径
const configPath = path.join(process.cwd(), 'social-auth-config.json');

// 读取配置
function readConfig(): SocialAuthConfig {
  try {
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf8');
      const parsedConfig = JSON.parse(configData);
      
      // 验证配置是否符合架构
      return SocialAuthConfigSchema.parse(parsedConfig);
    }
  } catch (error) {
    console.error('读取社交认证配置失败:', error);
  }
  
  // 如果读取失败或文件不存在，返回默认配置
  return defaultConfig;
}

// 保存配置
function saveConfig(config: SocialAuthConfig): boolean {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('保存社交认证配置失败:', error);
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
  const config = readConfig();
  const oldConfig = { ...config.wechat };
  
  config.wechat = {
    enabled,
    appId: appId || oldConfig.appId,
    appSecret: appSecret || oldConfig.appSecret,
    callbackUrl: callbackUrl || oldConfig.callbackUrl,
    lastUpdated: new Date().toISOString()
  };
  
  return saveConfig(config);
}

// 更新WhatsApp配置
function updateWhatsappConfig(
  enabled: boolean,
  appId?: string,
  appSecret?: string,
  callbackUrl?: string
): boolean {
  const config = readConfig();
  const oldConfig = { ...config.whatsapp };
  
  config.whatsapp = {
    enabled,
    appId: appId || oldConfig.appId,
    appSecret: appSecret || oldConfig.appSecret,
    callbackUrl: callbackUrl || oldConfig.callbackUrl,
    lastUpdated: new Date().toISOString()
  };
  
  return saveConfig(config);
}

// 验证微信配置是否有效
function isWechatConfigValid(): boolean {
  const config = readConfig();
  return (
    config.wechat.enabled &&
    !!config.wechat.appId &&
    !!config.wechat.appSecret &&
    !!config.wechat.callbackUrl
  );
}

// 验证WhatsApp配置是否有效
function isWhatsappConfigValid(): boolean {
  const config = readConfig();
  return (
    config.whatsapp.enabled &&
    !!config.whatsapp.appId &&
    !!config.whatsapp.appSecret &&
    !!config.whatsapp.callbackUrl
  );
}

// 获取微信配置（隐藏敏感信息）
function getWechatConfig(): any {
  const config = readConfig();
  return {
    enabled: config.wechat.enabled,
    appId: config.wechat.appId,
    hasAppSecret: !!config.wechat.appSecret,
    callbackUrl: config.wechat.callbackUrl,
    lastUpdated: config.wechat.lastUpdated,
    isValid: isWechatConfigValid()
  };
}

// 获取WhatsApp配置（隐藏敏感信息）
function getWhatsappConfig(): any {
  const config = readConfig();
  return {
    enabled: config.whatsapp.enabled,
    appId: config.whatsapp.appId,
    hasAppSecret: !!config.whatsapp.appSecret,
    callbackUrl: config.whatsapp.callbackUrl,
    lastUpdated: config.whatsapp.lastUpdated,
    isValid: isWhatsappConfigValid()
  };
}

// 隐藏敏感字符串，例如API密钥
function maskString(str: string): string {
  if (!str || str.length < 6) return '••••••';
  
  return str.substring(0, 3) + '••••••' + str.substring(str.length - 3);
}

// 获取所有配置（用于管理界面）
function getAllConfigs(): any {
  return {
    configs: {
      wechat: getWechatConfig(),
      whatsapp: getWhatsappConfig()
    }
  };
}

export default {
  readConfig,
  updateWechatConfig,
  updateWhatsappConfig,
  isWechatConfigValid,
  isWhatsappConfigValid,
  getWechatConfig,
  getWhatsappConfig,
  getAllConfigs
};