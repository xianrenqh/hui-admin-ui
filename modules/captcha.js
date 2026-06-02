/**
 * huiAdmin - 验证码模块
 * 封装 Canvas 验证码的绘制逻辑和校验方法，供 login/register/forgot 页面复用
 */
layui.define([], function (exports) {
    'use strict';

    var Captcha = {
        /**
         * 字符集（去除易混淆的 0/O, 1/I/l）
         */
        chars: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',

        /**
         * 生成随机颜色（偏亮色，用于干扰线和干扰点）
         * @returns {string} rgb 颜色字符串
         */
        randomColor: function () {
            var r = Math.floor(Math.random() * 200) + 55;
            var g = Math.floor(Math.random() * 200) + 55;
            var b = Math.floor(Math.random() * 200) + 55;
            return 'rgb(' + r + ',' + g + ',' + b + ')';
        },

        /**
         * 在 Canvas 上绘制验证码
         * @param {HTMLCanvasElement} canvas - 目标 canvas 元素
         * @param {Object} [options] - 可选配置 {width, height, length, fontSize}
         * @returns {string} 生成的验证码字符串
         */
        draw: function (canvas, options) {
            var opts = options || {};
            var width = opts.width || 150;
            var height = opts.height || 44;
            var length = opts.length || 4;
            var fontSize = opts.fontSize || 26;

            var ctx = canvas.getContext('2d');
            var code = '';

            // 清空画布并填充浅灰背景
            ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = '#f0f2f5';
            ctx.fillRect(0, 0, width, height);

            // 绘制 4 条随机干扰线
            for (var i = 0; i < 4; i++) {
                ctx.strokeStyle = this.randomColor();
                ctx.beginPath();
                ctx.moveTo(Math.random() * width, Math.random() * height);
                ctx.lineTo(Math.random() * width, Math.random() * height);
                ctx.stroke();
            }

            // 绘制 20 个随机干扰点
            for (var j = 0; j < 20; j++) {
                ctx.fillStyle = this.randomColor();
                ctx.beginPath();
                ctx.arc(Math.random() * width, Math.random() * height, 1, 0, 2 * Math.PI);
                ctx.fill();
            }

            // 绘制验证码字符
            for (var k = 0; k < length; k++) {
                var ch = this.chars[Math.floor(Math.random() * this.chars.length)];
                code += ch;
                ctx.fillStyle = this.randomColor();
                ctx.font = 'bold ' + fontSize + 'px Arial';
                ctx.fillText(ch, 10 + k * 33 + Math.random() * 6, 32 + Math.random() * 6);
            }

            // 将验证码字符串存入 data 属性
            canvas.setAttribute('data-code', code);
            return code;
        },

        /**
         * 验证用户输入是否匹配验证码（不区分大小写）
         * @param {HTMLCanvasElement} canvas - 目标 canvas 元素
         * @param {string} input - 用户输入的字符串
         * @returns {boolean} 是否匹配
         */
        verify: function (canvas, input) {
            var code = canvas.getAttribute('data-code') || '';
            return input.toUpperCase() === code.toUpperCase();
        }
    };

    exports('captcha', Captcha);
});
