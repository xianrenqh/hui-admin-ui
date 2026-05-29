/**
 * huiAdmin - 工具模块
 * 提供 localStorage/sessionStorage 封装、防抖等常用工具方法
 */
layui.define([], function (exports) {
  'use strict';

  var util = {};

  // ==================== localStorage 工具 ====================

  /**
   * 获取 localStorage 值（自动添加 'hui_' 前缀）
   * @param {string} key - 键名
   * @returns {string|null}
   */
  util.getStore = function (key) {
    return localStorage.getItem('hui_' + key);
  };

  /**
   * 设置 localStorage 值（自动添加 'hui_' 前缀）
   * @param {string} key - 键名
   * @param {string} value - 值
   */
  util.setStore = function (key, value) {
    localStorage.setItem('hui_' + key, value);
  };

  /**
   * 删除 localStorage 值（自动添加 'hui_' 前缀）
   * @param {string} key - 键名
   */
  util.rmStore = function (key) {
    localStorage.removeItem('hui_' + key);
  };

  // ==================== sessionStorage 工具 ====================

  /**
   * 获取 sessionStorage 值（JSON 反序列化，自动添加 'hui_' 前缀）
   * @param {string} key - 键名
   * @returns {*} 解析后的值，解析失败返回 null
   */
  util.getSession = function (key) {
    try {
      var raw = sessionStorage.getItem('hui_' + key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  };

  /**
   * 设置 sessionStorage 值（JSON 序列化，自动添加 'hui_' 前缀）
   * @param {string} key - 键名
   * @param {*} value - 任意可序列化的值
   */
  util.setSession = function (key, value) {
    sessionStorage.setItem('hui_' + key, JSON.stringify(value));
  };

  /**
   * 删除 sessionStorage 值
   * @param {string} key - 键名
   */
  util.rmSession = function (key) {
    sessionStorage.removeItem('hui_' + key);
  };

  // ==================== 函数工具 ====================

  /**
   * 防抖函数
   * @param {Function} fn - 要防抖的函数
   * @param {number} wait - 等待时间（毫秒）
   * @returns {Function} 防抖后的函数
   */
  util.debounce = function (fn, wait) {
    var timer;
    return function () {
      var ctx = this;
      var args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(ctx, args);
      }, wait);
    };
  };

  // ==================== 导出模块 ====================

  exports('hui-util', util);
});
