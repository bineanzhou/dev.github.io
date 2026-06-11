# dev-page

https://jt-519.github.io

## 目录结构

```
dev.github.io/
├── index.html                          # 首页导航
├── pages/
│   ├── chromium/
│   │   ├── benchmarks/
│   │   │   ├── webview_benchmarks.html # 升核基准工具集
│   │   │   └── webview_test_plan.html  # 升核测试方案 (P1-P4)
│   │   ├── kernel/
│   │   │   ├── kernel_test.html        # Kernel Test Suite（自动化回归）
│   │   │   ├── kernel_test_help.html   # 测试帮助文档
│   │   │   ├── kernel_changelog.html   # 版本变更记录 (M124→M141)
│   │   │   └── kernel_upgrade_diff.html# 内核差异分析
│   │   └── tests/
│   │       ├── chromium_test.html      # CSS 特性测试
│   │       ├── mse_test.html           # 浏览器扩展管理测试
│   │       └── nav_123.html            # 导航测试
│   ├── app-bridge/
│   │   ├── dev_ttdd.html               # 头条多多 JSBridge
│   │   ├── dev_risapp.html             # RisApp JSBridge
│   │   └── dev_tramp.html              # 步步盈 JSBridge
│   └── error.html                      # 网络错误页
├── assets/
│   ├── css/                            # 全局样式
│   ├── js/                             # 公共脚本
│   │   ├── kernel-test/                # Kernel Test Suite 模块
│   │   └── vendor/                     # 第三方库
│   └── images/                         # 图片资源
└── README.md
```

## Chromium 升核工具链

### 基准测试 (`pages/chromium/benchmarks/`)

| 页面 | 用途 |
|------|------|
| [webview_benchmarks.html](pages/chromium/benchmarks/webview_benchmarks.html) | Speedometer 3.0 / JetStream 2 / MotionMark / WebGL Aquarium 等基准工具集 |
| [webview_test_plan.html](pages/chromium/benchmarks/webview_test_plan.html) | 升核测试方案：P1 性能基准 → P2 兼容性 → P3 业务回归 → P4 灰度验证 |

### 内核分析 (`pages/chromium/kernel/`)

| 页面 | 用途 |
|------|------|
| [kernel_test.html](pages/chromium/kernel/kernel_test.html) | Kernel Test Suite — API 兼容性 + 性能回归自动化测试，支持 CDP 采集 |
| [kernel_upgrade_diff.html](pages/chromium/kernel/kernel_upgrade_diff.html) | 内核差异分析 — M124→M141 Breaking Changes / Security / WebView 差异速查 |
| [kernel_changelog.html](pages/chromium/kernel/kernel_changelog.html) | 版本变更记录 — 逐版本重大变更，按影响等级筛选，附官方来源 |

### 功能测试 (`pages/chromium/tests/`)

| 页面 | 用途 |
|------|------|
| [mse_test.html](pages/chromium/tests/mse_test.html) | 浏览器扩展管理测试（安装/卸载/启用/禁用） |
| [chromium_test.html](pages/chromium/tests/chromium_test.html) | CSS 特性支持测试 |
| [nav_123.html](pages/chromium/tests/nav_123.html) | 导航行为测试 |

## App JSBridge 测试 (`pages/app-bridge/`)

| 页面 | 用途 |
|------|------|
| [dev_ttdd.html](pages/app-bridge/dev_ttdd.html) | 头条多多 JSBridge |
| [dev_risapp.html](pages/app-bridge/dev_risapp.html) | RisApp JSBridge |
| [dev_tramp.html](pages/app-bridge/dev_tramp.html) | 步步盈 JSBridge |

## 交互协议

### iOS

```javascript
window.webkit.messageHandlers.<方法名>.postMessage(<数据>)
```

### Android

```javascript
window.<接口名>.<方法名>(<参数>)
```
