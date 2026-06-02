/**
 * huiAdmin - 后台管理框架核心模块
 * 中央协调器：初始化所有子模块、绑定全局事件、提供公共 API、管理设置面板
 */
layui.define(['form', 'layer', 'element', 'hui-util', 'theme', 'menu', 'hui-tab'], function (exports) {
    'use strict';

    var $ = layui.$;
    var form = layui.form;
    var layer = layui.layer;
    var element = layui.element;
    var util = layui['hui-util'];
    var theme = layui.theme;
    var Menu = layui.menu;
    var Tab = layui['hui-tab'];

    /**
     * @namespace admin
     */
    var admin = {
        // 全局组件实例引用
        _menu: null,
        _tab: null,
        // 用户配置
        _config: {},
        // 设置面板是否打开中
        _settingOpen: false,
        // 设置事件是否已绑定
        _settingEventsBound: false,

        // 菜单ID到面包屑路径的映射
        _breadcrumbMap: {},
        // 事件系统存储
        _events: {},
        // 可供表单使用的颜色列表（对象格式，含浅色变体）
        _colorList: [
            { color: '#4f6ef7', second: '#f0f4ff' },
            { color: '#7c5df8', second: '#f5f0ff' },
            { color: '#16baaa', second: '#e8f8f5' },
            { color: '#16b777', second: '#f0f9eb' },
            { color: '#f5a623', second: '#fff8e8' },
            { color: '#f56c6c', second: '#fef0f0' },
            { color: '#a855f7', second: '#f5f0ff' },
            { color: '#2f4056', second: '#f0f2f5' }
        ],
        // 毛玻璃模糊深度预设
        _blurPresets: [
            { label: '关闭', value: 0 },
            { label: '轻度', value: 6 },
            { label: '标准', value: 12 },
            { label: '深度', value: 20 },
            { label: '重度', value: 32 }
        ],

        // ==================== 默认配置 ====================

        _defaults: {
            // 页面标题
            title: 'huiAdmin',
            // 网站名称
            siteName: 'huiAdmin',
            // 首页 tab id
            homeTabId: 'home',
            // 首页 tab 标题
            homeTitle: '首页',
            // 首页 tab url
            homeUrl: '',
            // 首页 tab 图标
            homeIcon: 'layui-icon layui-icon-home',
            // 菜单数据（URL 字符串或数组）
            menuData: [],
            // 菜单渲染容器
            menuElem: '#hui-menu',
            // 标签栏容器
            tabElem: '#hui-tab',
            // iframe 容器
            iframeContainer: '#hui-iframe',
            // 面包屑容器
            breadcrumbElem: '#hui-breadcrumb',
            // 是否手风琴菜单
            menuAccordion: true,
            // 是否显示设置面板
            showSetting: true,
            // 是否启用右键菜单
            enableContextMenu: true,
            // 是否首页为不可关闭
            homeCloseable: false
        },

        // ==================== 公共 API ====================

        /**
         * 打开标签页（便捷方法）
         * @param {string|number} id - 标签页 id
         * @param {string} title - 标签页标题
         * @param {string} url - 标签页 URL
         * @param {string} icon - 图标 class（可选）
         */
        openTab: function (id, title, url, icon) {
            if (this._tab) {
                this._tab.open({
                    id: id,
                    title: title,
                    url: url,
                    icon: icon || '',
                    closeable: true
                });
            }
        },

        /**
         * 关闭标签页
         * @param {string|number} id
         */
        closeTab: function (id) {
            if (this._tab) {
                this._tab.close(id);
            }
        },

        /**
         * 刷新当前标签页
         */
        refreshTab: function () {
            if (this._tab) {
                this._tab.refresh();
            }
        },

        /**
         * 切换侧边栏展开/折叠
         */
        toggleSidebar: function () {
            var layout = $('.hui-layout');
            layout.toggleClass('hui-collapsed');
            var collapsed = layout.hasClass('hui-collapsed');
            localStorage.setItem('hui_sidebar_collapsed', collapsed ? '1' : '0');
            // 更新折叠按钮提示文字
            var btn = document.querySelector('.hui-collapse-btn');
            if (btn) btn.title = collapsed ? '展开菜单' : '折叠菜单';
            this.emit('sidebarToggled', { collapsed: collapsed });
        },

        /**
         * 切换暗黑/明亮模式
         */
        toggleTheme: function () {
            theme.toggleDark();
            this.emit('darkToggled', { isDark: theme.isDark() });
        },

        /**
         * 设置主题色
         * @param {string} color - CSS 颜色值
         * @param {string} [lightColor] - 可选的浅色变体
         */
        setColor: function (color, lightColor) {
            theme.setColor(color, lightColor);
            this.emit('themeChanged', { color: color });
        },

        /**
         * 回到首页标签
         */
        goHome: function () {
            var homeId = this._config.homeTabId || 'home';
            if (this._tab) {
                this._tab.select(homeId);
            }
        },

        // ==================== 全局搜索 ====================

        /**
         * 打开/关闭全局搜索
         */
        toggleSearch: function () {
            var overlay = document.getElementById('hui-search-overlay');
            if (!overlay) return;
            if (overlay.classList.contains('show')) {
                this.closeSearch();
            } else {
                this.openSearch();
            }
        },

        /**
         * 打开全局搜索
         */
        openSearch: function () {
            var overlay = document.getElementById('hui-search-overlay');
            var input = document.getElementById('hui-search-input');
            if (!overlay) return;
            overlay.classList.add('show');
            if (input) {
                input.value = '';
                setTimeout(function () { input.focus(); }, 100);
            }
            var results = document.getElementById('hui-search-results');
            if (results) { results.innerHTML = ''; results.classList.remove('hui-search-empty'); }
        },

        /**
         * 关闭全局搜索
         */
        closeSearch: function () {
            var overlay = document.getElementById('hui-search-overlay');
            if (overlay) overlay.classList.remove('show');
        },

        /**
         * 执行搜索
         * @param {string} keyword
         */
        _doSearch: function (keyword) {
            var results = document.getElementById('hui-search-results');
            if (!results || !this._menu || !this._menu._menuMap) return;

            keyword = keyword.trim().toLowerCase();
            if (!keyword) {
                results.innerHTML = '';
                results.classList.remove('hui-search-empty');
                return;
            }

            var matches = [];
            var menuMap = this._menu._menuMap;
            for (var id in menuMap) {
                if (menuMap.hasOwnProperty(id)) {
                    var item = menuMap[id];
                    if (item.type === '1' && item.url && item.title.toLowerCase().indexOf(keyword) !== -1) {
                        matches.push(item);
                    }
                }
            }

            if (matches.length === 0) {
                results.innerHTML = '';
                results.classList.add('hui-search-empty');
                return;
            }

            results.classList.remove('hui-search-empty');
            var html = '';
            for (var i = 0; i < matches.length; i++) {
                var m = matches[i];
                var path = this._menu._getBreadcrumb ? this._menu._getBreadcrumb(m.id) : '';
                html += '<div class="hui-search-item" data-id="' + m.id + '" data-title="' + m.title + '" data-url="' + m.url + '" data-icon="' + (m.icon || '') + '">';
                html += '<i class="' + (m.icon || 'layui-icon layui-icon-app') + '"></i>';
                html += '<span class="hui-search-item-title">' + m.title + '</span>';
                if (path) html += '<span class="hui-search-item-path">' + path + '</span>';
                html += '</div>';
            }
            results.innerHTML = html;
        },

        // ==================== 事件系统 ====================

        /**
         * 监听事件
         * @param {string} event - 事件名称 (tabOpened|tabClosed|tabSwitched|themeChanged|darkToggled|sidebarToggled)
         * @param {Function} callback - 回调函数
         */
        on: function (event, callback) {
            if (!this._events[event]) this._events[event] = [];
            this._events[event].push(callback);
        },

        /**
         * 移除事件监听
         * @param {string} event
         * @param {Function} [callback] - 不传则移除该事件所有监听
         */
        off: function (event, callback) {
            if (!this._events[event]) return;
            if (!callback) { delete this._events[event]; return; }
            this._events[event] = this._events[event].filter(function (fn) { return fn !== callback; });
        },

        /**
         * 触发事件
         * @param {string} event
         * @param {*} data
         */
        emit: function (event, data) {
            var list = this._events[event];
            if (!list || !list.length) return;
            for (var i = 0; i < list.length; i++) {
                try { list[i](data); } catch (e) { console.error('huiAdmin event error:', event, e); }
            }
        },

        // ==================== 引导启动 ====================

        /**
         * 启动框架（主入口）
         * @param {Object} userConfig - 用户自定义配置
         */
        boot: function (userConfig) {
            var self = this;

            // 合并配置
            this._config = $.extend({}, this._defaults, userConfig || {});

            // 初始化主题
            theme.init();

            // 恢复页脚状态
            this._restoreFooter();

            // 恢复毛玻璃深度
            this._restoreGlassBlur();

            // 设置页面标题
            if (this._config.title) {
                document.title = this._config.title;
            }

            // 初始化菜单
            this._initMenu();

            // 初始化标签页
            this._initTab();

            // 初始化面包屑
            this._initBreadcrumb();

            // 绑定所有全局事件
            this._bindEvents();

            // 恢复全屏状态图标
            this._updateFullscreenIcon();

            // 恢复暗黑模式图标
            this._updateDarkIcon();

            // 渲染 layui 表单（设置面板中的表单元素需要重新渲染）
            form.render();

            // 窗口关闭前清理
            $(window).on('beforeunload', function () {
                // sessionStorage 会在标签页关闭时自动清除，不需要额外处理
            });

            // 暴露全局访问
            window.huiAdmin = this;

            // 控制台欢迎信息
            console.log('huiAdmin framework v2.0 booted successfully.');
        },

        /**
         * 恢复页脚显示状态
         * @private
         */
        _restoreFooter: function () {
            var showFooter = util.getStore('show_footer');
            if (showFooter === '1') {
                var layout = document.querySelector('.hui-layout');
                var footer = document.getElementById('hui-footer');
                if (layout) layout.classList.add('hui-show-footer');
                if (footer) footer.style.display = 'flex';
            }
        },

        /**
         * 恢复毛玻璃深度设置
         * @private
         */
        _restoreGlassBlur: function () {
            var saved = util.getStore('glass_blur');
            if (saved !== null && saved !== undefined && saved !== '') {
                this._applyGlassBlur(parseInt(saved, 10));
            }
        },

        // ==================== 初始化子模块 ====================

        /**
         * 初始化菜单模块
         * @private
         */
        _initMenu: function () {
            var self = this;
            var config = this._config;

            this._menu = new Menu({
                elem: config.menuElem,
                data: config.menuData,
                accordion: config.menuAccordion,
                onClick: function (id, title, url, icon, path) {
                    self._breadcrumbMap[id] = path;
                    self._updateBreadcrumb(path, title);
                    if (url) {
                        self.openTab(id, title, url, icon);
                    }
                    // 移动端点击菜单后自动关闭侧边栏
                    if (window.innerWidth <= 768) {
                        $('.hui-side').removeClass('hui-side-show');
                        $('#hui-side-mask').removeClass('show');
                    }
                }
            });

            this._menu.render();
        },

        /**
         * 初始化标签页模块
         * @private
         */
        _initTab: function () {
            var config = this._config;

            this._tab = new Tab({
                elem: config.tabElem,
                iframeContainer: config.iframeContainer,
                maxTabs: config.maxTabs || 20,
                homeTab: {
                    id: config.homeTabId || 'home',
                    title: config.homeTitle || '首页',
                    url: config.homeUrl || '',
                    icon: config.homeIcon || 'layui-icon layui-icon-home',
                    closeable: config.homeCloseable || false
                }
            });

            this._tab.render();

            // 标签点击/关闭时更新面包屑 + 同步菜单选中
            var self = this;
            function syncTabToMenu() {
                setTimeout(function () {
                    var item = document.querySelector('.hui-tab-item.hui-tab-active');
                    if (!item) return;
                    var id = item.getAttribute('data-tab-id');
                    var titleEl = item.querySelector('.hui-tab-title');
                    // 优先用菜单路径，回退到标签标题
                    var path = self._breadcrumbMap[id] || (titleEl ? titleEl.textContent : '');
                    if (path) self._updateBreadcrumb(path);
                    // 同步菜单选中状态
                    if (self._menu && self._menu._menuMap && self._menu._menuMap[id]) {
                        self._menu.select(id);
                    }
                }, 50);
            }
            $(document.body).on('click', '.hui-tab-item', syncTabToMenu);
            $(document.body).on('click', '.hui-tab-close', function () {
                setTimeout(syncTabToMenu, 100);
            });
        },

        /**
         * 初始化面包屑
         * @private
         */
        _initBreadcrumb: function () {
            var breadcrumb = $(this._config.breadcrumbElem);
            if (breadcrumb.length) {
                breadcrumb.html('<span class="layui-icon layui-icon-home"></span> 工作空间 / 首页');
            }
        },

        /**
         * 更新面包屑
         * @param {string} path - 菜单路径，如 "工作空间 / 系统管理 / 用户管理"
         * @param {string} title - 当前页面标题
         */
        _updateBreadcrumb: function (path, title) {
            var breadcrumb = $(this._config.breadcrumbElem);
            if (breadcrumb.length) {
                breadcrumb.html('<span class="layui-icon layui-icon-home"></span> ' + (path || title || '首页'));
            }
        },

        // ==================== 全局事件绑定 ====================

        /**
         * 绑定所有委托事件
         * @private
         */
        _bindEvents: function () {
            var self = this;

            // ---- 侧边栏折叠按钮（PC端） ----
            $(document.body).on('click', '.hui-collapse-btn', function () {
                if (window.innerWidth > 768) {
                    self.toggleSidebar();
                }
            });

            // ---- 全屏切换按钮 ----
            $(document.body).on('click', '.hui-fullscreen-btn', function () {
                self._toggleFullscreen();
            });

            $(document).on('fullscreenchange webkitfullscreenchange mozfullscreenchange msfullscreenchange', function () {
                self._updateFullscreenIcon();
            });

            // ---- 刷新按钮 ----
            $(document.body).on('click', '.hui-refresh-btn', function () {
                self.refreshTab();
            });

            // ---- 暗黑模式切换 ----
            $(document.body).on('click', '.hui-dark-btn', function () {
                theme.toggleDark();
                self._updateDarkIcon();
            });

            // ---- 设置按钮 ----
            $(document.body).on('click', '.hui-setting-btn', function () {
                self._openSettingPanel();
            });

            // ---- 全局搜索 ----
            $(document.body).on('click', '.hui-search-btn', function () {
                self.toggleSearch();
            });
            $('#hui-search-overlay').on('click', function (e) {
                if ($(e.target).is('#hui-search-overlay')) self.closeSearch();
            });
            var searchTimer = null;
            $(document.body).on('input', '#hui-search-input', function () {
                var val = this.value;
                clearTimeout(searchTimer);
                searchTimer = setTimeout(function () { self._doSearch(val); }, 200);
            });
            $(document.body).on('click', '.hui-search-item', function () {
                var id = $(this).attr('data-id');
                var title = $(this).attr('data-title');
                var url = $(this).attr('data-url');
                var icon = $(this).attr('data-icon');
                self.openTab(id, title, url, icon);
                self.closeSearch();
            });

            // ---- 抽屉关闭 ----
            $('#hui-drawer-close, #hui-drawer-mask').on('click', function () {
                self._closeDrawer();
            });

            // ---- 用户下拉菜单开关 ----
            $(document.body).on('click', '#hui-user-dropdown', function (e) {
                e.stopPropagation();
                if (!$(e.target).closest('.hui-user-menu-item').length) {
                    this.classList.toggle('open');
                }
            });

            // ---- 用户操作下拉菜单 ----
            $(document.body).on('click', '.hui-user-menu-item[data-action], .hui-user-action[data-action]', function (e) {
                var action = $(this).attr('data-action');
                switch (action) {
                    case 'profile':
                        self.openTab('22', '个人信息', 'pages/system/profile.html');
                        break;
                    case 'password':
                        self.openTab('23', '修改密码', 'pages/system/password.html');
                        break;
                    case 'logout':
                        self._handleLogout();
                        break;
                    default:
                        break;
                }
                // Close dropdown after clicking
                document.getElementById('hui-user-dropdown').classList.remove('open');
            });

            // ---- 键盘快捷键 ----
            $(document).on('keydown', function (e) {
                // Ctrl+R 刷新当前标签
                if ((e.ctrlKey || e.metaKey) && e.keyCode === 82 && e.target.nodeName !== 'INPUT' && e.target.nodeName !== 'TEXTAREA') {
                    e.preventDefault();
                    self.refreshTab();
                }
                // Ctrl+K 打开/关闭全局搜索
                if ((e.ctrlKey || e.metaKey) && e.keyCode === 75) {
                    e.preventDefault();
                    self.toggleSearch();
                }
                // Esc 关闭搜索
                if (e.keyCode === 27) {
                    self.closeSearch();
                }
            });

            // ---- 移动端菜单 ----
            function openMobile() {
                $('.hui-side').addClass('hui-side-show');
                $('#hui-side-mask').addClass('show');
            }
            function closeMobile() {
                $('.hui-side').removeClass('hui-side-show');
                $('#hui-side-mask').removeClass('show');
            }
            $('#hui-mobile-toggle').on('click', function () {
                $('.hui-side').hasClass('hui-side-show') ? closeMobile() : openMobile();
            });
            $('#hui-side-mask').on('click', closeMobile);
        },

        // ==================== 全屏功能 ====================

        /**
         * 切换全屏
         * @private
         */
        _toggleFullscreen: function () {
            if (!document.fullscreenElement) {
                // 进入全屏
                var docElm = document.documentElement;
                if (docElm.requestFullscreen) {
                    docElm.requestFullscreen();
                } else if (docElm.webkitRequestFullscreen) {
                    docElm.webkitRequestFullscreen();
                } else if (docElm.mozRequestFullScreen) {
                    docElm.mozRequestFullScreen();
                } else if (docElm.msRequestFullscreen) {
                    docElm.msRequestFullscreen();
                }
            } else {
                // 退出全屏
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                } else if (document.mozCancelFullScreen) {
                    document.mozCancelFullScreen();
                } else if (document.msExitFullscreen) {
                    document.msExitFullscreen();
                }
            }
        },

        /**
         * 更新全屏按钮图标
         * @private
         */
        _updateFullscreenIcon: function () {
            var $btn = $('.hui-fullscreen-btn i');
            if (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement) {
                $btn.removeClass('layui-icon-screen-full').addClass('layui-icon-screen-restore');
            } else {
                $btn.removeClass('layui-icon-screen-restore').addClass('layui-icon-screen-full');
            }
        },

        /**
         * 更新暗黑模式按钮图标
         * @private
         */
        _updateDarkIcon: function () {
            var $btn = $('.hui-dark-btn');
            if (theme.isDark()) {
                $btn.attr('title', '明亮模式');
                $btn.find('i').removeClass('layui-icon-moon').addClass('layui-icon-light');
            } else {
                $btn.attr('title', '暗黑模式');
                $btn.find('i').removeClass('layui-icon-light').addClass('layui-icon-moon');
            }
        },

        // ==================== 设置面板（右侧抽屉） ====================

        /**
         * 打开/关闭设置抽屉
         * @private
         */
        _openSettingPanel: function () {
            var drawer = document.getElementById('hui-drawer');
            var mask = document.getElementById('hui-drawer-mask');
            var isOpen = drawer.classList.contains('open');

            if (isOpen) {
                this._closeDrawer();
            } else {
                this._renderSettingContent();
                drawer.classList.add('open');
                mask.classList.add('open');
                this._settingOpen = true;
            }
        },

        _closeDrawer: function () {
            document.getElementById('hui-drawer').classList.remove('open');
            document.getElementById('hui-drawer-mask').classList.remove('open');
            this._settingOpen = false;
        },

        /**
         * 渲染设置内容到抽屉中
         * @private
         */
        _renderSettingContent: function () {
            var self = this;
            var body = document.getElementById('hui-drawer-body');
            var currentColor = theme.getColor();
            var currentBlur = parseInt(util.getStore('glass_blur') || '12', 10);

            // 主题色圆点
            var colorHtml = '';
            for (var i = 0; i < this._colorList.length; i++) {
                var item = this._colorList[i];
                var act = item.color === currentColor ? ' active' : '';
                colorHtml += '<span class="color-dot' + act + '" data-color="' + item.color + '" data-second="' + item.second + '" style="background:' + item.color + '"></span>';
            }

            // 毛玻璃深度选项
            var blurHtml = '';
            for (var j = 0; j < this._blurPresets.length; j++) {
                var preset = this._blurPresets[j];
                var sel = preset.value === currentBlur ? ' selected' : '';
                blurHtml += '<option value="' + preset.value + '"' + sel + '>' + preset.label + '</option>';
            }

            var html = '<form class="layui-form" lay-filter="hui-setting-form">';
            html += '<div class="set-item"><label>菜单主题</label>';
            html += '<select id="setMenuTheme" lay-filter="setMenuTheme"><option value="dark">暗色</option><option value="light">亮色</option></select></div>';

            html += '<div class="set-item"><label>头部主题</label>';
            html += '<select id="setHeaderTheme" lay-filter="setHeaderTheme"><option value="dark">暗色</option><option value="light">亮色</option></select></div>';

            html += '<div class="set-item"><label>主题色</label>';
            html += '<div class="color-row">' + colorHtml + '</div></div>';

            html += '<div class="set-item"><label>毛玻璃深度</label>';
            html += '<select id="setGlassBlur" lay-filter="setGlassBlur">' + blurHtml + '</select></div>';

            html += '<div class="set-item"><label>页脚显示</label>';
            html += '<select id="setFooter" lay-filter="setFooter"><option value="1">显示</option><option value="0">隐藏</option></select></div>';
            html += '</form>';

            body.innerHTML = html;

            // 同步当前值
            document.getElementById('setMenuTheme').value = util.getStore('menu_theme') || 'dark';
            document.getElementById('setHeaderTheme').value = util.getStore('header_theme') || 'dark';
            document.getElementById('setFooter').value = util.getStore('show_footer') || '0';

            // 使用 layui form 渲染下拉
            form.render('select', 'hui-setting-form');

            // 颜色选择
            body.querySelectorAll('.color-dot').forEach(function (dot) {
                dot.addEventListener('click', function () {
                    body.querySelectorAll('.color-dot').forEach(function (d) { d.classList.remove('active'); });
                    dot.classList.add('active');
                    self.setColor(dot.getAttribute('data-color'), dot.getAttribute('data-second'));
                });
            });

            // 使用 layui form 事件监听（仅首次绑定）
            if (!this._settingEventsBound) {
                this._settingEventsBound = true;

                form.on('select(setMenuTheme)', function (data) {
                    util.setStore('menu_theme', data.value);
                    var side = document.querySelector('.hui-side');
                    if (data.value === 'dark') { side.classList.add('hui-side-dark'); side.classList.remove('hui-side-light'); }
                    else { side.classList.add('hui-side-light'); side.classList.remove('hui-side-dark'); }
                });

                form.on('select(setHeaderTheme)', function (data) {
                    util.setStore('header_theme', data.value);
                    var hdr = document.querySelector('.hui-header');
                    if (data.value === 'dark') { hdr.classList.add('hui-header-dark'); hdr.classList.remove('hui-header-light'); }
                    else { hdr.classList.add('hui-header-light'); hdr.classList.remove('hui-header-dark'); }
                });

                form.on('select(setGlassBlur)', function (data) {
                    self._applyGlassBlur(parseInt(data.value, 10));
                });

                form.on('select(setFooter)', function (data) {
                    util.setStore('show_footer', data.value);
                    var layout = document.querySelector('.hui-layout');
                    var footer = document.getElementById('hui-footer');
                    if (data.value === '1') {
                        layout.classList.add('hui-show-footer');
                        footer.style.display = 'flex';
                    } else {
                        layout.classList.remove('hui-show-footer');
                        footer.style.display = 'none';
                    }
                });
            }
        },

        /**
         * 应用毛玻璃模糊深度
         * @param {number} blur - 模糊值 (px)
         * @private
         */
        _applyGlassBlur: function (blur) {
            util.setStore('glass_blur', blur);
            var root = document.documentElement;
            if (blur === 0) {
                root.style.setProperty('--hui-glass-blur', 'none');
                root.style.setProperty('--hui-glass-bg', 'var(--hui-card-bg)');
            } else {
                root.style.setProperty('--hui-glass-blur', 'blur(' + blur + 'px)');
                // 根据模糊深度调整半透明背景的不透明度
                var isDark = theme.isDark();
                if (isDark) {
                    root.style.setProperty('--hui-glass-bg', 'rgba(26, 29, 39, ' + (0.7 + blur * 0.01).toFixed(2) + ')');
                } else {
                    root.style.setProperty('--hui-glass-bg', 'rgba(255, 255, 255, ' + (0.7 + blur * 0.01).toFixed(2) + ')');
                }
            }
            // 广播到 iframe
            this._broadcastGlassBlur(blur);
        },

        /**
         * 广播毛玻璃深度到 iframe
         * @private
         */
        _broadcastGlassBlur: function (blur) {
            try {
                var iframes = document.querySelectorAll('iframe');
                for (var i = 0; i < iframes.length; i++) {
                    try {
                        var win = iframes[i].contentWindow;
                        if (win && win.document) {
                            var root = win.document.documentElement;
                            if (blur === 0) {
                                root.style.setProperty('--hui-glass-blur', 'none');
                            } else {
                                root.style.setProperty('--hui-glass-blur', 'blur(' + blur + 'px)');
                            }
                        }
                    } catch (e) { }
                }
            } catch (e) { }
        },

        // ==================== 用户操作 ====================

        /**
         * 退出登录
         * @private
         */
        _handleLogout: function () {
            // 优先调用用户自定义的 onLogout 回调
            var config = typeof HUI_CONFIG !== 'undefined' ? HUI_CONFIG : {};
            if (typeof config.onLogout === 'function') {
                config.onLogout();
                return;
            }
            layer.confirm('确定要退出登录吗？', {
                icon: 3,
                title: '提示',
                btn: ['确定', '取消']
            }, function (index) {
                layer.close(index);
                // 清除本地存储
                util.rmStore('theme_color');
                util.rmStore('theme_dark');
                util.rmStore('sidebar_collapsed');
                util.rmSession('tabs');
                util.rmSession('currentTabId');
                // 跳转到登录页
                window.location.href = 'login.html';
            });
        }
    };

    // ==================== 导出模块 ====================

    exports('admin', admin);
});
