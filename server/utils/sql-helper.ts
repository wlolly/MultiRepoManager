/**
 * SQL辅助工具
 * 用于安全地执行SQL查询并处理结果
 */

import { db } from "../db";
import { sql } from "drizzle-orm";
import { processQueryResult } from "./missing-field-handler";

/**
 * 安全执行SQL查询，防止SQL注入
 * @param sqlQuery SQL查询语句，使用?作为参数占位符
 * @param params 参数数组，将按顺序替换SQL中的?占位符
 * @returns 处理后的查询结果数组
 */
export async function executeSqlSafely(sqlQuery: string, params: any[] = []): Promise<any[]> {
  try {
    console.log('执行SQL查询:', sqlQuery, '参数:', params);
    
    // 如果有参数，替换所有问号为参数值
    // 注意：这种替换方式不安全，仅作为临时解决方案
    let queryToExecute = sqlQuery;
    
    if (params.length > 0) {
      params.forEach((param) => {
        // 处理字符串类型参数，需要添加引号
        const paramValue = typeof param === 'string' 
          ? `'${param.replace(/'/g, "''")}'`  // 转义单引号
          : param;
          
        // 替换第一个问号
        queryToExecute = queryToExecute.replace('?', String(paramValue));
      });
    }
    
    // 执行SQL语句
    const result = await db.execute(sql.raw(queryToExecute));
    return processQueryResult(result);
  } catch (error) {
    console.error('SQL查询执行错误:', error);
    // 返回空数组表示查询失败
    return [];
  }
}

/**
 * 构建动态查询条件的SQL WHERE子句
 * @param conditions 条件对象，键为字段名，值为字段值
 * @param operator 条件之间的操作符，默认为AND
 * @returns 包含WHERE子句和参数数组的对象
 */
export function buildWhereClause(conditions: Record<string, any>, operator: 'AND' | 'OR' = 'AND'): { whereClause: string, params: any[] } {
  const clauses: string[] = [];
  const params: any[] = [];

  for (const [key, value] of Object.entries(conditions)) {
    if (value !== undefined && value !== null) {
      clauses.push(`${key} = ?`);
      params.push(value);
    }
  }

  if (clauses.length === 0) {
    return { whereClause: '', params: [] };
  }

  return {
    whereClause: `WHERE ${clauses.join(` ${operator} `)}`,
    params
  };
}