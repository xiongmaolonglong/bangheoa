-- 添加 province_id 和 district_id 字段到 orders 表
ALTER TABLE orders ADD COLUMN IF NOT EXISTS province_id INT NULL COMMENT '省份ID' AFTER group_id;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS district_id INT NULL COMMENT '区域ID' AFTER province_id;
