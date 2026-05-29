/**
 * huiAdmin 默认配置
 * 直接修改此文件即可自定义框架行为
 */
var HUI_CONFIG = {
  // Logo 配置
  logo: {
    title: 'huiAdmin',
    image: 'assets/images/logo.svg'
  },

  // 菜单配置
  menu: {
    data: 'config/menu.json',     // 菜单数据源 URL，或直接传数组
    method: 'GET',                 // 加载方式
    accordion: true,               // 手风琴模式
    defaultSelect: 'home'          // 默认选中页
  },

  // 首页标签
  home: {
    id: 'home',
    title: '首页',
    url: 'pages/welcome.html'
  },

  // 标签页配置
  tabs: {
    enable: true,                  // 是否启用多标签
    max: 20,                       // 最大标签数
    keepState: true                // 是否保持状态（sessionStorage）
  },

  // 主题配置
  theme: {
    color: '#4f6ef7',              // 默认主题色 - 更现代的蓝色
    dark: false,                   // 默认暗黑模式
    menuTheme: 'dark',             // 菜单主题 dark|light
    headerTheme: 'light'           // 头部主题 dark|light
  },

  // 主题色预设 - 更现代的配色方案
  colors: [
    { id: '1', color: '#4f6ef7', second: '#f0f4ff' },  // 靛蓝色
    { id: '2', color: '#16baaa', second: '#e8f8f5' },  // 青绿色
    { id: '3', color: '#36b368', second: '#f0f9eb' },  // 翠绿色
    { id: '4', color: '#f56c6c', second: '#fef0f0' },  // 珊瑚红
    { id: '5', color: '#7c5df8', second: '#f5f0ff' },  // 紫罗兰
    { id: '6', color: '#f5a623', second: '#fff8e8' }   // 琥珀色
  ],

  // 用户信息
  user: {
    name: '管理员',
    avatar: ''                     // 头像 URL，留空则显示首字母
  },

  // 页脚
  footer: {
    enable: false,
    text: 'Copyright &copy; huiAdmin'
  },

  // 其他
  loader: true,                    // 是否显示加载动画
  loaderTime: 1200,                // 加载动画持续时间(ms)

  // 回调
  onLogout: function () {
    if (confirm('确定要退出登录吗？')) {
      location.href = 'login.html';
    }
  },

  onReady: function () {
    console.log('huiAdmin 框架已就绪');
  }
};
