-- 修改 design_drawings 表的 file_url 字段为 TEXT 类型，支持存储 base64 图片
ALTER TABLE design_drawings MODIFY COLUMN file_url LONGTEXT NOT NULL COMMENT '文件URL或Base64';