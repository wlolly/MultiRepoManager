import React, { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import toast from "../../lib/toast";
import { ArrowLeft, Edit, Trash, BarChart, PackageOpen, Box, Truck, Clipboard } from "lucide-react";

export default function ProductDetail() {
  const { id } = useParams();
  const [_, navigate] = useLocation();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  // 获取产品数据
  const { data: product, isLoading, error } = useQuery({
    queryKey: [`/api/products/${id}`],
    enabled: !!id,
  });

  // 获取仓库数据
  const { data: warehouse } = useQuery({
    queryKey: [`/api/warehouses/${product?.warehouseId}`],
    enabled: !!product?.warehouseId,
  });

  // 获取入库记录
  const { data: inboundRecords } = useQuery({
    queryKey: [`/api/inbound-order-items?productId=${id}`],
    enabled: !!id,
  });

  // 获取出库记录
  const { data: outboundRecords } = useQuery({
    queryKey: [`/api/outbound-order-items?productId=${id}`],
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (updatedProduct: any) =>
      fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedProduct),
      }).then((res) => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/products/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsEditDialogOpen(false);
      toast.success("产品信息已成功更新");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      fetch(`/api/products/${id}`, {
        method: "DELETE",
      }).then((res) => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      navigate("/products");
      toast.success("产品已成功删除");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    // 转换数字字段
    const updatedProduct = {
      ...data,
      stock: Number(data.stock),
      price: Number(data.price),
      cost: Number(data.cost),
      singleWeightKg: Number(data.singleWeightKg),
      singleVolumeM3: Number(data.singleVolumeM3),
      singleLengthCm: Number(data.singleLengthCm),
      singleWidthCm: Number(data.singleWidthCm),
      singleHeightCm: Number(data.singleHeightCm),
      bulkWeightKg: Number(data.bulkWeightKg),
      bulkVolumeM3: Number(data.bulkVolumeM3),
      bulkLengthCm: Number(data.bulkLengthCm),
      bulkWidthCm: Number(data.bulkWidthCm),
      bulkHeightCm: Number(data.bulkHeightCm),
      bulkQuantity: Number(data.bulkQuantity || 1),
    };
    
    updateMutation.mutate(updatedProduct);
  };

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  if (isLoading) {
    return <div className="p-8 text-center">加载中...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">加载产品信息时出错</div>;
  }

  if (!product) {
    return <div className="p-8 text-center text-red-500">找不到产品</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Button variant="outline" size="icon" onClick={() => navigate("/products")} className="mr-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">{product.name}</h1>
          <Badge className="ml-3" variant={product.stock > 10 ? "default" : "destructive"}>
            库存: {product.stock}
          </Badge>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />
            编辑
          </Button>
          <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>
            <Trash className="mr-2 h-4 w-4" />
            删除
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-8">
          <Card>
            <CardHeader>
              <CardTitle>产品信息</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">条码</h3>
                  <p className="mt-1">{product.barcode}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">类别</h3>
                  <p className="mt-1">{product.category}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">批发价</h3>
                  <p className="mt-1">¥{product.price?.toFixed(2)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">代理价</h3>
                  <p className="mt-1">¥{product.cost?.toFixed(2)}</p>
                </div>
                <div className="md:col-span-2">
                  <h3 className="text-sm font-medium text-gray-500">描述</h3>
                  <p className="mt-1">{product.description || "无描述"}</p>
                </div>
              </div>

              <Separator className="my-6" />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-base font-medium mb-4">单件规格</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-500">重量</span>
                      <span>{product.singleWeightKg} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">体积</span>
                      <span>{product.singleVolumeM3} m³</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">尺寸 (长×宽×高)</span>
                      <span>{product.singleLengthCm}×{product.singleWidthCm}×{product.singleHeightCm} cm</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-base font-medium mb-4">整件包装</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-500">每包数量</span>
                      <span>{product.bulkQuantity || 1} 件</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">重量</span>
                      <span>{product.bulkWeightKg} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">体积</span>
                      <span>{product.bulkVolumeM3} m³</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">尺寸 (长×宽×高)</span>
                      <span>{product.bulkLengthCm}×{product.bulkWidthCm}×{product.bulkHeightCm} cm</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center">
                  <PackageOpen className="mr-2 h-5 w-5" />
                  入库记录
                </CardTitle>
              </CardHeader>
              <CardContent>
                {inboundRecords && inboundRecords.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>日期</TableHead>
                        <TableHead>单号</TableHead>
                        <TableHead className="text-right">数量</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inboundRecords.slice(0, 5).map((record: any) => (
                        <TableRow key={record.id}>
                          <TableCell>{new Date(record.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <a href={`/inbound-order/${record.inboundOrderId}`} className="text-blue-500 hover:underline">
                              {record.orderNumber}
                            </a>
                          </TableCell>
                          <TableCell className="text-right">{record.quantity}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center text-gray-500 py-4">暂无入库记录</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center">
                  <Truck className="mr-2 h-5 w-5" />
                  出库记录
                </CardTitle>
              </CardHeader>
              <CardContent>
                {outboundRecords && outboundRecords.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>日期</TableHead>
                        <TableHead>单号</TableHead>
                        <TableHead className="text-right">数量</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {outboundRecords.slice(0, 5).map((record: any) => (
                        <TableRow key={record.id}>
                          <TableCell>{new Date(record.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <a href={`/outbound-order/${record.outboundOrderId}`} className="text-blue-500 hover:underline">
                              {record.orderNumber}
                            </a>
                          </TableCell>
                          <TableCell className="text-right">{record.quantity}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center text-gray-500 py-4">暂无出库记录</div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="md:col-span-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>仓库信息</CardTitle>
            </CardHeader>
            <CardContent>
              {warehouse ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">仓库名称</h3>
                    <p className="mt-1">{warehouse.name}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">位置</h3>
                    <p className="mt-1">{warehouse.location}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">容量</h3>
                    <p className="mt-1">{warehouse.capacity} m³</p>
                  </div>
                  <Button variant="outline" className="w-full mt-4" onClick={() => navigate(`/warehouses/${warehouse.id}`)}>
                    查看仓库详情
                  </Button>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-4">未分配仓库</div>
              )}
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center">
                <BarChart className="mr-2 h-5 w-5" />
                库存统计
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">当前库存</span>
                  <Badge variant={product.stock > 10 ? "default" : "destructive"}>{product.stock} 件</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">总价值（代理价）</span>
                  <span>¥{(product.stock * product.cost).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">总重量</span>
                  <span>{(product.stock * product.singleWeightKg).toFixed(2)} kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">总体积</span>
                  <span>{(product.stock * product.singleVolumeM3).toFixed(2)} m³</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 编辑产品对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>编辑产品</DialogTitle>
            <DialogDescription>修改产品信息，所有字段都将被更新。</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">产品名称</Label>
                <Input id="name" name="name" defaultValue={product.name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="barcode">条码</Label>
                <Input id="barcode" name="barcode" defaultValue={product.barcode} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">类别</Label>
                <Input id="category" name="category" defaultValue={product.category} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock">库存</Label>
                <Input id="stock" name="stock" type="number" defaultValue={product.stock} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">批发价</Label>
                <Input id="price" name="price" type="number" step="0.01" defaultValue={product.price} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cost">代理价</Label>
                <Input id="cost" name="cost" type="number" step="0.01" defaultValue={product.cost} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">描述</Label>
                <Input id="description" name="description" defaultValue={product.description || ""} />
              </div>

              <Separator className="md:col-span-2 my-2" />
              <h3 className="text-base font-medium md:col-span-2">单件规格</h3>

              <div className="space-y-2">
                <Label htmlFor="singleWeightKg">重量 (kg)</Label>
                <Input id="singleWeightKg" name="singleWeightKg" type="number" step="0.01" defaultValue={product.singleWeightKg} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="singleVolumeM3">体积 (m³)</Label>
                <Input id="singleVolumeM3" name="singleVolumeM3" type="number" step="0.001" defaultValue={product.singleVolumeM3} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="singleLengthCm">长度 (cm)</Label>
                <Input id="singleLengthCm" name="singleLengthCm" type="number" step="0.1" defaultValue={product.singleLengthCm} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="singleWidthCm">宽度 (cm)</Label>
                <Input id="singleWidthCm" name="singleWidthCm" type="number" step="0.1" defaultValue={product.singleWidthCm} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="singleHeightCm">高度 (cm)</Label>
                <Input id="singleHeightCm" name="singleHeightCm" type="number" step="0.1" defaultValue={product.singleHeightCm} />
              </div>

              <Separator className="md:col-span-2 my-2" />
              <h3 className="text-base font-medium md:col-span-2">整件包装规格</h3>

              <div className="space-y-2">
                <Label htmlFor="bulkQuantity">每包数量</Label>
                <Input id="bulkQuantity" name="bulkQuantity" type="number" defaultValue={product.bulkQuantity || 1} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bulkWeightKg">重量 (kg)</Label>
                <Input id="bulkWeightKg" name="bulkWeightKg" type="number" step="0.01" defaultValue={product.bulkWeightKg} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bulkVolumeM3">体积 (m³)</Label>
                <Input id="bulkVolumeM3" name="bulkVolumeM3" type="number" step="0.001" defaultValue={product.bulkVolumeM3} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bulkLengthCm">长度 (cm)</Label>
                <Input id="bulkLengthCm" name="bulkLengthCm" type="number" step="0.1" defaultValue={product.bulkLengthCm} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bulkWidthCm">宽度 (cm)</Label>
                <Input id="bulkWidthCm" name="bulkWidthCm" type="number" step="0.1" defaultValue={product.bulkWidthCm} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bulkHeightCm">高度 (cm)</Label>
                <Input id="bulkHeightCm" name="bulkHeightCm" type="number" step="0.1" defaultValue={product.bulkHeightCm} />
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                取消
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "保存中..." : "保存更改"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>您确定要删除此产品吗？此操作无法撤销。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "删除中..." : "确认删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}