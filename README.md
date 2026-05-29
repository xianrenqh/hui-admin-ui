# huiAdmin UI

基于 Layui 2.13.6 的现代化后台管理框架，零构建工具、纯前端架构。

**版本**: 2.0.0 | **许可证**: MIT | **演示**: https://xianrenqh.github.io/hui-admin-ui/

---

## 项目结构

```
hui-admin-ui/
├── assets/
│   ├── css/
│   │   ├── framework.css      # 框架主样式（含暗黑模式、响应式）
│   │   ├── common.css         # 子页面公共样式
│   │   ├── login.css          # 登录页样式
│   │   └── custom.css         # ★ 用户自定义样式（升级不覆盖）
│   ├── images/
│   │   └── logo.svg
│   └── js/
│       └── framework.js       # Layui 模块注册入口
├── config/
│   └── menu.json              # 菜单数据
├── lib/
│   └── layui/                 # Layui 2.13.6
├── modules/
│   ├── admin.js               # 核心管理模块（中央协调器）
│   ├── menu.js                # 菜单模块
│   ├── hui-tab.js             # 多标签页模块
│   ├── theme.js               # 主题管理模块
│   ├── hui-util.js            # 工具函数模块
│   └── hui-custom.js          # ★ 用户自定义扩展模块（升级不覆盖）
├── pages/
│   ├── welcome.html           # 仪表盘首页
│   ├── demo/                  # 示例页面
│   │   ├── button.html
│   │   ├── form.html
│   │   └── table.html
│   ├── system/                # 系统管理页面
│   │   ├── user.html
│   │   ├── profile.html
│   │   └── password.html
│   └── error/
│       └── 404.html
├── config.js                  # 全局配置
├── index.html                 # 主入口
├── login.html                 # 登录页
├── register.html              # 注册页
└── forgot.html                # 忘记密码页
```

标记 ★ 的文件为用户自定义文件，框架升级时不会被覆盖。

---

## 快速开始

### 启动项目

本项目为纯静态文件，可使用任意 Web 服务器运行：

```bash
# 方式一：VS Code 插件（推荐）
# 安装 "Live Server" 插件，右键 index.html → Open with Live Server

# 方式二：Node.js http-server（需安装 Node.js）
npx http-server . -p 3000 -o --cors

# 方式三：Python
python -m http.server 3000

# 方式四：Nginx / Apache / IIS
# 将整个目录部署到静态站点根目录即可
```

默认访问地址: `http://localhost:3000`

### 添加新页面

1. 在 `pages/` 目录下创建 HTML 文件
2. 在 `config/menu.json` 中添加菜单项
3. 刷新页面即可

---

## 核心模块

### config.js - 全局配置

```javascript
var HUI_CONFIG = {
  logo: { title: 'huiAdmin', image: 'assets/images/logo.svg' },
  menu: { data: 'config/menu.json', accordion: true },
  home: { id: 'home', title: '首页', url: 'pages/welcome.html' },
  tabs: { enable: true, max: 20, keepState: true },
  theme: { color: '#4f6ef7', dark: false, menuTheme: 'dark', headerTheme: 'light' },
  colors: [
    { id: '1', color: '#4f6ef7', second: '#f0f4ff' },  // 靛蓝
    { id: '2', color: '#16baaa', second: '#e8f8f5' },  // 青绿
    { id: '3', color: '#36b368', second: '#f0f9eb' },  // 翠绿
    { id: '4', color: '#f56c6c', second: '#fef0f0' },  // 珊瑚红
    { id: '5', color: '#7c5df8', second: '#f5f0ff' },  // 紫罗兰
    { id: '6', color: '#f5a623', second: '#fff8e8' },  // 琥珀
  ],
  user: { name: '管理员', avatar: '' },
  footer: { enable: false, text: 'Copyright &copy; huiAdmin' },
  loader: true,
  onLogout: function () { ... },
  onReady: function () { console.log('huiAdmin 框架已就绪'); }
};
```

### admin.js - 公共 API

```javascript
// 通过全局变量访问
huiAdmin.openTab(id, title, url, icon);  // 打开标签页
huiAdmin.closeTab(id);                    // 关闭标签页
huiAdmin.refreshTab();                    // 刷新当前标签页
huiAdmin.toggleSidebar();                 // 切换侧边栏
huiAdmin.toggleTheme();                   // 切换暗黑模式
huiAdmin.setColor(color);                 // 设置主题色
huiAdmin.goHome();                        // 回到首页
```

### theme.js - 主题管理

