/**
 * 简单的CSS变量polyfill，用于支持iOS 14等不支持CSS变量的旧浏览器
 */
(function() {
  // 检查是否支持CSS变量
  const supportsCSSVariables = window.CSS && CSS.supports && CSS.supports('color', 'var(--test)');

  if (supportsCSSVariables) {
    return; // 如果支持，则不需要polyfill
  }

  // 获取所有样式表
  const styleSheets = Array.prototype.slice.call(document.styleSheets);

  // 存储变量定义
  const variables = {};

  // 解析CSS变量定义
  function parseVariables(cssText) {
    const variableRegex = /--([a-zA-Z0-9-_]+):\s*([^;]+);/g;
    let match;
    
    while ((match = variableRegex.exec(cssText)) !== null) {
      variables[match[1]] = match[2].trim();
    }
  }

  // 解析CSS规则并替换变量
  function processRules(rules) {
    if (!rules) return;

    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];
      
      if (rule.style) {
        // 处理样式规则
        const cssText = rule.style.cssText;
        const variableUsageRegex = /var\(--([a-zA-Z0-9-_]+)\)/g;
        let newCssText = cssText;
        let match;
        
        while ((match = variableUsageRegex.exec(cssText)) !== null) {
          const varName = match[1];
          if (variables[varName]) {
            newCssText = newCssText.replace(match[0], variables[varName]);
          }
        }
        
        if (newCssText !== cssText) {
          rule.style.cssText = newCssText;
        }
      } else if (rule.cssRules) {
        // 递归处理嵌套规则
        processRules(rule.cssRules);
      }
    }
  }

  // 初始化polyfill
  function init() {
    // 解析所有样式表中的变量
    styleSheets.forEach(styleSheet => {
      try {
        const rules = styleSheet.cssRules || styleSheet.rules;
        processRules(rules);
      } catch (e) {
        // 跨域样式表可能会抛出异常
        console.warn('无法访问样式表:', e);
      }
    });

    // 处理内联样式
    const elements = document.querySelectorAll('[style]');
    elements.forEach(element => {
      const style = element.getAttribute('style');
      if (style && style.includes('var(')) {
        const variableUsageRegex = /var\(--([a-zA-Z0-9-_]+)\)/g;
        let newStyle = style;
        let match;
        
        while ((match = variableUsageRegex.exec(style)) !== null) {
          const varName = match[1];
          if (variables[varName]) {
            newStyle = newStyle.replace(match[0], variables[varName]);
          }
        }
        
        element.setAttribute('style', newStyle);
      }
    });
  }

  // 当DOM加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // 导出变量对象，以便其他脚本可以访问
  window.cssVariablesPolyfill = {
    variables,
    init
  };
})();