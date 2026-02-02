/**
 * Reminder Module - 任务提醒模块
 * 负责检查到期任务并发送提醒通知
 */

const Reminder = (function() {
    'use strict';
    
    const CHECK_INTERVAL = 30000;
    let notificationPermission = false;
    let checkTimer = null;
    const remindedTasks = new Set();
    
    function init() {
        requestNotificationPermission();
        startChecking();
        document.addEventListener('visibilitychange', handleVisibilityChange);
        console.log('✅ Reminder module initialized');
    }
    
    async function requestNotificationPermission() {
        if (!('Notification' in window)) {
            console.log('浏览器不支持通知功能');
            return;
        }
        
        if (Notification.permission === 'granted') {
            notificationPermission = true;
        } else if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            notificationPermission = permission === 'granted';
        }
    }
    
    function handleVisibilityChange() {
        if (document.hidden) {
            stopChecking();
            checkTimer = setInterval(checkReminders, 60000);
        } else {
            stopChecking();
            checkTimer = setInterval(checkReminders, CHECK_INTERVAL);
            setTimeout(checkReminders, 1000);
        }
    }
    
    function startChecking() {
        stopChecking();
        checkTimer = setInterval(checkReminders, CHECK_INTERVAL);
        setTimeout(checkReminders, 1000);
    }
    
    function stopChecking() {
        if (checkTimer) {
            clearInterval(checkTimer);
            checkTimer = null;
        }
    }
    
    function checkReminders() {
        if (!TodoManager) {
            console.warn('TodoManager not available');
            return;
        }
        
        const now = Date.now();
        const todos = TodoManager.getAll();
        
        const reminders = todos.filter(todo => {
            if (todo.status !== 'active') return false;
            if (!todo.dueDate || !todo.reminder || todo.reminder <= 0) return false;
            
            const reminderAt = todo.dueDate - todo.reminder;
            if (now < reminderAt || now > todo.dueDate) return false;
            if (todo.reminded) return false;
            
            return true;
        });
        
        reminders.forEach(todo => {
            sendReminder(todo);
        });
    }
    
    function sendReminder(todo) {
        TodoManager.update(todo.id, { reminded: true });
        remindedTasks.add(todo.id);
        
        const now = Date.now();
        const timeLeft = todo.dueDate - now;
        const timeLeftText = formatTimeLeft(timeLeft);
        
        if (notificationPermission) {
            sendBrowserNotification(todo, timeLeftText);
        }
        
        showInAppNotification(todo, timeLeftText);
        console.log(`🔔 Reminder sent for task: ${todo.title}`);
    }
    
    function sendBrowserNotification(todo, timeLeftText) {
        const notification = new Notification('任务提醒', {
            body: `「${todo.title}」即将到期！\n${timeLeftText}`,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: todo.id,
            requireInteraction: true
        });
        
        notification.onclick = function() {
            window.focus();
            UI.openDetail(todo.id);
            notification.close();
        };
    }
    
    function showInAppNotification(todo, timeLeftText) {
        const notification = document.createElement('div');
        notification.className = 'reminder-notification';
        notification.innerHTML = `
            <div class="reminder-content">
                <div class="reminder-icon">⏰</div>
                <div class="reminder-text">
                    <div class="reminder-title">任务提醒</div>
                    <div class="reminder-task">${escapeHtml(todo.title)}</div>
                    <div class="reminder-time">${timeLeftText}</div>
                </div>
                <div class="reminder-actions">
                    <button class="reminder-btn view" data-id="${todo.id}">查看</button>
                    <button class="reminder-btn complete" data-id="${todo.id}">完成</button>
                    <button class="reminder-btn close">×</button>
                </div>
            </div>
        `;
        
        notification.querySelector('.view').addEventListener('click', () => {
            UI.openDetail(todo.id);
            notification.remove();
        });
        
        notification.querySelector('.complete').addEventListener('click', async () => {
            await TodoManager.complete(todo.id);
            UI.showToast('任务已标记为完成', 'success');
            notification.remove();
        });
        
        notification.querySelector('.close').addEventListener('click', () => {
            notification.remove();
        });
        
        document.body.appendChild(notification);
        
        requestAnimationFrame(() => {
            notification.classList.add('active');
        });
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.classList.remove('active');
                setTimeout(() => notification.remove(), 300);
            }
        }, 10000);
    }
    
    function formatTimeLeft(ms) {
        if (ms <= 0) return '已逾期';
        
        const minutes = Math.floor(ms / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) {
            return `还剩 ${days} 天 ${hours % 24} 小时`;
        } else if (hours > 0) {
            return `还剩 ${hours} 小时 ${minutes % 60} 分钟`;
        } else if (minutes > 0) {
            return `还剩 ${minutes} 分钟`;
        } else {
            return '即将到期';
        }
    }
    
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    return {
        init,
        startChecking,
        stopChecking,
        get remindedTasks() { return Array.from(remindedTasks); }
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Reminder;
}
