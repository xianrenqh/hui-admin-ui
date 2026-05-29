/**
 * huiAdmin - 标签页管理模块
 * 负责 iframe 标签页的打开、关闭、切换、刷新，以及滚动导航和右键菜单
 * 特性：iframe 懒加载、水平滚动、session 持久化、最大限制 LRU 策略
 */
layui.define(['element', 'hui-util', 'layer', 'theme'], function (exports) {
  'use strict';

  var $ = layui.$;
  var element = layui.element;
  var util = layui['hui-util'];
  var layer = layui.layer;
  var theme = layui.theme;

  /**
   * @constructor Tab
   * @param {Object} options - 配置项
   */
  function Tab(options) {
    this.options = $.extend({}, Tab.defaults, options);
    // 当前激活的标签页 id
    this._currentId = null;
    // 标签页数据数组：[{id, title, url, icon, closeable, loaded}]
    this._tabs = [];
    // iframe 容器 jQuery 对象
    this._iframeContainer = null;
    // 最大标签数
    this._maxTabs = this.options.maxTabs;
  }

  // 默认配置
  Tab.defaults = {
    // 标签栏容器
    elem: '#hui-tab',
    // iframe 容器选择器
    iframeContainer: '#hui-iframe',
    // 工具按钮选择器
    toolBtn: '#hui-tab-tool',
    // 右滚动按钮
    scrollRightBtn: '#hui-tab-scroll-right',
    // 左滚动按钮
    scrollLeftBtn: '#hui-tab-scroll-left',
    // 最大标签数
    maxTabs: 20,
    // 首页标签配置
    homeTab: {
      id: 'home',
      title: '首页',
      url: '',
      closeable: false
    }
  };

  // ==================== 原型方法 ====================

  /**
   * 初始化并渲染标签栏
   * @param {Object} options - 合并配置
   * @returns {Tab} this
   */
  Tab.prototype.render = function (options) {
    var self = this;
    if (options) {
      $.extend(this.options, options);
    }

    this._iframeContainer = $(this.options.iframeContainer);

    // 尝试从 sessionStorage 恢复标签页
    var savedTabs = util.getSession('tabs');
    if (savedTabs && savedTabs.length) {
      this._tabs = savedTabs;
    } else {
      // 初始化首页标签
      var home = this.options.homeTab;
      this._tabs = [{
        id: home.id,
        title: home.title,
        url: home.url || '',
        icon: home.icon || '',
        closeable: home.closeable !== undefined ? home.closeable : false,
        loaded: false
      }];
      this._saveTabs();
    }

    // 设置默认激活标签
    if (!this._currentId && this._tabs.length) {
      this._currentId = this._tabs[0].id;
    }

    // 渲染标签栏 UI
    this._renderTabBar();
    // 渲染 iframe 容器
    this._renderIframes();
    // 绑定事件
    this._bindEvents();

    // 激活当前标签
    this._activateTab(this._currentId);

    // 恢复侧边栏折叠状态（联动）
    var collapsed = util.getStore('sidebar_collapsed');
    if (collapsed === '1') {
      $('.hui-layout').addClass('hui-collapsed');
    }

    return this;
  };

  /**
   * 打开或切换到标签页
   * @param {Object} opt - {id, title, url, icon, closeable}
   */
  Tab.prototype.open = function (opt) {
    var id = opt.id;
    var title = opt.title || '';
    var url = opt.url || '';
    var icon = opt.icon || '';
    var closeable = opt.closeable !== undefined ? opt.closeable : true;

    if (!id || !title) return;

    // 已存在则切换
    var existIdx = -1;
    for (var i = 0; i < this._tabs.length; i++) {
      if (this._tabs[i].id === id) {
        existIdx = i;
        break;
      }
    }

    if (existIdx >= 0) {
      // 已存在，更新 url（可能路由变化）、切换到该标签
      var tab = this._tabs[existIdx];
      if (url && tab.url !== url) {
        tab.url = url;
        tab.loaded = false;
        // 更新 iframe 的 data-src
        this._updateIframeSrc(id, url);
      }
      this.select(id);
    } else {
      // 新增标签页
      // 达到最大限制时，关闭最近最少使用的
      if (this._tabs.length >= this._maxTabs) {
        this._closeLRU();
      }

      this._tabs.push({
        id: id,
        title: title,
        url: url,
        icon: icon,
        closeable: closeable,
        loaded: false
      });

      this._renderTabBar();
      this._renderIframeItem(id, title, url, icon);
      this.select(id);
      this._saveTabs();
    }
  };

  /**
   * 关闭标签页
   * @param {string|number} id - 标签页 id
   */
  Tab.prototype.close = function (id) {
    var idx = -1;
    for (var i = 0; i < this._tabs.length; i++) {
      if (this._tabs[i].id === id) {
        idx = i;
        break;
      }
    }
    if (idx < 0) return;
    if (!this._tabs[idx].closeable) return;

    // 移除 iframe DOM
    var iframe = this._iframeContainer.find('.hui-iframe-item[data-tab-id="' + id + '"]');
    if (iframe.length) {
      iframe.find('iframe').attr('src', 'about:blank'); // 防止后台继续请求
      iframe.remove();
    }

    // 从数组中移除
    this._tabs.splice(idx, 1);

    // 如果关闭的是当前标签，切换到相邻标签
    if (this._currentId === id) {
      if (this._tabs.length) {
        var newIdx = Math.min(idx, this._tabs.length - 1);
        this._currentId = this._tabs[newIdx].id;
        this._activateTab(this._currentId);
      } else {
        this._currentId = null;
      }
    }

    this._renderTabBar();
    this._saveTabs();
  };

  /**
   * 关闭除当前外的所有可关闭标签
   */
  Tab.prototype.closeOther = function () {
    var self = this;
    var toClose = [];
    for (var i = 0; i < this._tabs.length; i++) {
      if (this._tabs[i].id !== this._currentId && this._tabs[i].closeable) {
        toClose.push(this._tabs[i].id);
      }
    }
    for (var j = 0; j < toClose.length; j++) {
      self.close(toClose[j]);
    }
  };

  /**
   * 关闭所有可关闭标签
   */
  Tab.prototype.closeAll = function () {
    var self = this;
    var toClose = [];
    for (var i = 0; i < this._tabs.length; i++) {
      if (this._tabs[i].closeable) {
        toClose.push(this._tabs[i].id);
      }
    }
    for (var j = 0; j < toClose.length; j++) {
      self.close(toClose[j]);
    }
  };

  /**
   * 刷新当前标签页的 iframe
   */
  Tab.prototype.refresh = function () {
    if (!this._currentId) return;
    var iframe = this._iframeContainer.find('.hui-iframe-item[data-tab-id="' + this._currentId + '"] iframe');
    if (iframe.length) {
      // 添加加载动画
      iframe.attr('src', iframe.attr('src'));
    }
  };

  /**
   * 切换到指定标签页
   * @param {string|number} id
   */
  Tab.prototype.select = function (id) {
    if (this._currentId === id) return;
    this._currentId = id;
    this._activateTab(id);

    // 滚动到可见
    this._scrollToTab(id);
  };

  // ==================== 内部方法 ====================

  /**
   * 渲染标签栏
   * @private
   */
  Tab.prototype._renderTabBar = function () {
    var self = this;
    var container = $(this.options.elem);
    var tabs = this._tabs;

    var html = '<div class="hui-tab-nav">';
    html += '<span class="hui-tab-scroll-left" id="' + this.options.scrollLeftBtn.replace('#', '') + '"><i class="layui-icon layui-icon-left"></i></span>';
    html += '<div class="hui-tab-scroll-body">';
    html += '<ul class="hui-tab-ul">';

    for (var i = 0; i < tabs.length; i++) {
      var tab = tabs[i];
      var activeClass = tab.id === this._currentId ? ' hui-tab-active' : '';
      html += '<li class="hui-tab-item' + activeClass + '" data-tab-id="' + tab.id + '" title="' + tab.title + '">';
      if (tab.icon) {
        html += '<i class="' + tab.icon + ' hui-tab-icon"></i>';
      }
      html += '<span class="hui-tab-title">' + tab.title + '</span>';
      if (tab.closeable) {
        html += '<i class="layui-icon layui-icon-close hui-tab-close"></i>';
      }
      html += '</li>';
    }

    html += '</ul>';
    html += '</div>';
    html += '<span class="hui-tab-scroll-right" id="' + this.options.scrollRightBtn.replace('#', '') + '"><i class="layui-icon layui-icon-right"></i></span>';
    html += '<div class="hui-tab-tool" id="' + this.options.toolBtn.replace('#', '') + '">';
    html += '<i class="layui-icon layui-icon-down"></i>';
    html += '<ul class="hui-tab-tool-menu">';
    html += '<li class="hui-tab-tool-item" data-action="closeCurrent">关闭当前</li>';
    html += '<li class="hui-tab-tool-item" data-action="closeOther">关闭其他</li>';
    html += '<li class="hui-tab-tool-item" data-action="closeAll">关闭全部</li>';
    html += '<li class="hui-tab-tool-divider"></li>';
    html += '<li class="hui-tab-tool-item" data-action="refresh">刷新当前</li>';
    html += '</ul>';
    html += '</div>';
    html += '</div>';

    container.html(html);

    // 更新滚动按钮状态
    this._updateScrollBtn();
  };

  /**
   * 渲染所有 iframe
   * @private
   */
  Tab.prototype._renderIframes = function () {
    var self = this;
    var container = this._iframeContainer;
    container.empty();

    for (var i = 0; i < this._tabs.length; i++) {
      var tab = this._tabs[i];
      self._renderIframeItemDOM(container, tab);
    }
  };

  /**
   * 渲染单个 iframe 项
   * @private
   */
  Tab.prototype._renderIframeItem = function (id, title, url, icon) {
    var tab = {
      id: id,
      title: title,
      url: url,
      icon: icon,
      closeable: true,
      loaded: false
    };
    this._renderIframeItemDOM(this._iframeContainer, tab);
  };

  /**
   * 创建单个 iframe DOM 节点
   * @private
   */
  Tab.prototype._renderIframeItemDOM = function (container, tab) {
    var isActive = tab.id === this._currentId;
    var iframeHtml = '<div class="hui-iframe-item' + (isActive ? ' hui-iframe-active' : ' hui-iframe-hidden') + '" data-tab-id="' + tab.id + '">';
    iframeHtml += '<iframe data-src="' + (tab.url || '') + '" src="about:blank" frameborder="0" scrolling="auto" allowfullscreen></iframe>';
    iframeHtml += '</div>';
    container.append(iframeHtml);
  };

  /**
   * 更新 iframe 的 data-src
   * @private
   */
  Tab.prototype._updateIframeSrc = function (id, url) {
    var iframe = this._iframeContainer.find('.hui-iframe-item[data-tab-id="' + id + '"] iframe');
    if (iframe.length) {
      iframe.attr('data-src', url || '');
    }
  };

  /**
   * 激活指定标签页（切换 iframe 显示及加载）
   * @private
   */
  Tab.prototype._activateTab = function (id) {
    // 更新标签栏激活状态
    var tabBar = $(this.options.elem);
    tabBar.find('.hui-tab-item').removeClass('hui-tab-active');
    tabBar.find('.hui-tab-item[data-tab-id="' + id + '"]').addClass('hui-tab-active');

    // 切换 iframe 显示
    this._iframeContainer.find('.hui-iframe-item')
      .removeClass('hui-iframe-active')
      .addClass('hui-iframe-hidden');

    var targetIframeItem = this._iframeContainer.find('.hui-iframe-item[data-tab-id="' + id + '"]');
    targetIframeItem.removeClass('hui-iframe-hidden').addClass('hui-iframe-active');

    // 懒加载：如果 iframe 未加载过，则设置 src
    var iframe = targetIframeItem.find('iframe');
    if (iframe.length) {
      var dataSrc = iframe.attr('data-src');
      if (dataSrc && iframe.attr('src') === 'about:blank') {
        // 暗黑模式下，先隐藏 iframe 避免白闪
        if (theme && theme.isDark && theme.isDark()) {
          iframe.css('visibility', 'hidden');
        }
        iframe.attr('src', dataSrc);

        // 更新加载状态
        for (var i = 0; i < this._tabs.length; i++) {
          if (this._tabs[i].id === id) {
            this._tabs[i].loaded = true;
            break;
          }
        }

        // 加载完成后，广播主题并显示 iframe
        iframe.on('load', function () {
          try {
            var win = iframe[0].contentWindow;
            if (win && win.document) {
              var color = theme.getColor();
              win.document.documentElement.style.setProperty('--hui-primary', color);
              var dark = theme.isDark();
              win.document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
            }
          } catch (e) { /* cross-origin */ }
          // 显示 iframe
          iframe.css('visibility', 'visible');
        });
      }
    }

    // 更新页面标题
    var tab = this._getTabById(id);
    if (tab) {
      document.title = tab.title + ' - huiAdmin';
    }
  };

  /**
   * 滚动到指定标签使之可见
   * @private
   */
  Tab.prototype._scrollToTab = function (id) {
    var scrollBody = $(this.options.elem).find('.hui-tab-scroll-body');
    var tabItem = scrollBody.find('.hui-tab-item[data-tab-id="' + id + '"]');
    if (!tabItem.length) return;

    var bodyLeft = scrollBody.scrollLeft();
    var bodyWidth = scrollBody.width();
    var itemLeft = tabItem.position().left;
    var itemWidth = tabItem.outerWidth();

    if (itemLeft < 0) {
      scrollBody.animate({ scrollLeft: bodyLeft + itemLeft - 10 }, 200);
    } else if (itemLeft + itemWidth > bodyWidth) {
      scrollBody.animate({ scrollLeft: bodyLeft + (itemLeft + itemWidth - bodyWidth) + 10 }, 200);
    }

    this._updateScrollBtn();
  };

  /**
   * 更新左右滚动按钮状态
   * @private
   */
  Tab.prototype._updateScrollBtn = function () {
    var scrollBody = $(this.options.elem).find('.hui-tab-scroll-body');
    var scrollLeft = scrollBody.scrollLeft();
    var maxScroll = scrollBody[0].scrollWidth - scrollBody.width();

    var leftBtn = $(this.options.scrollLeftBtn);
    var rightBtn = $(this.options.scrollRightBtn);

    if (scrollLeft <= 0) {
      leftBtn.hide();
    } else {
      leftBtn.show();
    }

    if (scrollLeft >= maxScroll - 1) {
      rightBtn.hide();
    } else {
      rightBtn.show();
    }
  };

  /**
   * 关闭最近最少使用的可关闭标签（LRU）
   * @private
   */
  Tab.prototype._closeLRU = function () {
    for (var i = 0; i < this._tabs.length; i++) {
      if (this._tabs[i].closeable && this._tabs[i].id !== this._currentId) {
        this.close(this._tabs[i].id);
        return;
      }
    }
  };

  /**
   * 根据 id 获取标签数据
   * @private
   */
  Tab.prototype._getTabById = function (id) {
    for (var i = 0; i < this._tabs.length; i++) {
      if (this._tabs[i].id === id) return this._tabs[i];
    }
    return null;
  };

  /**
   * 保存标签数据到 sessionStorage
   * @private
   */
  Tab.prototype._saveTabs = function () {
    // 只持久化元数据，不保存 iframe 内容状态
    var data = [];
    for (var i = 0; i < this._tabs.length; i++) {
      data.push({
        id: this._tabs[i].id,
        title: this._tabs[i].title,
        url: this._tabs[i].url,
        icon: this._tabs[i].icon,
        closeable: this._tabs[i].closeable
      });
    }
    util.setSession('tabs', data);
    util.setSession('currentTabId', this._currentId);
  };

  // ==================== 事件绑定 ====================

  /**
   * 绑定标签栏相关事件
   * @private
   */
  Tab.prototype._bindEvents = function () {
    var self = this;

    // 点击标签项 -> 切换
    $(document.body).on('click', '.hui-tab-item', function (e) {
      e.stopPropagation();
      var id = $(this).attr('data-tab-id');
      if (id && id !== self._currentId) {
        self.select(id);
      }
    });

    // 点击关闭按钮 -> 关闭标签
    $(document.body).on('click', '.hui-tab-close', function (e) {
      e.stopPropagation();
      var id = $(this).closest('.hui-tab-item').attr('data-tab-id');
      if (id) {
        self.close(id);
      }
    });

    // 点击工具菜单项
    $(document.body).on('click', '.hui-tab-tool-item', function (e) {
      e.stopPropagation();
      var action = $(this).attr('data-action');
      self._handleToolAction(action);
    });

    // 左滚动按钮
    $(document.body).on('click', this.options.scrollLeftBtn, function () {
      var scrollBody = $(self.options.elem).find('.hui-tab-scroll-body');
      scrollBody.animate({ scrollLeft: scrollBody.scrollLeft() - 200 }, 200, function () {
        self._updateScrollBtn();
      });
    });

    // 右滚动按钮
    $(document.body).on('click', this.options.scrollRightBtn, function () {
      var scrollBody = $(self.options.elem).find('.hui-tab-scroll-body');
      scrollBody.animate({ scrollLeft: scrollBody.scrollLeft() + 200 }, 200, function () {
        self._updateScrollBtn();
      });
    });

    // 监听滚动以更新按钮状态
    $(document.body).on('scroll', '.hui-tab-scroll-body', function () {
      self._updateScrollBtn();
    });

    // 右键菜单
    $(document.body).on('contextmenu', '.hui-tab-item', function (e) {
      e.preventDefault();
      e.stopPropagation();

      var id = $(this).attr('data-tab-id');
      var tab = self._getTabById(id);
      if (!tab) return;

      // 先关闭已存在的右键菜单
      $('.hui-tab-context-menu').remove();

      var menuHtml = '<ul class="hui-tab-context-menu">';
      menuHtml += '<li class="hui-tab-tool-item" data-action="refresh" data-tab-id="' + id + '">刷新当前</li>';
      if (tab.closeable) {
        menuHtml += '<li class="hui-tab-tool-item" data-action="closeCurrent" data-tab-id="' + id + '">关闭当前</li>';
      }
      menuHtml += '<li class="hui-tab-tool-item" data-action="closeOther" data-tab-id="' + id + '">关闭其他</li>';
      menuHtml += '<li class="hui-tab-tool-item" data-action="closeAll" data-tab-id="' + id + '">关闭全部</li>';
      menuHtml += '</ul>';

      var $menu = $(menuHtml);
      $menu.css({
        position: 'fixed',
        left: e.clientX + 'px',
        top: e.clientY + 'px',
        'z-index': 99999
      });

      $('body').append($menu);

      // 点击其他地方关闭右键菜单
      $(document).one('click', function () {
        $('.hui-tab-context-menu').remove();
      });

      // 右键菜单项点击
      $menu.on('click', '.hui-tab-tool-item', function (ev) {
        ev.stopPropagation();
        var action = $(this).attr('data-action');
        var targetId = $(this).attr('data-tab-id');

        // 如果操作针对的是右键的目标标签，先选中它
        if (targetId && action !== 'closeAll') {
          self.select(targetId);
        }

        self._handleToolAction(action);
        $menu.remove();
      });
    });

    // 监听窗口resize，更新滚动按钮
    $(window).on('resize', function () {
      self._updateScrollBtn();
    });

    // 初始化时更新
    setTimeout(function () {
      self._updateScrollBtn();
    }, 100);

    // 恢复上次激活的标签
    var savedCurrentId = util.getSession('currentTabId');
    if (savedCurrentId && savedCurrentId !== this._currentId) {
      var exists = false;
      for (var i = 0; i < this._tabs.length; i++) {
        if (this._tabs[i].id === savedCurrentId) {
          exists = true;
          break;
        }
      }
      if (exists) {
        this.select(savedCurrentId);
      }
    }
  };

  /**
   * 处理工具菜单操作
   * @private
   */
  Tab.prototype._handleToolAction = function (action) {
    switch (action) {
      case 'closeCurrent':
        if (this._currentId) this.close(this._currentId);
        break;
      case 'closeOther':
        this.closeOther();
        break;
      case 'closeAll':
        this.closeAll();
        break;
      case 'refresh':
        this.refresh();
        break;
      default:
        break;
    }
  };

  // ==================== 导出模块 ====================

  exports('hui-tab', Tab);
});
