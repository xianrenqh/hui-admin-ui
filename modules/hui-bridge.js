/**
 * huiAdmin - iframe 通信桥接模块
 * ============================================================
 * 供子页面（iframe 内）调用，与父框架进行通信。
 *
 * 使用方式（在 iframe 子页面中）：
 *
 *   layui.config({ base: '../../modules/' }).extend({ 'hui-bridge': 'hui-bridge' });
 *   layui.use(['hui-bridge'], function () {
 *     var bridge = layui['hui-bridge'];
 *
 *     // 打开新标签页
 *     bridge.openTab('user-edit', '编辑用户', 'pages/system/user-edit.html');
 *
 *     // 关闭当前标签页
 *     bridge.closeCurrentTab();
 *
 *     // 获取父框架主题色
 *     var color = bridge.getThemeColor();
 *   });
 *
 * ============================================================
 */
layui.define([], function (exports) {
    'use strict';

    /**
     * 获取父窗口的 huiAdmin 实例
     * @returns {Object|null}
     */
    function getParentAdmin() {
        try {
            if (window.parent && window.parent.huiAdmin) {
                return window.parent.huiAdmin;
            }
        } catch (e) { /* cross-origin */ }
        return null;
    }

    /**
     * 获取父窗口 document
     * @returns {Document|null}
     */
    function getParentDocument() {
        try {
            return window.parent ? window.parent.document : null;
        } catch (e) { return null; }
    }

    var bridge = {

        // ==================== 标签页操作 ====================

        /**
         * 在父框架中打开新标签页
         * @param {string} id - 标签页唯一 ID
         * @param {string} title - 标签页标题
         * @param {string} url - 标签页 URL
         * @param {string} [icon] - 图标 class
         */
        openTab: function (id, title, url, icon) {
            var admin = getParentAdmin();
            if (admin) admin.openTab(id, title, url, icon);
        },

        /**
         * 关闭父框架中的指定标签页
         * @param {string} id - 标签页 ID
         */
        closeTab: function (id) {
            var admin = getParentAdmin();
            if (admin) admin.closeTab(id);
        },

        /**
         * 关闭当前标签页（关闭自身所在 iframe 的标签）
         */
        closeCurrentTab: function () {
            var admin = getParentAdmin();
            if (admin && admin._tab && admin._tab._currentId) {
                admin.closeTab(admin._tab._currentId);
            }
        },

        /**
         * 刷新父框架中的当前标签页
         */
        refreshParentTab: function () {
            var admin = getParentAdmin();
            if (admin) admin.refreshTab();
        },

        /**
         * 跳转回父框架首页
         */
        goHome: function () {
            var admin = getParentAdmin();
            if (admin) admin.goHome();
        },

        // ==================== 主题相关 ====================

        /**
         * 获取父框架当前主题色
         * @returns {string} CSS 颜色值
         */
        getThemeColor: function () {
            var admin = getParentAdmin();
            if (admin && admin._tab) {
                try {
                    return window.parent.document.documentElement.style.getPropertyValue('--hui-primary') ||
                        getComputedStyle(window.parent.document.documentElement).getPropertyValue('--hui-primary').trim();
                } catch (e) { }
            }
            return '#4f6ef7';
        },

        /**
         * 父框架是否为暗黑模式
         * @returns {boolean}
         */
        isDarkMode: function () {
            try {
                var doc = getParentDocument();
                if (doc) {
                    return doc.documentElement.getAttribute('data-theme') === 'dark';
                }
            } catch (e) { }
            return false;
        },

        // ==================== 侧边栏 ====================

        /**
         * 切换父框架侧边栏折叠状态
         */
        toggleSidebar: function () {
            var admin = getParentAdmin();
            if (admin) admin.toggleSidebar();
        },

        // ==================== 工具方法 ====================

        /**
         * 在父框架中显示 layer 提示（使用父级的 layer 实例）
         * @param {string} msg - 提示内容
         * @param {Object} [options] - layer.msg 配置项
         */
        parentMsg: function (msg, options) {
            try {
                if (window.parent && window.parent.layui && window.parent.layui.layer) {
                    window.parent.layui.layer.msg(msg, options || {});
                }
            } catch (e) { }
        },

        /**
         * 在父框架中显示确认框
         * @param {string} msg
         * @param {Function} callback
         */
        parentConfirm: function (msg, callback) {
            try {
                if (window.parent && window.parent.layui && window.parent.layui.layer) {
                    window.parent.layui.layer.confirm(msg, { icon: 3, title: '提示' }, function (index) {
                        window.parent.layui.layer.close(index);
                        if (callback) callback();
                    });
                }
            } catch (e) { }
        },

        /**
         * 检查当前页面是否在 iframe 中运行
         * @returns {boolean}
         */
        isInIframe: function () {
            return window.self !== window.top;
        }
    };

    exports('hui-bridge', bridge);
});
