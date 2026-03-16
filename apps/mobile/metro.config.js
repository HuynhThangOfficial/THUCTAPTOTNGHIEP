const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Tìm thư mục gốc của dự án (TTTN2)
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Theo dõi tất cả các file trong toàn bộ Monorepo
config.watchFolders = [workspaceRoot];

// 2. Ưu tiên tìm thư viện trong node_modules của từng app, sau đó mới ra ngoài gốc
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Giúp Metro hiểu được các liên kết (symlinks) giữa các package
config.resolver.disableHierarchicalLookup = true;

module.exports = config;