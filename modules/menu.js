/**
 * huiAdmin - 菜单模块
 * 负责加载菜单数据、渲染 Layui 导航树、处理菜单点击事件和面包屑导航
 */
layui.define(['element', 'hui-util', 'layer'], function (exports) {
  'use strict';

  var $ = layui.$;
  var element = layui.element;
  var util = layui['hui-util'];
  var layer = layui.layer;

  /**
   * @constructor Menu
   * @param {Object} options - 配置项
   * @param {string} options.elem - 菜单容器选择器，默认 '#hui-menu'
   * @param {string|Array} options.data - 菜单数据 URL 或数组
   * @param {boolean} options.accordion - 是否手风琴模式，默认 true
   * @param {string|number} options.defaultSelect - 默认选中菜单项 id
   * @param {Function} options.onClick - 菜单点击回调(id, title, url, icon, path)
   */
  function Menu(options) {
    this.options = $.extend({}, Menu.defaults, options);
    this._container = $(this.options.elem);
    // 存储所有菜单项的扁平映射表：{ id: menuItem }
    this._menuMap = {};
    // 默认选中的菜单项 id
    this._currentId = this.options.defaultSelect || null;
  }

  // 默认配置
  Menu.defaults = {
    elem: '#hui-menu',
    data: null,
    accordion: true,
    defaultSelect: null,
    onClick: null,
    // 面包屑根节点文本
    breadcrumbRoot: '工作空间'
  };

  // ==================== 原型方法 ====================

  /**
   * 初始化并渲染菜单
   * @param {Object} options - 合并/覆盖构造函数中的配置
   * @returns {Menu} this，支持链式调用
   */
  Menu.prototype.render = function (options) {
    var self = this;
    if (options) {
      $.extend(this.options, options);
    }

    var data = this.options.data;

    // 如果是字符串（URL），则异步加载 JSON
    if (typeof data === 'string') {
      $.ajax({
        url: data,
        dataType: 'json',
        success: function (res) {
          var menuData = res.data || res.menu || res;
          self._build(menuData);
          self._bindEvents();
          self._afterRender();
        },
        error: function () {
          console.error('huiAdmin: 菜单数据加载失败');
        }
      });
    } else if ($.isArray(data)) {
      // 数组数据直接渲染
      self._build(data);
      self._bindEvents();
      self._afterRender();
    }

    return this;
  };

  /**
   * 选中指定 id 的菜单项
   * @param {string|number} id - 菜单项 id
   */
  Menu.prototype.select = function (id) {
    var item = this._menuMap[id];
    if (!item) return;

    this._currentId = id;

    // 找到目标菜单项（li 或 dd）
    var $target = this._container.find('[data-menu-id="' + id + '"]');

    // 清除所有选中状态
    this._container.find('[data-menu-id].layui-this').removeClass('layui-this');
    this._container.find('dd[data-menu-id].layui-this').removeClass('layui-this');

    // 设置当前项选中
    if ($target.length) {
      $target.addClass('layui-this');

      // 递归展开所有父级
      var parents = $target.parents('.layui-nav-item');
      parents.each(function () {
        $(this).addClass('layui-nav-itemed');
      });
    }

    // 不触发 onClick，避免重复打开标签（由外部调用者决定是否跳转）
  };

  /**
   * 切换侧边栏折叠状态
   */
  Menu.prototype.collapse = function () {
    var layout = $('.hui-layout');
    var isCollapsed = layout.hasClass('hui-collapsed');

    if (isCollapsed) {
      layout.removeClass('hui-collapsed');
      util.setStore('sidebar_collapsed', '0');
    } else {
      layout.addClass('hui-collapsed');
      util.setStore('sidebar_collapsed', '1');
    }
  };

  // ==================== 内部方法 ====================

  /**
   * 构建导航 HTML 并渲染
   * @private
   * @param {Array} data - 菜单数据
   */
  Menu.prototype._build = function (data) {
    var self = this;
    this._menuMap = {};

    var html = '<ul class="layui-nav layui-nav-tree" lay-filter="hui-menu" lay-shrink="all">';
    html += buildItems(data);
    html += '</ul>';

    this._container.html(html);

    // 重新渲染 Layui element
    element.render('nav', 'hui-menu');

    /**
     * 递归构建菜单项 HTML
     * @param {Array} items
     * @returns {string}
     */
    function buildItems(items) {
      if (!items || !items.length) return '';

      var str = '';
      $.each(items, function (i, item) {
        var id = item.id;
        var title = item.title || item.name || '';
        var url = item.url || item.href || '';
        var icon = item.icon || '';
        var type = item.type !== undefined ? item.type : (item.children && item.children.length ? '0' : '1');
        var children = item.children || item.list || item.child || [];

        // 存入映射表
        self._menuMap[id] = {
          id: id,
          title: title,
          url: url,
          icon: icon,
          type: String(type),
          parent: item._parent || null,
          children: children
        };

        if (children && children.length) {
          // 目录节点（有子菜单）
          str += '<li class="layui-nav-item" data-menu-id="' + id + '">';
          str += '<a href="javascript:;" data-id="' + id + '" data-title="' + title + '" data-type="' + type + '" data-icon="' + icon + '">';
          if (icon) {
            str += '<i class="' + icon + ' hui-menu-icon"></i>';
          }
          str += '<span class="hui-menu-text">' + title + '</span>';
          str += '</a>';

          // 递归处理子菜单
          // 给子节点附上父节点引用
          $.each(children, function (j, child) {
            child._parent = id;
          });
          str += '<dl class="layui-nav-child">';
          str += buildChildItems(children);
          str += '</dl>';

          str += '</li>';
        } else {
          // 叶子节点
          str += '<li class="layui-nav-item" data-menu-id="' + id + '">';
          str += '<a href="javascript:;" data-id="' + id + '" data-title="' + title + '" data-url="' + (url || '') + '" data-icon="' + icon + '" data-type="' + type + '">';
          if (icon) {
            str += '<i class="' + icon + ' hui-menu-icon"></i>';
          }
          str += '<span class="hui-menu-text">' + title + '</span>';
          str += '</a>';
          str += '</li>';
        }
      });

      return str;
    }

    /**
     * 构建子菜单 HTML（子菜单用 dl/dt 结构）
     */
    function buildChildItems(items) {
      if (!items || !items.length) return '';

      var str = '';
      $.each(items, function (i, item) {
        var id = item.id;
        var title = item.title || item.name || '';
        var url = item.url || item.href || '';
        var icon = item.icon || '';
        var type = item.type !== undefined ? item.type : '1';
        var children = item.children || item.list || item.child || [];

        // 更新映射表中的数据
        var mapItem = self._menuMap[id] || {};
        mapItem.id = id;
        mapItem.title = title;
        mapItem.url = url;
        mapItem.icon = icon;
        mapItem.type = String(type);
        mapItem.children = children;
        self._menuMap[id] = mapItem;

        if (children && children.length) {
          // 子目录
          str += '<dd class="layui-nav-item" data-menu-id="' + id + '">';
          str += '<a href="javascript:;" data-id="' + id + '" data-title="' + title + '" data-type="' + type + '" data-icon="' + icon + '">';
          str += '<span class="hui-menu-text">' + title + '</span>';
          str += '</a>';
          str += '<dl class="layui-nav-child">';
          str += buildChildItems(children);
          str += '</dl>';
          str += '</dd>';
        } else {
          // 叶子节点
          str += '<dd class="layui-nav-item" data-menu-id="' + id + '">';
          str += '<a href="javascript:;" data-id="' + id + '" data-title="' + title + '" data-url="' + (url || '') + '" data-icon="' + icon + '" data-type="' + type + '">';
          str += '<span class="hui-menu-text">' + title + '</span>';
          str += '</a>';
          str += '</dd>';
        }
      });

      return str;
    }
  };

  /**
   * 绑定菜单事件
   * @private
   */
  Menu.prototype._bindEvents = function () {
    var self = this;

    // 使用 Layui element 绑定 nav 点击事件
    // 注意：nav 点击事件只能通过 Layui element.on 绑定
    element.on('nav(hui-menu)', function (elem) {
      var id = $(elem).attr('data-id');
      var title = $(elem).attr('data-title') || '';
      var url = $(elem).attr('data-url') || '';
      var icon = $(elem).attr('data-icon') || '';
      var type = $(elem).attr('data-type') || '1';

      // 如果 type 为 '0'（目录），不触发跳转
      if (type === '0') {
        // 手风琴模式：收起同级其他展开项
        if (self.options.accordion) {
          var $targetLi = $(elem).parent('.layui-nav-item');
          var $siblings = $targetLi.parent().children('.layui-nav-item');
          $siblings.not($targetLi).removeClass('layui-nav-itemed');
        }
        return;
      }

      self._currentId = id;

      // 获取面包屑路径
      var path = self._getBreadcrumb(id);

      // 触发 onClick 回调
      if (self.options.onClick) {
        self.options.onClick(id, title, url, icon, path);
      }
    });
  };

  /**
   * 渲染完成后的处理（如默认选中）
   * @private
   */
  Menu.prototype._afterRender = function () {
    var self = this;

    // 如果有默认选中项，则选中它
    if (this.options.defaultSelect && this._menuMap[this.options.defaultSelect]) {
      setTimeout(function () {
        self.select(self.options.defaultSelect);
      }, 100);
    }
  };

  /**
   * 获取面包屑路径
   * @private
   * @param {string|number} id - 菜单项 id
   * @returns {string} 如 "工作空间 / 系统管理 / 用户列表"
   */
  Menu.prototype._getBreadcrumb = function (id) {
    var item = this._menuMap[id];
    if (!item) return '';

    var pathParts = [item.title];

    // 递归获取父级菜单标题
    var parentId = item.parent;
    while (parentId && this._menuMap[parentId]) {
      var parent = this._menuMap[parentId];
      pathParts.unshift(parent.title);
      parentId = parent.parent;
    }

    // 添加面包屑根节点
    pathParts.unshift(this.options.breadcrumbRoot);

    return pathParts.join(' / ');
  };

  // ==================== 导出模块 ====================

  exports('menu', Menu);
});
