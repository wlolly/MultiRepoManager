/**
 * 缺失字段处理器
 * 解决数据库与程序模型字段不一致问题
 */

import { db } from "../db";
import { eq } from "drizzle-orm";
import { outboundOrderItems, inboundOrderItems } from "../../shared/schema";

/**
 * 处理SQL查询结果为数组
 * 兼容不同类型的返回结果格式
 * @param result SQL查询结果
 * @returns 处理后的数组结果
 */
export function processQueryResult(result: any): any[] {
  // 如果结果直接是数组
  if (Array.isArray(result)) {
    return result;
  }
  
  // 如果结果是对象，尝试提取rows或data属性
  if (result && typeof result === 'object') {
    if (Array.isArray(result.rows)) {
      return result.rows;
    }
    if (Array.isArray(result.data)) {
      return result.data;
    }
    // MySQL返回格式
    if (Array.isArray(result[0])) {
      return result[0];
    }
  }
  
  // 无法识别的结果格式，返回空数组
  console.warn('无法解析查询结果，返回空数组', typeof result, result);
  return [];
}

/**
 * 处理outbound_order_items表查询，如果remark字段不存在则返回null
 * @param outboundOrderId 出库单ID
 * @returns 出库单项目列表，缺失字段使用null值
 */
export async function getOutboundOrderItemsSafe(outboundOrderId: number) {
  try {
    // 尝试使用完整字段查询
    return await db
      .select()
      .from(outboundOrderItems)
      .where(eq(outboundOrderItems.outboundOrderId, outboundOrderId));
  } catch (error) {
    // 如果发生错误（很可能是字段不存在），使用兼容方式查询
    console.warn('使用兼容模式查询outbound_order_items表:', error);
    
    // 使用原始SQL查询，显式选择可能存在的字段
    const sql = `
      SELECT 
        id, 
        outbound_order_id as outboundOrderId, 
        product_id as productId, 
        product_name as productName, 
        barcode, 
        external_order_number as externalOrderNumber, 
        quantity, 
        package_count as packageCount, 
        weight, 
        volume,
        NULL as remark
      FROM outbound_order_items 
      WHERE outbound_order_id = ${outboundOrderId}
    `;
    console.log('执行SQL查询:', sql);
    const result = await db.execute(sql);
    
    // 返回查询结果，处理各种可能的返回格式
    if (Array.isArray(result)) {
      return result;
    } else if (result && typeof result === 'object') {
      if (Array.isArray(result.rows)) {
        return result.rows;
      } else if (Array.isArray(result.data)) {
        return result.data;
      }
    }
    
    // 如果无法确定格式，返回空数组
    console.warn('无法解析查询结果，返回空数组');
    return [];
  }
}

/**
 * 处理inbound_order_items表查询，如果字段不存在则返回null
 * @param inboundOrderId 入库单ID
 * @returns 入库单项目列表，缺失字段使用null值
 */
export async function getInboundOrderItemsSafe(inboundOrderId: number) {
  try {
    // 尝试使用完整字段查询
    return await db
      .select()
      .from(inboundOrderItems)
      .where(eq(inboundOrderItems.inboundOrderId, inboundOrderId));
  } catch (error) {
    // 如果发生错误（很可能是字段不存在），使用兼容方式查询
    console.warn('使用兼容模式查询inbound_order_items表:', error);
    
    // 使用原始SQL查询，显式选择可能存在的字段
    const sql = `
      SELECT 
        id, 
        inbound_order_id as inboundOrderId, 
        product_id as productId, 
        product_name as productName, 
        barcode, 
        external_order_number as externalOrderNumber, 
        quantity, 
        package_count as packageCount, 
        weight, 
        volume,
        NULL as remark
      FROM inbound_order_items 
      WHERE inbound_order_id = ${inboundOrderId}
    `;
    console.log('执行SQL查询:', sql);
    const result = await db.execute(sql);
    
    // 返回查询结果，处理各种可能的返回格式
    if (Array.isArray(result)) {
      return result;
    } else if (result && typeof result === 'object') {
      if (Array.isArray(result.rows)) {
        return result.rows;
      } else if (Array.isArray(result.data)) {
        return result.data;
      }
    }
    
    // 如果无法确定格式，返回空数组
    console.warn('无法解析查询结果，返回空数组');
    return [];
  }
}