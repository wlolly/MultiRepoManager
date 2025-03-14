import { db } from "../server/db";
import { products } from "../shared/schema";

async function addTestProducts() {
  try {
    console.log("开始添加测试产品数据...");
    
    // 添加测试产品1
    await db.insert(products).values({
      name: "测试产品A01",
      description: "这是一个测试产品描述",
      barcode: "BAR001",
      uniqueCode: "A01",
      category: "电子产品",
      stock: 100,
      price: 199.99,
      cost: 150.00,
      singleLengthCm: 10,
      singleWidthCm: 5,
      singleHeightCm: 2,
      singleVolumeM3: 0.1,
      singleWeightKg: 0.5,
      bulkQuantity: 10,
      bulkLengthCm: 30,
      bulkWidthCm: 20,
      bulkHeightCm: 15,
      bulkVolumeM3: 1.0,
      bulkWeightKg: 5.5,
      warehouseId: 1
    });
    
    // 添加测试产品2
    await db.insert(products).values({
      name: "测试产品B02",
      description: "高品质测试商品",
      barcode: "BAR002",
      uniqueCode: "B02",
      category: "家居用品",
      stock: 50,
      price: 299.99,
      cost: 220.00,
      singleLengthCm: 20,
      singleWidthCm: 10,
      singleHeightCm: 5,
      singleVolumeM3: 0.2,
      singleWeightKg: 1.0,
      bulkQuantity: 5,
      bulkLengthCm: 40,
      bulkWidthCm: 30,
      bulkHeightCm: 20,
      bulkVolumeM3: 1.5,
      bulkWeightKg: 6.0,
      warehouseId: 2
    });
    
    // 添加测试产品3
    await db.insert(products).values({
      name: "华为手机",
      description: "智能手机",
      barcode: "BAR003",
      uniqueCode: "C03",
      category: "电子产品",
      stock: 30,
      price: 3999.99,
      cost: 3000.00,
      singleLengthCm: 15,
      singleWidthCm: 7,
      singleHeightCm: 1,
      singleVolumeM3: 0.105,
      singleWeightKg: 0.2,
      bulkQuantity: 10,
      bulkLengthCm: 30,
      bulkWidthCm: 20,
      bulkHeightCm: 10,
      bulkVolumeM3: 0.6,
      bulkWeightKg: 2.5,
      warehouseId: 1
    });
    
    console.log("测试产品数据添加成功!");
  } catch (error) {
    console.error("添加测试产品数据失败:", error);
  } finally {
    process.exit(0);
  }
}

addTestProducts();