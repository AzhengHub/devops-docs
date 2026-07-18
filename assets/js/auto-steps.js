/**
 * 自动识别 AI 对话（Gemini / ChatGPT 等）复制出来的"步骤列表"Markdown，
 * 渲染为圆圈数字 + 垂直虚线的步骤条（样式见 _styles_project.scss 的 .steps）。
 *
 * 识别模式：有序列表项以 "**标题:** 副标题" 开头（标题加粗且以半角/全角冒号结尾）。
 * 这类粘贴内容的代码块通常没有缩进，会把列表切断成多个 <ol start="N">，
 * 中间夹着 <pre>/<p> 等兄弟节点 —— 本脚本把它们重新归组：
 * 每个 li 开启一个步骤，其后的兄弟节点归入该步骤正文，直到下一个步骤列表；
 * 遇到标题（h1-h6）或分隔线（hr / ---）则结束整组。
 * 全组步骤数少于 2 时不转换，避免误伤普通列表。
 */
(function () {
  'use strict';

  function firstMeaningful(el) {
    var n = el.firstChild;
    while (n && n.nodeType === 3 && !n.textContent.trim()) n = n.nextSibling;
    return n;
  }

  // li 需以 <strong>…:</strong> 开头（紧凑列表直接在 li 下，宽松列表包一层 <p>）
  function findStrong(li) {
    if (li.tagName !== 'LI') return null;
    var scope = li;
    var first = firstMeaningful(li);
    if (first && first.nodeType === 1 && first.tagName === 'P') {
      scope = first;
      first = firstMeaningful(scope);
    }
    if (!first || first.nodeType !== 1 || first.tagName !== 'STRONG') return null;
    if (!/[:：]\s*$/.test(first.textContent)) return null;
    return { scope: scope, strong: first };
  }

  function isStepList(el) {
    if (!el || el.tagName !== 'OL') return false;
    var lis = el.children;
    if (!lis.length) return false;
    for (var i = 0; i < lis.length; i++) {
      if (!findStrong(lis[i])) return false;
    }
    return true;
  }

  function isTerminator(el) {
    return /^(H[1-6]|HR|HEADER|FOOTER|SECTION|NAV)$/.test(el.tagName) ||
      /(^|\s)td-/.test(el.className || '');
  }

  function trimTrailingPunct(el) {
    var last = el.lastChild;
    if (last && last.nodeType === 3) {
      last.textContent = last.textContent.replace(/[.。]\s*$/, '');
      if (!last.textContent) el.removeChild(last);
    }
  }

  // 把一个 li 拆成步骤：标题 = 开头的 strong；副标题 = strong 之后到首个换行
  // 之前的内容；换行之后的懒惰续行文本连同 li 内其余块级元素归入正文。
  function buildStep(li) {
    var hit = findStrong(li);
    var scope = hit.scope;
    var strong = hit.strong;

    var root = document.createElement('div');
    root.className = 'steps-step';

    var title = document.createElement('div');
    title.className = 'steps-step__title';
    title.innerHTML = strong.innerHTML.replace(/[:：]\s*$/, '');
    root.appendChild(title);

    var subtitle = document.createElement('div');
    subtitle.className = 'steps-step__subtitle';
    var content = document.createElement('div');
    content.className = 'steps-step__content';

    var restP = null;
    var node = strong.nextSibling;
    while (node) {
      var next = node.nextSibling;
      if (node.nodeType === 3 && node.textContent.indexOf('\n') !== -1) {
        var text = node.textContent;
        var cut = text.indexOf('\n');
        if (text.slice(0, cut).trim()) {
          subtitle.appendChild(document.createTextNode(text.slice(0, cut)));
        }
        restP = document.createElement('p');
        var after = text.slice(cut + 1);
        if (after.trim()) restP.appendChild(document.createTextNode(after));
        while (next) {
          var n2 = next.nextSibling;
          restP.appendChild(next);
          next = n2;
        }
        break;
      }
      subtitle.appendChild(node); // 从原位置移入副标题
      node = next;
    }
    trimTrailingPunct(subtitle);
    if (subtitle.textContent.trim()) root.appendChild(subtitle);
    root.appendChild(content);

    if (restP && (restP.textContent.trim() || restP.firstElementChild)) {
      content.appendChild(restP);
    }
    // 缩进写法：li 内首段之后的其余块级内容也归入正文
    if (scope !== li) {
      var sib = scope.nextSibling;
      while (sib) {
        var s2 = sib.nextSibling;
        content.appendChild(sib);
        sib = s2;
      }
    }
    return { root: root, content: content };
  }

  function transform(container) {
    var i = 0;
    while (i < container.children.length) {
      var el = container.children[i];
      if (!isStepList(el)) { i++; continue; }

      // 收集一组：连续的步骤列表 + 夹在中间的兄弟内容
      var members = [];
      var stepCount = 0;
      var j = i;
      while (j < container.children.length) {
        var n = container.children[j];
        if (isStepList(n)) {
          // 编号回到 1（<ol> 无 start 属性）说明是新的一组步骤：
          // 结束当前组，让编号从 ① 重新开始
          var start = parseInt(n.getAttribute('start') || '1', 10);
          if (stepCount > 0 && start <= 1) break;
          members.push({ ol: n });
          stepCount += n.children.length;
          j++;
        } else if (isTerminator(n)) {
          break;
        } else {
          members.push({ el: n });
          j++;
        }
      }
      if (stepCount < 2) { i = j; continue; }

      var wrap = document.createElement('div');
      wrap.className = 'steps';
      var current = null;
      members.forEach(function (m) {
        if (m.ol) {
          Array.prototype.slice.call(m.ol.children).forEach(function (li) {
            current = buildStep(li);
            wrap.appendChild(current.root);
          });
        } else if (current) {
          current.content.appendChild(m.el);
        }
      });
      container.insertBefore(wrap, el);
      members.forEach(function (m) { if (m.ol) m.ol.remove(); });

      // 紧跟其后的 <hr>（Markdown 里的 ---）仅用作"步骤结束"标记，移除不显示
      var after = wrap.nextElementSibling;
      if (after && after.tagName === 'HR') after.remove();

      i = Array.prototype.indexOf.call(container.children, wrap) + 1;
    }
  }

  function run() {
    document.querySelectorAll('.td-content').forEach(transform);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
