import { products } from "@/lib/data/products";

export interface InventoryRow {
  id: string;
  name: string;
  universe: string;
  category: string;
  sku: string | null;
  image?: string;
  artIcon: string;
  stock: number;
  price: number;
  status: "healthy" | "low" | "out";
  updatedAt?: string;
}

/**
 * Pure formatter — takes whatever product list the caller passes in
 * (in practice, the live Supabase-backed catalog from useCatalog()) and
 * derives display-ready inventory rows + a stock status. It does not
 * hold or generate any data of its own.
 */
export function getInventory(productList: typeof products = products): InventoryRow[] {
  return productList.map((p) => {
    const threshold = p.lowStockThreshold ?? 10;
    return {
      id: p.id,
      name: p.name,
      universe: p.universe,
      category: p.category,
      sku: p.sku ?? null,
      image: p.image,
      artIcon: p.artIcon,
      stock: p.stock,
      price: p.price,
      status: p.stock === 0 ? "out" : p.stock <= threshold ? "low" : "healthy",
      updatedAt: p.updatedAt,
    };
  });
}

export interface InventoryMetrics {
  totalUnits: number;
  inventoryValue: number;
  lowStockCount: number;
  outOfStockCount: number;
}

/** Dashboard summary stats — derived from the same real rows as the table. */
export function computeInventoryMetrics(rows: InventoryRow[]): InventoryMetrics {
  return rows.reduce(
    (acc, row) => ({
      totalUnits: acc.totalUnits + row.stock,
      inventoryValue: acc.inventoryValue + row.stock * row.price,
      lowStockCount: acc.lowStockCount + (row.status === "low" ? 1 : 0),
      outOfStockCount: acc.outOfStockCount + (row.status === "out" ? 1 : 0),
    }),
    { totalUnits: 0, inventoryValue: 0, lowStockCount: 0, outOfStockCount: 0 }
  );
}
