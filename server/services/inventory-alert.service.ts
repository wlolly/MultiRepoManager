
import { db } from '../database';
import { eq, lt, gt, or } from 'drizzle-orm';
import { products, productInventoryAlerts } from '../../shared/schema';

export class InventoryAlertService {
  async checkInventoryAlerts() {
    const alerts = await db.select()
      .from(productInventoryAlerts)
      .innerJoin(products, eq(products.id, productInventoryAlerts.productId))
      .where(
        or(
          lt(products.stock, productInventoryAlerts.minStock),
          gt(products.stock, productInventoryAlerts.maxStock)
        )
      );
      
    return alerts;
  }
}
