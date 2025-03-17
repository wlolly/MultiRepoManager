
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

export default function NewProduct() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { register, handleSubmit } = useForm();

  const onSubmit = async (data) => {
    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast({
          title: "创建成功",
          description: "商品已成功创建"
        });
        navigate('/warehouse-products');
      }
    } catch (error) {
      toast({
        title: "创建失败",
        description: "请检查输入并重试",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">新建商品</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-2xl">
        <div>
          <label>商品名称</label>
          <Input {...register('name')} required />
        </div>
        <div>
          <label>商品编码</label>
          <Input {...register('barcode')} required />
        </div>
        <div>
          <label>商品描述</label>
          <Input {...register('description')} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label>单价</label>
            <Input type="number" step="0.01" {...register('price')} required />
          </div>
          <div>
            <label>成本</label>
            <Input type="number" step="0.01" {...register('cost')} required />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label>长度(cm)</label>
            <Input type="number" step="0.1" {...register('singleLengthCm')} required />
          </div>
          <div>
            <label>宽度(cm)</label>
            <Input type="number" step="0.1" {...register('singleWidthCm')} required />
          </div>
          <div>
            <label>高度(cm)</label>
            <Input type="number" step="0.1" {...register('singleHeightCm')} required />
          </div>
        </div>
        <div>
          <label>重量(kg)</label>
          <Input type="number" step="0.001" {...register('singleWeightKg')} required />
        </div>
        <Button type="submit">创建商品</Button>
      </form>
    </div>
  );
}
