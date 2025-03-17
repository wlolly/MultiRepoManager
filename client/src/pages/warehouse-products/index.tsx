
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';

export default function WarehouseProducts() {
  const navigate = useNavigate();
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['warehouse-products'],
    queryFn: () => fetch('/api/products').then(res => res.json())
  });

  if (isLoading) {
    return <div>加载中...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">仓库商品</h1>
        <Button onClick={() => navigate('/products/new')}>新建商品</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>商品名称</TableHead>
            <TableHead>编码</TableHead>
            <TableHead>库存</TableHead>
            <TableHead>单价</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id}>
              <TableCell>{product.name}</TableCell>
              <TableCell>{product.barcode}</TableCell>
              <TableCell>{product.stock}</TableCell>
              <TableCell>{product.price}</TableCell>
              <TableCell>
                <Button variant="outline" onClick={() => navigate(`/products/${product.id}`)}>
                  查看
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
