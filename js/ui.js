/**
 * UI Module - 界面渲染引擎
 * 负责所有 DOM 操作和界面更新
 */

const UI = (function() {
    'use strict';
    
    // DOM 元素缓存
    const elements = {};
    
    // 当前状态
    let currentView = 'tiles';
    let currentFilter = 'all';
    let selectedTodos = new Set();
    let isMultiSelectMode = false;
    
    // 初始化 DOM 引用
    function initElements() {
        elements.app = document.getElementById('app');
        elements.tileGrid = document.getElementById('tileGrid');
        elements.matrixView = document.getElementById('matrixView');
        elements.calendarView = document.getElementById('calendarView');
        elements.mainContent = document.getElementById('mainContent');
        elements.todoModal = document.getElementById('todoModal');
        elements.todoForm = document.getElementById('todoForm');
        elements.detailPanel = document.getElementById('detailPanel');
        elements.searchInput = document.getElementById('searchInput');
        elements.fabAdd = document.getElementById('fabAdd');
        
        // 计数元素
        elements.countAll = document.getElementById('countAll');
        elements.countWork = document.getElementById('countWork');
        elements.countPersonal = document.getElementById('countPersonal');
        elements.countUrgent = document.getElementById('countUrgent');
        elements.countCompleted = document.getElementById('countCompleted');
        
        // 四象限容器
        elements.q1Tiles = document.getElementById('q1Tiles');
        elements.q2Tiles = document.getElementById('q2Tiles');
        elements.q3Tiles = document.getElementById('q3Tiles');
        elements.q4Tiles = document.getElementById('q4Tiles');
        
        // 日历元素
        elements.calendarGrid = document.getElementById('calendarGrid');
        elements.currentMonth = document.getElementById('currentMonth');
        elements.prevMonth = document.getElementById('prevMonth');
        elements.nextMonth = document.getElementById('nextMonth');
    }
    
    // 格式化日期
    function formatDate(timestamp) {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleDateString('zh-CN', {
            month: 'short',
            day: 'numeric'
        });
    }
    
    // 格式化日期时间
    function formatDateTime(timestamp) {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleString('zh-CN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    // 获取分类显示名称
    function getCategoryLabel(category) {
        const labels = {
            work: '工作',
            personal: '个人',
            urgent: '紧急',
            later: '稍后'
        };
        return labels[category] || category;
    }
    
    // 获取优先级标签
    function getPriorityLabel(priority) {
        const labels = {
            1: '紧急重要',
            2: '重要',
            3: '紧急',
            4: '普通'
        };
        return labels[priority] || '普通';
    }
    
    // 创建任务磁贴 HTML
    function createTileHTML(todo) {
        const isCompleted = todo.status === 'completed';
        const isSelected = selectedTodos.has(todo.id);
        const colorClass = `tile-${todo.colorTheme}`;
        const completedClass = isCompleted ? 'tile-completed' : '';
        const selectedClass = isSelected ? 'tile-selected' : '';
        
        // 根据内容长度决定磁贴大小
        let sizeClass = 'tile-medium';
        if (todo.description && todo.description.length > 50) {
            sizeClass = 'tile-wide';
        }
        if (todo.tags.length > 0) {
            sizeClass = 'tile-medium';
        }
        
        return `
            <div class="tile ${sizeClass} ${colorClass} ${completedClass} ${selectedClass}" 
                 data-id="${todo.id}" 
                 data-category="${todo.category}"
                 data-priority="${todo.priority}"
                 data-status="${todo.status}">
                <div class="tile-header">
                    <span class="tile-category">${getCategoryLabel(todo.category)}</span>
                    ${!isCompleted ? `<span class="tile-priority" title="优先级: ${getPriorityLabel(todo.priority)}"></span>` : ''}
                </div>
                <h3 class="tile-title">${escapeHtml(todo.title)}</h3>
                ${todo.description ? `<p class="tile-desc">${escapeHtml(todo.description)}</p>` : ''}
                <div class="tile-footer">
                    ${todo.dueDate ? `<span class="tile-date">${formatDate(todo.dueDate)}</span>` : '<span></span>'}
                    ${todo.tags.length > 0 ? `<div class="tile-tags">${todo.tags.map(tag => `<span class="tile-tag">${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
                </div>
                ${isMultiSelectMode ? `<div class="tile-checkbox"><input type="checkbox" ${isSelected ? 'checked' : ''}></div>` : ''}
            </div>
        `;
    }
    
    // HTML 转义
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // 渲染磁贴墙
    function renderTileWall(todos) {
        if (todos.length === 0) {
            elements.tileGrid.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="12" y1="8" x2="12" y2="16"></line>
                        <line x1="8" y1="12" x2="16" y2="12"></line>
                    </svg>
                    <p class="empty-state-text">暂无任务，点击 + 添加</p>
                </div>
            `;
            return;
        }
        
        elements.tileGrid.innerHTML = todos.map(todo => createTileHTML(todo)).join('');
        
        // 绑定磁贴事件
        bindTileEvents();
    }
    
    // 绑定磁贴事件
    function bindTileEvents() {
        const tiles = elements.tileGrid.querySelectorAll('.tile');
        
        tiles.forEach(tile => {
            // 点击打开详情
            tile.addEventListener('click', (e) => {
                if (isMultiSelectMode) {
                    toggleSelection(tile.dataset.id);
                } else {
                    openDetail(tile.dataset.id);
                }
            });
            
            // 长按进入多选模式
            let longPressTimer;
            tile.addEventListener('touchstart', () => {
                longPressTimer = setTimeout(() => {
                    if (!isMultiSelectMode) {
                        enableMultiSelect();
                        toggleSelection(tile.dataset.id);
                    }
                }, 500);
            });
            
            tile.addEventListener('touchend', () => {
                clearTimeout(longPressTimer);
            });
            
            tile.addEventListener('touchmove', () => {
                clearTimeout(longPressTimer);
            });
        });
    }
    
    // 切换选中状态
    function toggleSelection(id) {
        if (selectedTodos.has(id)) {
            selectedTodos.delete(id);
        } else {
            selectedTodos.add(id);
        }
        
        const tile = elements.tileGrid.querySelector(`[data-id="${id}"]`);
        if (tile) {
            tile.classList.toggle('tile-selected');
        }
    }
    
    // 启用多选模式
    function enableMultiSelect() {
        isMultiSelectMode = true;
        elements.app.classList.add('multi-select-mode');
        
        // 显示多选工具栏
        showMultiSelectToolbar();
    }
    
    // 禁用多选模式
    function disableMultiSelect() {
        isMultiSelectMode = false;
        selectedTodos.clear();
        elements.app.classList.remove('multi-select-mode');
        hideMultiSelectToolbar();
        refresh();
    }
    
    // 显示多选工具栏
    function showMultiSelectToolbar() {
        // 动态创建工具栏
        let toolbar = document.getElementById('multiSelectToolbar');
        if (!toolbar) {
            toolbar = document.createElement('div');
            toolbar.id = 'multiSelectToolbar';
            toolbar.className = 'multi-select-toolbar';
            toolbar.innerHTML = `
                <span class="select-count">已选 0 项</span>
                <div class="select-actions">
                    <button class="btn-select-all">全选</button>
                    <button class="btn-complete">完成</button>
                    <button class="btn-delete">删除</button>
                    <button class="btn-cancel">取消</button>
                </div>
            `;
            elements.app.appendChild(toolbar);
            
            // 绑定事件
            toolbar.querySelector('.btn-select-all').addEventListener('click', selectAll);
            toolbar.querySelector('.btn-complete').addEventListener('click', completeSelected);
            toolbar.querySelector('.btn-delete').addEventListener('click', deleteSelected);
            toolbar.querySelector('.btn-cancel').addEventListener('click', disableMultiSelect);
        }
        
        toolbar.classList.add('active');
        updateSelectCount();
    }
    
    // 隐藏多选工具栏
    function hideMultiSelectToolbar() {
        const toolbar = document.getElementById('multiSelectToolbar');
        if (toolbar) {
            toolbar.classList.remove('active');
        }
    }
    
    // 更新选中计数
    function updateSelectCount() {
        const toolbar = document.getElementById('multiSelectToolbar');
        if (toolbar) {
            toolbar.querySelector('.select-count').textContent = `已选 ${selectedTodos.size} 项`;
        }
    }
    
    // 全选
    function selectAll() {
        const todos = TodoManager.getAll();
        todos.forEach(todo => selectedTodos.add(todo.id));
        refresh();
        updateSelectCount();
    }
    
    // 完成选中项
    async function completeSelected() {
        if (selectedTodos.size === 0) return;
        await TodoManager.batchComplete(Array.from(selectedTodos));
        disableMultiSelect();
    }
    
    // 删除选中项
    async function deleteSelected() {
        if (selectedTodos.size === 0) return;
        if (!confirm(`确定要删除选中的 ${selectedTodos.size} 个任务吗？`)) return;
        await TodoManager.batchDelete(Array.from(selectedTodos));
        disableMultiSelect();
    }
    
    // 渲染四象限视图
    function renderMatrix(matrix) {
        elements.q1Tiles.innerHTML = matrix.q1.map(todo => createMiniTile(todo)).join('');
        elements.q2Tiles.innerHTML = matrix.q2.map(todo => createMiniTile(todo)).join('');
        elements.q3Tiles.innerHTML = matrix.q3.map(todo => createMiniTile(todo)).join('');
        elements.q4Tiles.innerHTML = matrix.q4.map(todo => createMiniTile(todo)).join('');
        
        // 绑定迷你磁贴事件
        document.querySelectorAll('.quadrant-tiles .tile').forEach(tile => {
            tile.addEventListener('click', () => openDetail(tile.dataset.id));
        });
    }
    
    // 创建迷你磁贴（用于四象限）
    function createMiniTile(todo) {
        const colorClass = `tile-${todo.colorTheme}`;
        return `
            <div class="tile tile-small ${colorClass}" data-id="${todo.id}">
                <h4 class="tile-title">${escapeHtml(todo.title)}</h4>
            </div>
        `;
    }
    
    // 渲染日历
    function renderCalendar(year, month, todos) {
        elements.currentMonth.textContent = `${year}年${month + 1}月`;
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startDayOfWeek = firstDay.getDay();
        
        let html = '';
        
        // 星期标题
        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
        weekdays.forEach(day => {
            html += `<div class="calendar-weekday">${day}</div>`;
        });
        
        // 上月填充
        const prevMonthDays = new Date(year, month, 0).getDate();
        for (let i = startDayOfWeek - 1; i >= 0; i--) {
            html += `<div class="calendar-day other-month"><span class="calendar-day-number">${prevMonthDays - i}</span></div>`;
        }
        
        // 当月
        const today = new Date();
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const isToday = date.toDateString() === today.toDateString();
            const dayStart = date.setHours(0, 0, 0, 0);
            const dayEnd = date.setHours(23, 59, 59, 999);
            
            const dayTodos = todos.filter(t => t.dueDate >= dayStart && t.dueDate <= dayEnd);
            
            html += `
                <div class="calendar-day ${isToday ? 'today' : ''}" data-date="${date.toISOString().split('T')[0]}">
                    <span class="calendar-day-number">${day}</span>
                    <div class="calendar-day-tasks">
                        ${dayTodos.map(t => `<div class="calendar-task-dot ${t.colorTheme}"></div>`).join('')}
                    </div>
                </div>
            `;
        }
        
        // 下月填充
        const remainingCells = (7 - ((startDayOfWeek + daysInMonth) % 7)) % 7;
        for (let day = 1; day <= remainingCells; day++) {
            html += `<div class="calendar-day other-month"><span class="calendar-day-number">${day}</span></div>`;
        }
        
        elements.calendarGrid.innerHTML = html;
        
        // 绑定日历点击事件
        elements.calendarGrid.querySelectorAll('.calendar-day:not(.other-month)').forEach(day => {
            day.addEventListener('click', () => {
                const date = day.dataset.date;
                filterByDate(date);
            });
        });
    }
    
    // 按日期筛选
    function filterByDate(dateStr) {
        const date = new Date(dateStr);
        const start = date.setHours(0, 0, 0, 0);
        const end = date.setHours(23, 59, 59, 999);
        
        const filtered = TodoManager.filter({
            status: 'active',
            dueAfter: start,
            dueBefore: end
        });
        
        switchView('tiles');
        renderTileWall(filtered);
    }
    
    // 更新统计计数
    function updateStats(stats) {
        elements.countAll.textContent = stats.byCategory.all;
        elements.countWork.textContent = stats.byCategory.work;
        elements.countPersonal.textContent = stats.byCategory.personal;
        elements.countUrgent.textContent = stats.byCategory.urgent;
        elements.countCompleted.textContent = stats.completed;
    }
    
    // 切换视图
    function switchView(view) {
        currentView = view;
        
        // 更新按钮状态
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        
        // 显示/隐藏视图
        elements.mainContent.style.display = view === 'tiles' ? 'block' : 'none';
        elements.matrixView.style.display = view === 'matrix' ? 'block' : 'none';
        elements.calendarView.style.display = view === 'calendar' ? 'block' : 'none';
        
        // 渲染对应视图
        if (view === 'matrix') {
            renderMatrix(TodoManager.getMatrix());
        } else if (view === 'calendar') {
            const now = new Date();
            renderCalendar(now.getFullYear(), now.getMonth(), TodoManager.getCalendarData(now.getFullYear(), now.getMonth()));
        } else {
            refresh();
        }
    }
    
    // 筛选任务
    function filterTodos(filter) {
        currentFilter = filter;
        
        // 更新筛选按钮状态
        document.querySelectorAll('.filter-tile').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        
        refresh();
    }
    
    // 搜索任务
    function searchTodos(keyword) {
        if (!keyword.trim()) {
            refresh();
            return;
        }
        
        const results = TodoManager.filter({
            search: keyword,
            status: currentFilter === 'completed' ? 'completed' : 'active'
        });
        
        renderTileWall(results);
    }
    
    // 打开添加/编辑模态框
    function openModal(todo = null) {
        const isEdit = !!todo;
        const modal = elements.todoModal;
        const title = modal.querySelector('.modal-title');
        
        title.textContent = isEdit ? '编辑任务' : '新任务';
        
        if (isEdit) {
            document.getElementById('todoId').value = todo.id;
            document.getElementById('todoTitle').value = todo.title;
            document.getElementById('todoDesc').value = todo.description;
            document.getElementById('todoDue').value = todo.dueDate ? new Date(todo.dueDate).toISOString().slice(0, 16) : '';
            document.getElementById('todoTags').value = todo.tags.join(', ');
            
            // 设置分类
            document.querySelectorAll('.cat-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.cat === todo.category);
            });
            
            // 设置优先级
            document.querySelectorAll('.pri-btn').forEach(btn => {
                btn.classList.toggle('active', parseInt(btn.dataset.priority) === todo.priority);
            });
        } else {
            elements.todoForm.reset();
            document.getElementById('todoId').value = '';
            
            // 默认选中第一个
            document.querySelector('.cat-btn')?.classList.add('active');
            document.querySelector('.pri-btn')?.classList.add('active');
        }
        
        modal.classList.add('active');
        document.getElementById('todoTitle').focus();
    }
    
    // 关闭模态框
    function closeModal() {
        elements.todoModal.classList.remove('active');
    }
    
    // 打开详情面板
    function openDetail(id) {
        const todo = TodoManager.getById(id);
        if (!todo) return;
        
        document.getElementById('detailCategory').textContent = getCategoryLabel(todo.category);
        document.getElementById('detailCategory').dataset.color = todo.colorTheme;
        document.getElementById('detailDate').textContent = formatDateTime(todo.createdAt);
        document.getElementById('detailTitle').textContent = todo.title;
        document.getElementById('detailDesc').textContent = todo.description || '暂无描述';
        document.getElementById('detailPriority').textContent = `优先级：${getPriorityLabel(todo.priority)}`;
        
        const tagsContainer = document.getElementById('detailTags');
        tagsContainer.innerHTML = todo.tags.length > 0 
            ? todo.tags.map(tag => `<span class="detail-tag">${escapeHtml(tag)}</span>`).join('')
            : '<span class="detail-tag">无标签</span>';
        
        // 存储当前任务 ID
        elements.detailPanel.dataset.currentId = id;
        
        elements.detailPanel.classList.add('active');
    }
    
    // 关闭详情面板
    function closeDetail() {
        elements.detailPanel.classList.remove('active');
        delete elements.detailPanel.dataset.currentId;
    }
    
    // 刷新当前视图
    function refresh() {
        let todos;
        
        if (currentFilter === 'all') {
            todos = TodoManager.filter({ status: 'active' });
        } else if (currentFilter === 'completed') {
            todos = TodoManager.filter({ status: 'completed' });
        } else {
            todos = TodoManager.filter({ 
                status: currentFilter === 'completed' ? 'completed' : 'active',
                category: currentFilter 
            });
        }
        
        if (currentView === 'tiles') {
            renderTileWall(todos);
        }
        
        updateStats(TodoManager.getStats());
    }
    
    // 显示提示消息
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        // 动画进入
        requestAnimationFrame(() => {
            toast.classList.add('active');
        });
        
        // 自动消失
        setTimeout(() => {
            toast.classList.remove('active');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    // Trello风格看板拖拽初始化
    function initBoardDragDrop() {
        const dropZones = ['q1Tiles', 'q2Tiles', 'q3Tiles', 'q4Tiles'];
        
        dropZones.forEach(zoneId => {
            const zone = document.getElementById(zoneId);
            if (zone) {
                zone.addEventListener('dragover', handleBoardDragOver);
                zone.addEventListener('drop', handleBoardDrop);
                zone.addEventListener('dragenter', handleBoardDragEnter);
                zone.addEventListener('dragleave', handleBoardDragLeave);
            }
        });
    }
    
    function handleBoardDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }
    
    function handleBoardDragEnter(e) {
        const zone = e.target.closest('.quadrant-tiles');
        if (zone) {
            zone.parentElement.classList.add('drop-target');
        }
    }
    
    function handleBoardDragLeave(e) {
        const zone = e.target.closest('.quadrant-tiles');
        if (zone && !zone.contains(e.relatedTarget)) {
            zone.parentElement.classList.remove('drop-target');
        }
    }
    
    async function handleBoardDrop(e) {
        e.preventDefault();
        
        const todoId = e.dataTransfer.getData('text/plain');
        if (!todoId) return;
        
        const zone = e.target.closest('.quadrant-tiles');
        if (!zone) return;
        
        zone.parentElement.classList.remove('drop-target');
        
        const quadrant = zone.parentElement.dataset.quadrant;
        const priorityMap = {
            '1': 1,
            '2': 2,
            '3': 3,
            '4': 4
        };
        
        const newPriority = priorityMap[quadrant];
        if (!newPriority) return;
        
        try {
            await TodoManager.update(todoId, { priority: newPriority });
            
            // 重新渲染矩阵视图
            renderMatrix(TodoManager.getMatrix());
            
            const priorityLabels = {
                1: '重要且紧急',
                2: '重要不紧急',
                3: '不重要紧急',
                4: '不重要不紧急'
            };
            
            showToast(`任务已移动到「${priorityLabels[newPriority]}」`, 'success');
        } catch (error) {
            console.error('Board drop error:', error);
            showToast('移动任务失败', 'error');
        }
    }
    
    // 公共 API
    return {
        init() {
            initElements();
            bindEvents();
        },
        
        refresh,
        switchView,
        filterTodos,
        searchTodos,
        openModal,
        closeModal,
        openDetail,
        closeDetail,
        showToast,
        updateStats,
        
        // 多选模式
        enableMultiSelect,
        disableMultiSelect,
        
        get currentView() { return currentView; },
        get currentFilter() { return currentFilter; },
        get isMultiSelectMode() { return isMultiSelectMode; },
        
        initBoardDragDrop
    };
    
    // 绑定全局事件
    function bindEvents() {
        // 视图切换
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', () => switchView(btn.dataset.view));
        });
        
        // 筛选
        document.querySelectorAll('.filter-tile').forEach(btn => {
            btn.addEventListener('click', () => filterTodos(btn.dataset.filter));
        });
        
        // 搜索
        elements.searchInput.addEventListener('input', (e) => {
            searchTodos(e.target.value);
        });
        
        // FAB 添加按钮
        elements.fabAdd.addEventListener('click', () => openModal());
        
        // 模态框关闭
        document.getElementById('modalClose').addEventListener('click', closeModal);
        document.getElementById('btnCancel').addEventListener('click', closeModal);
        elements.todoModal.querySelector('.modal-overlay').addEventListener('click', closeModal);
        
        // 表单提交
        elements.todoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const id = document.getElementById('todoId').value;
            const data = {
                title: document.getElementById('todoTitle').value,
                description: document.getElementById('todoDesc').value,
                dueDate: document.getElementById('todoDue').value ? new Date(document.getElementById('todoDue').value).getTime() : null,
                tags: document.getElementById('todoTags').value,
                category: document.querySelector('.cat-btn.active')?.dataset.cat || 'work',
                priority: parseInt(document.querySelector('.pri-btn.active')?.dataset.priority) || 4
            };
            
            try {
                if (id) {
                    await TodoManager.update(id, data);
                    showToast('任务已更新', 'success');
                } else {
                    await TodoManager.create(data);
                    showToast('任务已创建', 'success');
                }
                closeModal();
            } catch (error) {
                showToast(error.message, 'error');
            }
        });
        
        // 分类选择
        document.querySelectorAll('.cat-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
        
        // 优先级选择
        document.querySelectorAll('.pri-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.pri-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
        
        // 详情面板关闭
        document.getElementById('detailClose').addEventListener('click', closeDetail);
        
        // 详情操作按钮
        document.getElementById('btnDetailComplete').addEventListener('click', async () => {
            const id = elements.detailPanel.dataset.currentId;
            if (id) {
                await TodoManager.toggleComplete(id);
                closeDetail();
            }
        });
        
        document.getElementById('btnDetailEdit').addEventListener('click', () => {
            const id = elements.detailPanel.dataset.currentId;
            if (id) {
                const todo = TodoManager.getById(id);
                closeDetail();
                openModal(todo);
            }
        });
        
        document.getElementById('btnDetailDelete').addEventListener('click', async () => {
            const id = elements.detailPanel.dataset.currentId;
            if (id && confirm('确定要删除这个任务吗？')) {
                await TodoManager.delete(id);
                closeDetail();
            }
        });
        
        // 日历导航
        let currentCalendarDate = new Date();
        elements.prevMonth?.addEventListener('click', () => {
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
            renderCalendar(
                currentCalendarDate.getFullYear(), 
                currentCalendarDate.getMonth(),
                TodoManager.getCalendarData(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth())
            );
        });
        
        elements.nextMonth?.addEventListener('click', () => {
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
            renderCalendar(
                currentCalendarDate.getFullYear(), 
                currentCalendarDate.getMonth(),
                TodoManager.getCalendarData(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth())
            );
        });
        
        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (elements.todoModal.classList.contains('active')) {
                    closeModal();
                } else if (elements.detailPanel.classList.contains('active')) {
                    closeDetail();
                }
            }
            
            if (e.key === 'n' && e.ctrlKey) {
                e.preventDefault();
                openModal();
            }
            
            if (e.key === '/' && !e.ctrlKey) {
                e.preventDefault();
                elements.searchInput.focus();
            }
        });
    }
})();

// 兼容旧浏览器
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UI;
}
