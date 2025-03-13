import axios from 'axios';
import { ApiConfiguration, InsertEcommerceProduct, EcommerceProduct } from '@shared/schema';
import { IStorage } from '../storage';
import { processProductCode, extractProductCodeFromApiItem } from '../utils/product-code-matcher';

/**
 * 电商平台API集成服务
 */
export class EcommerceApiService {
  constructor(private storage: IStorage) {}

  /**
   * 获取电商平台的产品数据
   * @param configId API配置ID
   * @returns 产品数据列表
   */
  async fetchProductsFromPlatform(configId: number): Promise<{
    success: boolean;
    data: any[];
    message: string;
    total: number;
  }> {
    try {
      // 获取API配置
      const config = await this.storage.getApiConfiguration(configId);
      if (!config) {
        return { 
          success: false, 
          data: [], 
          message: '找不到API配置', 
          total: 0 
        };
      }

      // 验证配置是否激活
      if (!config.isActive) {
        return { 
          success: false, 
          data: [], 
          message: 'API配置未激活', 
          total: 0 
        };
      }

      // 记录最后同步时间
      await this.storage.updateApiConfiguration(config.id, {
        lastSyncTime: new Date()
      });

      // 解析附加配置
      const additionalConfig = config.config ? JSON.parse(config.config) : {};

      // 准备API请求
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      // 添加API密钥到请求头或参数
      if (config.apiKey) {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
        // 不同平台可能有不同的认证方式
        headers['X-API-Key'] = config.apiKey;
      }

      // 发送请求到电商平台API
      const response = await axios({
        method: 'GET',
        url: config.apiEndpoint,
        headers,
        params: {
          // 可以添加额外的请求参数
          ...additionalConfig
        },
        // 设置较长的超时时间，因为某些API可能较慢
        timeout: 30000
      });

      // 根据不同平台处理响应数据
      let products: any[] = [];
      if (response.data && response.status === 200) {
        // 提取产品数据，不同平台的响应结构可能不同
        switch (config.platformType.toLowerCase()) {
          case 'taobao':
          case 'tmall':
            products = response.data.items || [];
            break;
          case 'jd':
            products = response.data.jingdong_sku_read_searchSkuList_responce?.result || [];
            break;
          case 'pdd':
            products = response.data.goods_list || [];
            break;
          case '1688':
            products = response.data.result?.toReturn || [];
            break;
          case 'kaspi':
            products = response.data.data || [];
            break;
          case 'uzum':
            products = response.data.products || response.data.items || [];
            break;
          default:
            // 尝试几种常见的响应格式
            products = response.data.products || response.data.items || response.data.data || response.data.result || [];
        }

        return {
          success: true,
          data: products,
          message: '成功获取产品数据',
          total: products.length
        };
      } else {
        return {
          success: false,
          data: [],
          message: `API请求失败: ${response.status} ${response.statusText}`,
          total: 0
        };
      }
    } catch (error: any) {
      console.error('获取电商平台产品时出错:', error);
      return {
        success: false,
        data: [],
        message: `API请求错误: ${error.message}`,
        total: 0
      };
    }
  }

  /**
   * 同步并匹配电商平台产品
   * @param configId API配置ID
   * @returns 同步结果统计
   */
  async syncAndMatchProducts(configId: number): Promise<{
    success: boolean;
    message: string;
    stats: { imported: number; matched: number; unmatched: number; total: number };
  }> {
    try {
      // 获取API配置
      const config = await this.storage.getApiConfiguration(configId);
      if (!config) {
        return { 
          success: false, 
          message: '找不到API配置', 
          stats: { imported: 0, matched: 0, unmatched: 0, total: 0 } 
        };
      }

      // 获取平台产品数据
      const { success, data: products, message } = await this.fetchProductsFromPlatform(configId);
      if (!success || !products.length) {
        return { 
          success: false, 
          message, 
          stats: { imported: 0, matched: 0, unmatched: 0, total: 0 } 
        };
      }

      // 导入和匹配统计
      let imported = 0;
      let matched = 0;
      let unmatched = 0;

      // 处理每个产品
      for (const product of products) {
        try {
          // 从API响应中提取产品数据
          const platformId = extractProductCodeFromApiItem(product, config.platformType);
          const platformCode = platformId; // 可能需要根据具体平台做额外处理
          const platformName = product.title || product.name || product.product_name || '';
          const platformCategory = product.category || product.cat_name || '';
          const price = product.price || product.sale_price || 0;
          const stock = product.stock || product.quantity || 0;
          
          // 处理产品编码以便匹配
          const matchedCode = this.storage.processProductCode(platformCode);
          
          // 查找是否已存在该平台产品
          const existingProduct = await this.storage.getEcommerceProductByPlatformId(platformId);
          
          if (existingProduct) {
            // 更新现有产品
            await this.storage.updateEcommerceProduct(existingProduct.id, {
              platformName,
              platformCategory,
              price: price.toString(),
              stock,
              matchedCode,
              lastUpdated: new Date(),
              additionalInfo: JSON.stringify(product)
            });
          } else {
            // 创建新产品记录
            const newProduct: InsertEcommerceProduct = {
              platformId,
              platformCode,
              platformName,
              platformCategory,
              price: price.toString(),
              stock,
              matchedCode,
              platformSource: config.platformType,
              additionalInfo: JSON.stringify(product)
            };
            
            await this.storage.createEcommerceProduct(newProduct);
            imported++;
          }
          
          // 尝试匹配系统内产品
          const matchedProducts = await this.storage.findProductsByMatchedCode(matchedCode);
          if (matchedProducts.length > 0) {
            // 如果找到匹配的系统产品，设置matchedProductId
            if (existingProduct) {
              await this.storage.updateEcommerceProduct(existingProduct.id, {
                matchedProductId: matchedProducts[0].id
              });
            }
            matched++;
          } else {
            unmatched++;
          }
        } catch (error) {
          console.error('处理单个产品时出错:', error);
          unmatched++;
        }
      }

      return {
        success: true,
        message: '同步和匹配完成',
        stats: { imported, matched, unmatched, total: products.length }
      };
    } catch (error: any) {
      console.error('同步和匹配产品时出错:', error);
      return {
        success: false,
        message: `同步错误: ${error.message}`,
        stats: { imported: 0, matched: 0, unmatched: 0, total: 0 }
      };
    }
  }
}