/**
 * 唯一码跟踪功能测试脚本
 * 
 * 这个脚本测试以下功能:
 * 1. 注册新的唯一码（入库）
 * 2. 查询唯一码跟踪记录
 * 3. 调拨唯一码（从一个仓库转移到另一个仓库）
 * 4. 出库唯一码
 * 5. 查询唯一码历史记录
 */

import { storage } from '../server/storage';

async function main() {
  console.log("开始测试唯一码跟踪功能");
  
  // 测试数据
  const uniqueCode = "TEST" + Date.now().toString();
  const productId = 1;
  const sourceWarehouseId = 1;
  const targetWarehouseId = 2;
  const userId = 1;
  const inboundOrderId = 1;
  const inboundItemId = 1;
  const outboundOrderId = 1;
  const outboundItemId = 1;
  const transferId = 1;
  const transferItemId = 1;
  
  try {
    // 1. 测试注册新的唯一码（入库）
    console.log("\n1. 测试注册新的唯一码（入库）");
    const tracking = await storage.registerUniqueCodeInbound(
      uniqueCode,
      productId,
      sourceWarehouseId,
      inboundOrderId,
      inboundItemId,
      userId
    );
    console.log("唯一码注册结果:", tracking);
    
    // 2. 测试查询唯一码跟踪记录
    console.log("\n2. 测试查询唯一码跟踪记录");
    const trackingRecord = await storage.getUniqueCodeTracking(uniqueCode);
    console.log("唯一码跟踪记录:", trackingRecord);
    
    // 3. 测试唯一码调拨
    console.log("\n3. 测试唯一码调拨");
    const transferredTracking = await storage.registerUniqueCodeTransfer(
      uniqueCode,
      sourceWarehouseId,
      targetWarehouseId,
      transferId,
      transferItemId,
      userId
    );
    console.log("唯一码调拨结果:", transferredTracking);
    
    // 4. 测试唯一码出库
    console.log("\n4. 测试唯一码出库");
    const outboundTracking = await storage.registerUniqueCodeOutbound(
      uniqueCode,
      outboundOrderId,
      outboundItemId,
      userId
    );
    console.log("唯一码出库结果:", outboundTracking);
    
    // 5. 测试查询唯一码历史记录
    console.log("\n5. 测试查询唯一码历史记录");
    const history = await storage.getUniqueCodeHistory(uniqueCode);
    console.log("唯一码历史记录:", history);
    
    // 6. 测试生成唯一码报告
    console.log("\n6. 测试生成唯一码报告");
    const report = await storage.generateUniqueCodeReport({ 
      productId,
      startDate: new Date(new Date().getTime() - 24 * 60 * 60 * 1000) // 过去24小时
    });
    console.log("唯一码报告:", report);
    
    // 7. 测试验证唯一码可用性
    console.log("\n7. 测试验证唯一码可用性");
    const isAvailable = await storage.verifyUniqueCodeAvailable(uniqueCode, targetWarehouseId);
    console.log("唯一码在目标仓库可用:", isAvailable);
    
    console.log("\n所有测试已完成！");
    
  } catch (error) {
    console.error("测试过程中出现错误:", error);
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => process.exit(0));