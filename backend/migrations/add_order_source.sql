-- 添加订单来源字段
ALTER TABLE orders ADD COLUMN source VARCHAR(20) NOT NULL DEFAULT 'miniprogram' COMMENT '订单来源：miniprogram小程序 / admin后台新建' AFTER remark;

-- 更新现有数据：根据customer_id判断来源
-- customer_id有值的是小程序申请，没有的是后台新建
UPDATE orders SET source = CASE
  WHEN customer_id IS NOT NULL THEN 'miniprogram'
  ELSE 'admin'
END;
