// 初始化事件监听
document.addEventListener('DOMContentLoaded', () => {
  // 输入框事件监听，实时更新输出
  const inputText = document.getElementById('inputText');
  
  // 添加实时预览功能
  inputText.addEventListener('input', () => {
    desensitizeText(false);
  });
  
  // 初始化时执行一次脱敏
  setTimeout(() => {
    if (inputText.value) {
      desensitizeText(false);
    }
  }, 100);
});

// 为每个数字生成一个随机替换的映射
function generateRandomDigitMap() {
  const map = {};
  for (let i = 0; i <= 9; i++) {
    let replacement;
    do {
      replacement = Math.floor(Math.random() * 10);
    } while (replacement === i); // 确保替换的数字与原数字不同
    map[i] = replacement;
  }
  return map;
}

// 脱敏文本中的数字
function desensitizeText(showAlert = false) {
  const inputText = document.getElementById('inputText').value;
  
  if (!inputText) {
    document.getElementById('outputText').value = '';
    return;
  }
  
  // 生成随机数字映射
  const digitMap = generateRandomDigitMap();
  
  // 替换所有数字
  const result = inputText.replace(/\d/g, digit => digitMap[digit]);
  
  document.getElementById('outputText').value = result;
  
  if (showAlert) {
    showNotification('脱敏完成！', 'success');
  }
}

// 复制到剪贴板
function copyToClipboard() {
  const outputText = document.getElementById('outputText');
  
  if (!outputText.value) {
    showNotification('没有可复制的内容', 'error');
    return;
  }
  
  outputText.select();
  document.execCommand('copy');
  
  // 取消选择
  window.getSelection().removeAllRanges();
  
  showNotification('已复制到剪贴板！', 'success');
}

// 显示通知
function showNotification(message, type) {
  // 移除现有通知
  const existingAlert = document.querySelector('.alert');
  if (existingAlert) {
    existingAlert.remove();
  }
  
  // 创建新通知
  const alert = document.createElement('div');
  alert.className = `alert ${type}`;
  
  const icon = document.createElement('span');
  icon.className = 'icon';
  icon.innerHTML = type === 'success'
    ? '<i class="fas fa-check-circle"></i>'
    : '<i class="fas fa-exclamation-circle"></i>';
  
  const text = document.createElement('span');
  text.textContent = message;
  
  alert.appendChild(icon);
  alert.appendChild(text);
  document.body.appendChild(alert);
  
  // 3秒后自动移除
  setTimeout(() => {
    alert.style.opacity = '0';
    setTimeout(() => {
      alert.remove();
    }, 300);
  }, 3000);
}