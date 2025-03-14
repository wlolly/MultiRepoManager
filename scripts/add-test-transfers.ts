/**
 * 添加测试仓库调拨单数据脚本
 * 用于创建演示用的仓库调拨单及其明细项
 */
import { db } from '../server/db';
import { eq } from 'drizzle-orm';
import { 
  warehouseTransfers, 
  warehouseTransferItems, 
  products, 
  warehouses, 
  users 
} from '../shared/schema';
import { format } from 'date-fns';

async function main() {
  console.log('开始添加测试仓库调拨单数据...');
  
  try {
    // 检查是否存在测试用户，如果不存在则创建
    let userId = 1;
    const existingUsers = await db.select().from(users).limit(1);
    
    if (existingUsers.length === 0) {
      console.log('创建测试用户...');
      const insertedUsers = await db.insert(users).values({
        username: 'testuser',
        password: 'password',
        fullName: '测试用户',
        avatarUrl: null,
        createdAt: new Date()
      }).returning({ id: users.id });
      
      userId = insertedUsers[0].id;
    }
    
    // 检查是否存在测试仓库，如果不存在则创建
    const existingWarehouses = await db.select().from(warehouses).limit(1);
    
    if (existingWarehouses.length === 0) {
      console.log('创建测试仓库...');
      await db.insert(warehouses).values([
        {
          name: '上海主仓库',
          location: '上海市浦东新区',
          capacity: '5000'
        },
        {
          name: '北京仓库',
          location: '北京市朝阳区',
          capacity: '3000'
        },
        {
          name: '广州仓库',
          location: '广州市天河区',
          capacity: '2500'
        },
        {
          name: '成都仓库',
          location: '成都市武侯区',
          capacity: '2000'
        },
        {
          name: '西安仓库',
          location: '西安市雁塔区',
          capacity: '1500'
        }
      ]);
    }
    
    // 检查是否存在测试产品，如果不存在则创建
    const existingProducts = await db.select().from(products).limit(1);
    
    if (existingProducts.length === 0) {
      console.log('创建测试产品...');
      await db.insert(products).values([
        {
          name: '普通测试产品',
          description: '这是一个普通测试产品',
          category: '测试类别',
          barcode: '6901234567890',
          uniqueCode: null,
          stock: 100,
          price: '199.99',
          cost: '99.99',
          singleLengthCm: '30',
          singleWidthCm: '20',
          singleHeightCm: '10',
          singleWeightKg: '1.5',
          singleVolumeM3: '0.006',
          bulkQuantity: 10,
          bulkLengthCm: '60',
          bulkWidthCm: '40',
          bulkHeightCm: '30',
          bulkWeightKg: '15.5',
          bulkVolumeM3: '0.072',
          warehouseId: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: '高级测试产品',
          description: '这是一个高级测试产品',
          category: '高级类别',
          barcode: '6901234567891',
          uniqueCode: 'TEST0001',
          stock: 50,
          price: '599.99',
          cost: '299.99',
          singleLengthCm: '50',
          singleWidthCm: '30',
          singleHeightCm: '20',
          singleWeightKg: '3.0',
          singleVolumeM3: '0.03',
          bulkQuantity: 5,
          bulkLengthCm: '100',
          bulkWidthCm: '60',
          bulkHeightCm: '40',
          bulkWeightKg: '15.0',
          bulkVolumeM3: '0.24',
          warehouseId: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: '小型测试产品',
          description: '这是一个小型测试产品',
          category: '小型类别',
          barcode: '6901234567892',
          uniqueCode: null,
          stock: 200,
          price: '99.99',
          cost: '49.99',
          singleLengthCm: '15',
          singleWidthCm: '10',
          singleHeightCm: '5',
          singleWeightKg: '0.5',
          singleVolumeM3: '0.00075',
          bulkQuantity: 20,
          bulkLengthCm: '40',
          bulkWidthCm: '30',
          bulkHeightCm: '20',
          bulkWeightKg: '10.0',
          bulkVolumeM3: '0.024',
          warehouseId: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: '重型测试产品',
          description: '这是一个重型测试产品',
          category: '重型类别',
          barcode: '6901234567893',
          uniqueCode: null,
          stock: 30,
          price: '999.99',
          cost: '499.99',
          singleLengthCm: '80',
          singleWidthCm: '60',
          singleHeightCm: '40',
          singleWeightKg: '8.0',
          singleVolumeM3: '0.192',
          bulkQuantity: 2,
          bulkLengthCm: '160',
          bulkWidthCm: '120',
          bulkHeightCm: '80',
          bulkWeightKg: '17.0',
          bulkVolumeM3: '1.536',
          warehouseId: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: '特殊测试产品',
          description: '这是一个特殊测试产品',
          category: '特殊类别',
          barcode: '6901234567894',
          uniqueCode: 'SPECIAL001',
          stock: 5,
          price: '1999.99',
          cost: '999.99',
          singleLengthCm: '25',
          singleWidthCm: '25',
          singleHeightCm: '25',
          singleWeightKg: '5.0',
          singleVolumeM3: '0.015625',
          bulkQuantity: 1,
          bulkLengthCm: '30',
          bulkWidthCm: '30',
          bulkHeightCm: '30',
          bulkWeightKg: '5.0',
          bulkVolumeM3: '0.027',
          warehouseId: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]);
    }
    
    // 强制创建测试调拨单数据（无论是否已存在）
    // 先清空调拨单明细表和调拨单表
    console.log('清空现有调拨单数据...');
    await db.delete(warehouseTransferItems);
    await db.delete(warehouseTransfers);
    console.log('开始创建新的测试调拨单数据...');
    
    // 生成测试调拨单 1 - 已完成状态
    await db.insert(warehouseTransfers).values({
      referenceNumber: 'TRF-SH-20250310-0001',
      sourceWarehouseId: 1, // 上海主仓库
      targetWarehouseId: 2, // 北京仓库
      status: 'completed',
      totalItems: 3,
      totalPackages: 10,
      totalWeight: '125.5',
      totalVolume: '0.75',
      createdAt: new Date('2025-03-10T09:30:00'),
      createdBy: 1,
      outboundOrderId: null,
      inboundOrderId: null,
      notes: '第一个测试调拨单，已完成状态',
      documentUrl: null,
      documentUploadedAt: null
    });
    
    // 获取刚插入的调拨单ID
    const [transfer1] = await db.select({ id: warehouseTransfers.id })
      .from(warehouseTransfers)
      .where(eq(warehouseTransfers.referenceNumber, 'TRF-SH-20250310-0001'));
    
    // 为调拨单1添加明细项 (数据库中不存在status字段，所以不再添加)
    await db.insert(warehouseTransferItems).values([
      {
        transferId: transfer1.id,
        productId: 1,
        quantity: 5,
        packageCount: 5,
        weight: '75.5',
        volume: '0.5',
        uniqueCode: null,
        remark: '普通测试产品'
      },
      {
        transferId: transfer1.id,
        productId: 2,
        quantity: 2,
        packageCount: 2,
        weight: '30.0',
        volume: '0.15',
        uniqueCode: 'TEST0001',
        remark: '带唯一码的测试产品'
      },
      {
        transferId: transfer1.id,
        productId: 3,
        quantity: 3,
        packageCount: 3,
        weight: '20.0',
        volume: '0.1',
        uniqueCode: null,
        remark: null
      }
    ]);
    
    // 生成测试调拨单 2 - 处理中状态
    await db.insert(warehouseTransfers).values({
      referenceNumber: 'TRF-BJ-20250312-0001',
      sourceWarehouseId: 2, // 北京仓库
      targetWarehouseId: 3, // 广州仓库
      status: 'processing',
      totalItems: 2,
      totalPackages: 8,
      totalWeight: '85.2',
      totalVolume: '0.42',
      createdAt: new Date('2025-03-12T11:15:00'),
      createdBy: 1,
      outboundOrderId: null,
      inboundOrderId: null,
      notes: '从北京到广州的调拨单，处理中状态',
      documentUrl: null,
      documentUploadedAt: null
    });
    
    // 获取刚插入的调拨单ID
    const [transfer2] = await db.select({ id: warehouseTransfers.id })
      .from(warehouseTransfers)
      .where(eq(warehouseTransfers.referenceNumber, 'TRF-BJ-20250312-0001'));
    
    // 为调拨单2添加明细项 (数据库中不存在status字段，所以不再添加)
    await db.insert(warehouseTransferItems).values([
      {
        transferId: transfer2.id,
        productId: 1,
        quantity: 3,
        packageCount: 3,
        weight: '45.3',
        volume: '0.25',
        uniqueCode: null,
        remark: '部分调拨到广州'
      },
      {
        transferId: transfer2.id,
        productId: 4,
        quantity: 5,
        packageCount: 5,
        weight: '39.9',
        volume: '0.17',
        uniqueCode: null,
        remark: '需要特殊保管'
      }
    ]);
    
    // 生成测试调拨单 3 - 待处理状态
    await db.insert(warehouseTransfers).values({
      referenceNumber: 'TRF-GZ-20250314-0001',
      sourceWarehouseId: 3, // 广州仓库
      targetWarehouseId: 1, // 上海主仓库
      status: 'pending',
      totalItems: 1,
      totalPackages: 3,
      totalWeight: '15.0',
      totalVolume: '0.09',
      createdAt: new Date('2025-03-14T14:20:00'),
      createdBy: 1,
      outboundOrderId: null,
      inboundOrderId: null,
      notes: '退回上海主仓库，待处理状态',
      documentUrl: null,
      documentUploadedAt: null
    });
    
    // 获取刚插入的调拨单ID
    const [transfer3] = await db.select({ id: warehouseTransfers.id })
      .from(warehouseTransfers)
      .where(eq(warehouseTransfers.referenceNumber, 'TRF-GZ-20250314-0001'));
    
    // 为调拨单3添加明细项 (数据库中不存在status字段，所以不再添加)
    await db.insert(warehouseTransferItems).values([
      {
        transferId: transfer3.id,
        productId: 5,
        quantity: 3,
        packageCount: 3,
        weight: '15.0',
        volume: '0.09',
        uniqueCode: null,
        remark: '产品质量问题，退回检查'
      }
    ]);
    
    console.log('测试仓库调拨单数据已添加完成！');
    console.log('- 添加了3个测试调拨单');
    console.log('- 添加了6个调拨单明细项');
    console.log('调拨单编号：');
    console.log('- TRF-SH-20250310-0001 (已完成状态)');
    console.log('- TRF-BJ-20250312-0001 (处理中状态)');
    console.log('- TRF-GZ-20250314-0001 (待处理状态)');
    
  } catch (error) {
    console.error('添加测试数据时出错:', error);
  }
}

// 执行主函数
main().then(() => {
  console.log('脚本执行完毕');
  process.exit(0);
}).catch((error) => {
  console.error('脚本执行失败:', error);
  process.exit(1);
});