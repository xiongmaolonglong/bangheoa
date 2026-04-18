#!/bin/bash
# ============================================
# 广告工程全流程管理系统 - 服务器一键部署脚本
# ============================================
# 使用方法: bash server-setup.sh
# 适用系统: Ubuntu 20.04 / 22.04 / 24.04
# ============================================

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}广告工程全流程管理系统 - 服务器部署${NC}"
echo -e "${GREEN}============================================${NC}"

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then
  echo -e "${YELLOW}请使用 root 用户或 sudo 执行此脚本${NC}"
  exit 1
fi

# ============================================
# 第一步: 更新系统
# ============================================
echo -e "\n${GREEN}[1/8] 更新系统...${NC}"
apt update && apt upgrade -y

# ============================================
# 第二步: 安装基础工具
# ============================================
echo -e "\n${GREEN}[2/8] 安装基础工具...${NC}"
apt install -y curl wget git unzip software-properties-common

# ============================================
# 第三步: 安装 Node.js 20
# ============================================
echo -e "\n${GREEN}[3/8] 安装 Node.js 20...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi
echo "Node.js 版本: $(node -v)"
echo "npm 版本: $(npm -v)"

# 安装 PM2
npm install -g pm2

# ============================================
# 第四步: 安装 MySQL 8.0
# ============================================
echo -e "\n${GREEN}[4/8] 安装 MySQL 8.0...${NC}"
if ! command -v mysql &> /dev/null; then
    echo -e "${YELLOW}MySQL 安装过程中会要求设置 root 密码，建议设为空（直接回车）${NC}"
    apt install -y mysql-server
    systemctl enable mysql
    systemctl start mysql
fi
echo "MySQL 版本: $(mysql --version)"

# ============================================
# 第五步: 安装 Nginx
# ============================================
echo -e "\n${GREEN}[5/8] 安装 Nginx...${NC}"
if ! command -v nginx &> /dev/null; then
    apt install -y nginx
    systemctl enable nginx
    systemctl start nginx
fi
echo "Nginx 版本: $(nginx -v 2>&1)"

# ============================================
# 第六步: 创建目录和克隆代码
# ============================================
echo -e "\n${GREEN}[6/8] 克隆项目代码...${NC}"

PROJECT_DIR="/var/www/ad-workflow"

if [ -d "$PROJECT_DIR" ]; then
    echo -e "${YELLOW}项目目录已存在，跳过克隆${NC}"
else
    mkdir -p /var/www
    cd /var/www
    git clone https://github.com/xiongmaolonglong/bangheoa.git ad-workflow
fi

cd $PROJECT_DIR

# ============================================
# 第七步: 配置数据库
# ============================================
echo -e "\n${GREEN}[7/8] 配置数据库...${NC}"

# 创建数据库
mysql -u root -e "CREATE DATABASE IF NOT EXISTS ad_workflow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 创建日志目录
mkdir -p /var/log/ad-workflow
mkdir -p $PROJECT_DIR/backend/uploads

# ============================================
# 第八步: 安装依赖和构建
# ============================================
echo -e "\n${GREEN}[8/8] 安装依赖和构建...${NC}"

# 后端
cd $PROJECT_DIR/backend
npm install

# 前端
cd $PROJECT_DIR/admin-web
npm install
npm run build

# ============================================
# 配置 Nginx
# ============================================
echo -e "\n${GREEN}配置 Nginx...${NC}"
cp $PROJECT_DIR/docs/nginx.conf /etc/nginx/sites-available/ad-workflow
ln -sf /etc/nginx/sites-available/ad-workflow /etc/nginx/sites-enabled/ad-workflow
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# ============================================
# 启动后端服务
# ============================================
echo -e "\n${GREEN}启动后端服务...${NC}"
cd $PROJECT_DIR/backend
pm2 delete all 2>/dev/null || true
pm2 start ecosystem.production.js --env production
pm2 save
pm2 startup

# ============================================
# 完成
# ============================================
echo -e "\n${GREEN}============================================${NC}"
echo -e "${GREEN}部署完成！${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "访问地址: ${YELLOW}http://服务器IP${NC}"
echo -e "演示账号: ${YELLOW}13800000001 / 123456${NC}"
echo ""
echo -e "常用命令:"
echo "  查看后端状态: pm2 status"
echo "  查看后端日志: pm2 logs backend"
echo "  重启后端:     pm2 restart backend"
echo ""
echo -e "${YELLOW}注意: 请修改 /etc/nginx/sites-available/ad-workflow 中的 server_name 为你的域名或IP${NC}"