切换主题色时会自动计算并同步以下 CSS 变量：

| 变量 | 用途 |
|------|------|
| `--hui-primary` | 主色 |
| `--hui-primary-light` | 浅色背景 |
| `--hui-primary-hover` | 深色 hover |
| `--hui-primary-gradient` | 渐变色 |
| `--hui-primary-shadow` | 阴影色 |
| `--hui-side-active-bg` | 侧边栏激活背景 |
| `--hui-header-hover` | 头部 hover 背景 |

---

## 用户自定义扩展

框架提供两个用户自定义文件，升级时不会被覆盖：

### custom.css - 自定义样式

```css
/* 覆盖框架变量（推荐） */
:root {
  --hui-primary: #your-color;
}

/* 添加自定义类 */
.my-card {
  border-left: 3px solid var(--hui-primary);
}
```

### hui-custom.js - 自定义 JS 模块

```javascript
layui.use(['hui-custom'], function () {
  var custom = layui['hui-custom'];

  // 内置便捷方法
  custom.toast('操作成功');
  custom.success('保存成功');
  custom.error('删除失败');
  custom.warn('请注意');

  custom.confirm('确定删除？').then(function () {
    // 用户点击确定
  });

  custom.prompt('请输入名称').then(function (value) {
    console.log(value);
  });

  // 工具方法
  custom.formatDate(new Date(), 'yyyy-MM-dd');
  custom.deepClone(obj);
  custom.getUrlParam('id');
  custom.debounce(fn, 300);
  custom.throttle(fn, 200);
  custom.get('/api/data');
  custom.post('/api/save', { name: 'test' });
});
```

**扩展方式**：在 `modules/hui-custom.js` 的 `MY_CUSTOM` 对象中添加方法即可。

---

## 设置面板（右侧抽屉）

点击右上角齿轮图标打开设置面板，支持：

- **菜单主题**：暗色 / 亮色
- **头部主题**：暗色 / 亮色
- **主题色**：8 种预设颜色
- **毛玻璃深度**：关闭 / 轻度 / 标准 / 深度 / 重度
- **页脚显示**：显示 / 隐藏

所有设置自动持久化到 localStorage。

---

## 主题色系统

切换主题色时，框架自动计算并同步所有派生变量到：

- 主框架 CSS 变量
- 所有 iframe 子页面
- 侧边栏、头部、标签页、滚动条等元素

无需手动修改任何 CSS。

---

## 暗黑模式

支持全局暗黑模式，覆盖范围：

- 框架主体布局
- 所有表单元素（输入框、下拉、开关、复选框等）
- 数据表格 + 分页
- 进度条、按钮、提示
- iframe 子页面（自动广播）

---

## 响应式布局

| 视口 | 布局 |
|------|------|
| > 768px | 完整侧边栏 + 多标签页 |
| ≤ 768px | 折叠侧边栏 + 浮动菜单按钮 |

---

## 菜单配置

`config/menu.json` 结构：

```json
{
  "code": 0,
  "data": [
    {
      "id": "1",
      "title": "工作空间",
      "icon": "layui-icon layui-icon-home",
      "children": [
        {
          "id": "1-1",
          "title": "首页",
          "icon": "layui-icon layui-icon-home",
          "url": "pages/welcome.html"
        }
      ]
    }
  ]
}
```

---

## 子页面模板

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>页面标题 - huiAdmin</title>
  <link rel="stylesheet" href="../../lib/layui/css/layui.css">
  <link rel="stylesheet" href="../../assets/css/common.css">
  <link rel="stylesheet" href="../../assets/css/custom.css">
</head>
<body>
  <!-- 页面内容 -->

  <script src="../../lib/layui/layui.js"></script>
  <script>
  layui.use(['layer', 'form'], function () {
    var layer = layui.layer;
    var form = layui.form;
    // 业务逻辑
  });
  </script>
</body>
</html>
```

---

## 浏览器兼容性

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+
- IE 不支持

---

## 更新日志

### v2.0.0 (当前版本)

- 基于 Layui 2.13.6 重构
- 全新现代化 UI 设计（更大圆角、毛玻璃效果、渐变色）
- 暗黑模式全面覆盖
- 主题色动态切换（自动同步所有派生变量）
- 毛玻璃深度可调
- 多标签页状态保持（sessionStorage）
- 响应式移动端适配
- 右键菜单操作
- 设置面板（右侧抽屉）
- 用户自定义文件（custom.css / hui-custom.js）
- 登录页现代化设计
- 仪表盘入场动画
