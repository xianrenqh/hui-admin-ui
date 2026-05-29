/**
 * huiAdmin - 用户自定义扩展模块
 * ========================================
 * 在此文件中编写自定义 JS，不会影响框架核心代码。
 * 升级框架时此文件不会被覆盖。
 *
 * 使用方式（在任意页面中）：
 *
 *   layui.use(['hui-custom'], function () {
 *     var custom = layui['hui-custom'];
 *
 *     // 调用自定义方法
 *     custom.myMethod();
 *
 *     // 使用内置工具方法
 *     custom.toast('操作成功');
 *     custom.confirm('确定删除？').then(function () { ... });
 *   });
 *
 * 扩展方式：
 *   在下方 MY_CUSTOM 对象中添加方法即可。
 *   方法内可通过 this 访问模块上下文。
 *
 * ========================================
 */
layui.define(['layer', 'jquery', 'hui-util'], function (exports) {
  'use strict';

  var $ = layui.$;
  var layer = layui.layer;
  var util = layui['hui-util'];

  /**
   * @namespace hui-custom
   * 用户自定义扩展模块
   */
  var MY_CUSTOM = {

    // ========== 便捷 UI 方法 ==========

    /**
     * 轻提示
     * @param {string} msg - 提示内容
     * @param {number} [icon=1] - 图标编号 (0=警告, 1=成功, 2=错误, 5=疑问, 6=加载)
     * @param {number} [time=2000] - 自动关闭时间(ms)
     */
    toast: function (msg, icon, time) {
      layer.msg(msg, { icon: icon === undefined ? 1 : icon, time: time || 2000 });
    },

    /**
     * 成功提示
     */
    success: function (msg) {
      this.toast(msg || '操作成功', 1);
    },

    /**
     * 错误提示
     */
    error: function (msg) {
      this.toast(msg || '操作失败', 2);
    },

    /**
     * 警告提示
     */
    warn: function (msg) {
      this.toast(msg || '请注意', 0);
    },

    /**
     * 加载中提示
     * @param {string} [msg='加载中...']
     * @returns {number} layer index，用于关闭
     */
    loading: function (msg) {
      return layer.load(2, { shade: [0.3, '#000'], content: msg || '加载中...' });
    },

    /**
     * 确认对话框（Promise 版）
     * @param {string} msg - 提示内容
     * @param {string} [title='提示']
     * @returns {Promise}
     */
    confirm: function (msg, title) {
      return new Promise(function (resolve, reject) {
        layer.confirm(msg, {
          icon: 3,
          title: title || '提示',
          btn: ['确定', '取消']
        }, function (index) {
          layer.close(index);
          resolve();
        }, function () {
          reject();
        });
      });
    },

    /**
     * 输入对话框
     * @param {string} title - 标题
     * @param {string} [defaultValue=''] - 默认值
     * @returns {Promise<string>}
     */
    prompt: function (title, defaultValue) {
      return new Promise(function (resolve, reject) {
        layer.prompt({
          title: title,
          value: defaultValue || '',
          formType: 0
        }, function (value, index) {
          layer.close(index);
          resolve(value);
        });
      });
    },

    // ========== 数据请求方法 ==========

    /**
     * GET 请求封装
     * @param {string} url
     * @param {Object} [data]
     * @returns {Promise}
     */
    get: function (url, data) {
      return new Promise(function (resolve, reject) {
        $.ajax({
          url: url,
          type: 'GET',
          data: data,
          dataType: 'json',
          success: function (res) { resolve(res); },
          error: function (xhr) { reject(xhr); }
        });
      });
    },

    /**
     * POST 请求封装
     * @param {string} url
     * @param {Object} [data]
     * @returns {Promise}
     */
    post: function (url, data) {
      return new Promise(function (resolve, reject) {
        $.ajax({
          url: url,
          type: 'POST',
          data: JSON.stringify(data),
          contentType: 'application/json',
          dataType: 'json',
          success: function (res) { resolve(res); },
          error: function (xhr) { reject(xhr); }
        });
      });
    },

    // ========== 工具方法 ==========

    /**
     * 格式化日期
     * @param {Date|number|string} date
     * @param {string} [fmt='yyyy-MM-dd hh:mm:ss']
     * @returns {string}
     */
    formatDate: function (date, fmt) {
      if (!(date instanceof Date)) date = new Date(date);
      fmt = fmt || 'yyyy-MM-dd hh:mm:ss';
      var o = {
        'M+': date.getMonth() + 1,
        'd+': date.getDate(),
        'h+': date.getHours(),
        'm+': date.getMinutes(),
        's+': date.getSeconds(),
        'q+': Math.floor((date.getMonth() + 3) / 3),
        'S': date.getMilliseconds()
      };
      if (/(y+)/.test(fmt)) {
        fmt = fmt.replace(RegExp.$1, (date.getFullYear() + '').substr(4 - RegExp.$1.length));
      }
      for (var k in o) {
        if (new RegExp('(' + k + ')').test(fmt)) {
          fmt = fmt.replace(RegExp.$1, RegExp.$1.length === 1 ? o[k] : ('00' + o[k]).substr(('' + o[k]).length));
        }
      }
      return fmt;
    },

    /**
     * 深拷贝对象
     * @param {*} obj
     * @returns {*}
     */
    deepClone: function (obj) {
      if (obj === null || typeof obj !== 'object') return obj;
      try { return JSON.parse(JSON.stringify(obj)); } catch (e) { return obj; }
    },

    /**
     * 获取 URL 参数
     * @param {string} [name] - 参数名，不传则返回全部参数对象
     * @returns {string|Object}
     */
    getUrlParam: function (name) {
      var params = {};
      var search = window.location.search.substring(1);
      if (search) {
        var arr = search.split('&');
        for (var i = 0; i < arr.length; i++) {
          var pair = arr[i].split('=');
          params[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
        }
      }
      return name ? params[name] : params;
    },

    /**
     * 防抖函数
     * @param {Function} fn
     * @param {number} [delay=300]
     * @returns {Function}
     */
    debounce: function (fn, delay) {
      var timer = null;
      delay = delay || 300;
      return function () {
        var ctx = this, args = arguments;
        clearTimeout(timer);
        timer = setTimeout(function () { fn.apply(ctx, args); }, delay);
      };
    },

    /**
     * 节流函数
     * @param {Function} fn
     * @param {number} [interval=200]
     * @returns {Function}
     */
    throttle: function (fn, interval) {
      var last = 0;
      interval = interval || 200;
      return function () {
        var now = Date.now();
        if (now - last >= interval) {
          last = now;
          fn.apply(this, arguments);
        }
      };
    },

    // ==========================================
    // 在下方添加你的自定义方法
    // ==========================================

    /**
     * 示例：获取当前登录用户信息
     * @returns {Object}
     */
    getCurrentUser: function () {
      return {
        name: util.getStore('user_name') || '管理员',
        role: util.getStore('user_role') || 'admin'
      };
    }
  };

  // 导出模块
  exports('hui-custom', MY_CUSTOM);
});
