# dev-page

https://jt-519.github.io

## 目录结构

```
dev.github.io/
├── index.html                          # 首页导航
├── pages/
│   ├── app-bridge/
│   │   ├── dev_ttdd.html               # 头条多多 JSBridge
│   │   ├── dev_risapp.html             # RisApp JSBridge
│   │   └── dev_tramp.html              # 步步盈 JSBridge
│   └── error.html                      # 网络错误页
├── assets/
│   ├── css/                            # 全局样式
│   ├── js/                             # 公共脚本
│   │   └── vendor/                     # 第三方库
│   └── images/                         # 图片资源
└── README.md
```

## Chromium 升核工具链

已迁移至独立站点：**https://jt-519.github.io/chromium**

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
