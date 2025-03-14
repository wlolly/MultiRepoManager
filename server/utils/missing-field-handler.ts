/**
 * 缺失字段处理器
 * 解决数据库与程序模型字段不一致问题
 */

import { db } from "../db";
import { eq } from "drizzle-orm";
import { outboundOrderItems, inboundOrderItems } from "../../shared/schema";

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
    const result = await db.execute(`
      SELECT 
        id, 
        outbound_order_id, 
        product_id, 
        product_name, 
        barcode, 
        external_order_number, 
        quantity, 
        package_count, 
        weight, 
        volume,
        NULL as remark
      FROM outbound_order_items 
      WHERE outbound_order_id = ?
    `, [outboundOrderId]);
    
    // 返回查询结果
    return result.rows || [];
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
    const result = await db.execute(`
      SELECT 
        id, 
        inbound_order_id, 
        product_id, 
        product_name, 
        barcode, 
        external_order_number, 
        quantity, 
        package_count, 
        weight, 
        volume,
        NULL as remark
      FROM inbound_order_items 
      WHERE inbound_order_id = ?
    `, [inboundOrderId]);
    
    // 返回查询结果
    return result.rows || [];
  }
}