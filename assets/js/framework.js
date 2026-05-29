/**
 * huiAdmin - Layui 模块注册入口
 * 自动检测本脚本所在目录，配置模块基础路径
 */
(function () {
  var scripts = document.scripts;
  var current = scripts[scripts.length - 1];
  var rootPath = current.src.substring(0, current.src.lastIndexOf('/') + 1);
  window.huiBasePath = rootPath.replace(/assets\/js\/?$/, '');
})();

layui.config({
  base: window.huiBasePath + 'modules/',
  version: '2.0.0'
}).extend({
  'hui-util': 'hui-util',
  theme: 'theme',
  menu: 'menu',
  'hui-tab': 'hui-tab',
  admin: 'admin',
  'hui-custom': 'hui-custom'
});
