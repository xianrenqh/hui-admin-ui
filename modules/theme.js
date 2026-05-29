/**
 * huiAdmin - 主题管理模块
 * 负责主题颜色切换、暗黑模式切换，以及向 iframe 广播主题变更
 */
layui.define(['hui-util'], function (exports) {
  'use strict';

  var $ = layui.$;
  var util = layui['hui-util'];

  /**
   * 将 hex 颜色转为 r,g,b 数组
   * @param {string} hex
   * @returns {number[]}
   */
  function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    return [
      parseInt(hex.substring(0, 2), 16),
      parseInt(hex.substring(2, 4), 16),
      parseInt(hex.substring(4, 6), 16)
    ];
  }

  /**
   * 将 hex 转为 rgba 字符串
   */
  function hexToRgba(hex, alpha) {
    var rgb = hexToRgb(hex);
    return 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + alpha + ')';
  }

  /**
   * 生成深色变体（加深约 15%）
   */
  function darken(hex, amount) {
    var rgb = hexToRgb(hex);
    var r = Math.max(0, Math.round(rgb[0] * (1 - (amount || 0.15))));
    var g = Math.max(0, Math.round(rgb[1] * (1 - (amount || 0.15))));
    var b = Math.max(0, Math.round(rgb[2] * (1 - (amount || 0.15))));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  /**
   * 生成浅色变体（变浅约 90%）
   */
  function lighten(hex, amount) {
    var rgb = hexToRgb(hex);
    var r = Math.min(255, Math.round(rgb[0] + (255 - rgb[0]) * (amount || 0.9)));
    var g = Math.min(255, Math.round(rgb[1] + (255 - rgb[1]) * (amount || 0.9)));
    var b = Math.min(255, Math.round(rgb[2] + (255 - rgb[2]) * (amount || 0.9)));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  /**
   * 根据主色生成渐变终止色（色相偏移约 30 度）
   */
  function gradientEnd(hex) {
    var rgb = hexToRgb(hex);
    // 简单的色相偏移：交换通道并调整
    var r = Math.min(255, Math.round(rgb[0] * 0.5 + rgb[2] * 0.5));
    var g = Math.min(255, Math.round(rgb[1] * 0.6 + rgb[0] * 0.2));
    var b = Math.min(255, Math.round(rgb[2] * 0.7 + rgb[1] * 0.3));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  /**
   * @namespace theme
   */
  var theme = {
    // 默认主题色
    _color: '#4f6ef7',
    // 默认是否为暗黑模式
    _dark: false,

    // ==================== 颜色管理 ====================

    /**
     * 设置主题色，并同步所有派生 CSS 变量
     * @param {string} color - CSS 颜色值，如 '#4f6ef7'
     * @param {string} [lightColor] - 可选的浅色变体（配置中的 second）
     */
    setColor: function (color, lightColor) {
      this._color = color;
      var root = document.documentElement;

      // 1. 主色
      root.style.setProperty('--hui-primary', color);

      // 2. 浅色变体（用于背景高亮）
      var primaryLight = lightColor || lighten(color, 0.9);
      root.style.setProperty('--hui-primary-light', primaryLight);

      // 3. 深色变体（用于 hover）
      root.style.setProperty('--hui-primary-hover', darken(color, 0.15));

      // 4. 渐变色
      var gradEnd = gradientEnd(color);
      root.style.setProperty('--hui-primary-gradient', 'linear-gradient(135deg, ' + color + ' 0%, ' + gradEnd + ' 100%)');

      // 5. 侧边栏激活背景
      root.style.setProperty('--hui-side-active-bg', hexToRgba(color, 0.2));

      // 6. 头部 hover 背景
      root.style.setProperty('--hui-header-hover', hexToRgba(color, 0.06));

      // 7. 阴影色
      root.style.setProperty('--hui-primary-shadow', hexToRgba(color, 0.3));
      root.style.setProperty('--hui-primary-shadow-sm', hexToRgba(color, 0.15));
      root.style.setProperty('--hui-primary-shadow-lg', hexToRgba(color, 0.4));

      // 7. 持久化
      util.setStore('theme_color', color);

      // 8. 广播到所有 iframe
      this._broadcast('setColor', color);
    },

    /**
     * 获取当前主题色
     * @returns {string} CSS 颜色值
     */
    getColor: function () {
      return util.getStore('theme_color') || '#4f6ef7';
    },

    // ==================== 暗黑模式 ====================

    /**
     * 切换暗黑模式（暗黑 ↔ 明亮）
     */
    toggleDark: function () {
      var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      this.setDark(!isDark);
    },

    /**
     * 设置暗黑模式状态
     * @param {boolean} dark - true 为暗黑模式，false 为明亮模式
     */
    setDark: function (dark) {
      this._dark = dark;
      if (dark) {
        document.documentElement.setAttribute('data-theme', 'dark');
        util.setStore('theme_dark', '1');
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
        util.setStore('theme_dark', '0');
      }
      // 暗黑模式切换后重新应用主题色（确保派生变量正确）
      var savedColor = util.getStore('theme_color');
      if (savedColor) {
        this.setColor(savedColor);
      }
      // 广播到所有 iframe
      this._broadcast('setDark', dark);
    },

    /**
     * 获取暗黑模式状态
     * @returns {boolean}
     */
    isDark: function () {
      return document.documentElement.getAttribute('data-theme') === 'dark';
    },

    // ==================== iframe 广播 ====================

    /**
     * 向所有 iframe 广播主题变更
     * @private
     * @param {string} method - 'setColor' 或 'setDark'
     * @param {*} value - 对应的值
     */
    _broadcast: function (method, value) {
      var self = this;
      try {
        var iframes = document.querySelectorAll('iframe');
        for (var i = 0; i < iframes.length; i++) {
          try {
            var win = iframes[i].contentWindow;
            if (win && win.document) {
              if (method === 'setColor') {
                // 同步所有派生变量到 iframe
                var root = win.document.documentElement;
                var primaryLight = lighten(value, 0.9);
                root.style.setProperty('--hui-primary', value);
                root.style.setProperty('--hui-primary-light', primaryLight);
                root.style.setProperty('--hui-primary-hover', darken(value, 0.15));
                var gradEnd = gradientEnd(value);
                root.style.setProperty('--hui-primary-gradient', 'linear-gradient(135deg, ' + value + ' 0%, ' + gradEnd + ' 100%)');
                root.style.setProperty('--hui-side-active-bg', hexToRgba(value, 0.2));
                root.style.setProperty('--hui-header-hover', hexToRgba(value, 0.06));
                root.style.setProperty('--hui-primary-shadow', hexToRgba(value, 0.3));
                root.style.setProperty('--hui-primary-shadow-sm', hexToRgba(value, 0.15));
                root.style.setProperty('--hui-primary-shadow-lg', hexToRgba(value, 0.4));
              } else if (method === 'setDark') {
                win.document.documentElement.setAttribute('data-theme', value ? 'dark' : 'light');
              }
            }
          } catch (e) {
            // 跨域 iframe 忽略
          }
        }
      } catch (e) {
        // 静默处理
      }
    },

    // ==================== 初始化 ====================

    /**
     * 从 localStorage 恢复主题状态
     */
    init: function () {
      // 恢复暗黑模式设置（先恢复暗黑，再恢复颜色，确保派生变量正确）
      var savedDark = util.getStore('theme_dark');
      if (savedDark === '1') {
        this.setDark(true);
      } else if (savedDark === '0') {
        this.setDark(false);
      }

      // 恢复主题色
      var savedColor = util.getStore('theme_color');
      if (savedColor) {
        this.setColor(savedColor);
      }
    }
  };

  // ==================== 导出模块 ====================

  exports('theme', theme);
});
