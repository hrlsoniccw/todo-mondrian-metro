/**
 * Gestures Module - 触摸手势处理
 * 实现滑动完成、滑动删除、拖拽排序等交互
 */

const Gestures = (function() {
    'use strict';
    
    let touchStartX = 0;
    let touchStartY = 0;
    let touchCurrentX = 0;
    let isDragging = false;
    let currentTile = null;
    let startTime = 0;
    
    // 配置
    const config = {
        swipeThreshold: 80,
        swipeVelocity: 0.5,
        longPressDuration: 500,
        maxVerticalDrift: 50
    };
    
    // 初始化
    function init() {
        const tileGrid = document.getElementById('tileGrid');
        if (!tileGrid) return;
        
        // 触摸事件
        tileGrid.addEventListener('touchstart', handleTouchStart, { passive: true });
        tileGrid.addEventListener('touchmove', handleTouchMove, { passive: false });
        tileGrid.addEventListener('touchend', handleTouchEnd);
        tileGrid.addEventListener('touchcancel', handleTouchCancel);
        
        // 鼠标事件
        tileGrid.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        
        // 初始化拖拽排序
        initDragAndDrop();
        
        console.log('Gestures: Initialized with drag & drop');
    }
    
    // 获取触摸坐标
    function getTouchCoords(e) {
        if (e.touches && e.touches.length > 0) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    }
    
    // 查找磁贴元素
    function findTileElement(target) {
        let element = target;
        while (element && !element.classList.contains('tile')) {
            element = element.parentElement;
        }
        return element;
    }
    
    // 触摸事件处理
    function handleTouchStart(e) {
        const coords = getTouchCoords(e);
        touchStartX = coords.x;
        touchStartY = coords.y;
        touchCurrentX = coords.x;
        startTime = Date.now();
        
        currentTile = findTileElement(e.target);
        
        if (currentTile) {
            currentTile.style.transition = 'none';
            currentTile.style.transform = 'scale(0.98)';
            
            currentTile.longPressTimer = setTimeout(() => {
                if (currentTile) {
                    currentTile.classList.add('long-pressing');
                }
            }, config.longPressDuration);
        }
    }
    
    function handleTouchMove(e) {
        if (!currentTile) return;
        
        const coords = getTouchCoords(e);
        touchCurrentX = coords.x;
        
        const deltaX = touchCurrentX - touchStartX;
        const deltaY = coords.y - touchStartY;
        
        if (Math.abs(deltaY) > config.maxVerticalDrift) {
            resetTile(currentTile);
            return;
        }
        
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
            e.preventDefault();
        }
        
        if (currentTile.longPressTimer) {
            clearTimeout(currentTile.longPressTimer);
            currentTile.longPressTimer = null;
        }
        
        if (Math.abs(deltaX) > 10) {
            isDragging = true;
            currentTile.style.transform = `translateX(${deltaX}px) scale(0.98)`;
            
            if (deltaX > 0) {
                showSwipeFeedback(currentTile, 'delete', Math.min(deltaX / config.swipeThreshold, 1));
            } else {
                showSwipeFeedback(currentTile, 'complete', Math.min(Math.abs(deltaX) / config.swipeThreshold, 1));
            }
        }
    }
    
    function handleTouchEnd(e) {
        if (!currentTile) return;
        
        const deltaX = touchCurrentX - touchStartX;
        const deltaTime = Date.now() - startTime;
        const velocity = Math.abs(deltaX) / deltaTime;
        
        if (currentTile.longPressTimer) {
            clearTimeout(currentTile.longPressTimer);
            currentTile.longPressTimer = null;
        }
        
        if (Math.abs(deltaX) > config.swipeThreshold || velocity > config.swipeVelocity) {
            if (deltaX > 0) {
                handleSwipeRight(currentTile);
            } else {
                handleSwipeLeft(currentTile);
            }
        } else {
            resetTile(currentTile);
        }
        
        currentTile = null;
        isDragging = false;
    }
    
    function handleTouchCancel() {
        if (currentTile) {
            resetTile(currentTile);
            currentTile = null;
        }
        isDragging = false;
    }
    
    // 鼠标事件
    function handleMouseDown(e) {
        if (e.button !== 0) return;
        
        const tile = findTileElement(e.target);
        if (!tile) return;
        
        touchStartX = e.clientX;
        touchStartY = e.clientY;
        touchCurrentX = e.clientX;
        startTime = Date.now();
        currentTile = tile;
        isDragging = false;
        
        tile.style.transition = 'none';
        tile.style.cursor = 'grabbing';
    }
    
    function handleMouseMove(e) {
        if (!currentTile) return;
        
        const deltaX = e.clientX - touchStartX;
        const deltaY = e.clientY - touchStartY;
        
        if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
            isDragging = true;
        }
        
        if (isDragging && Math.abs(deltaY) < config.maxVerticalDrift) {
            currentTile.style.transform = `translateX(${deltaX}px) scale(0.98)`;
            
            if (deltaX > 0) {
                showSwipeFeedback(currentTile, 'delete', Math.min(deltaX / config.swipeThreshold, 1));
            } else {
                showSwipeFeedback(currentTile, 'complete', Math.min(Math.abs(deltaX) / config.swipeThreshold, 1));
            }
        }
        
        touchCurrentX = e.clientX;
    }
    
    function handleMouseUp(e) {
        if (!currentTile) return;
        
        const deltaX = touchCurrentX - touchStartX;
        const deltaTime = Date.now() - startTime;
        const velocity = Math.abs(deltaX) / deltaTime;
        
        currentTile.style.cursor = 'pointer';
        
        if (Math.abs(deltaX) > config.swipeThreshold || velocity > config.swipeVelocity) {
            if (deltaX > 0) {
                handleSwipeRight(currentTile);
            } else {
                handleSwipeLeft(currentTile);
            }
        } else {
            resetTile(currentTile);
        }
        
        currentTile = null;
        isDragging = false;
    }
    
    // 滑动反馈
    function showSwipeFeedback(tile, type, progress) {
        const oldFeedback = tile.querySelector('.swipe-feedback');
        if (oldFeedback) oldFeedback.remove();
        
        if (progress < 0.1) return;
        
        const feedback = document.createElement('div');
        feedback.className = `swipe-feedback swipe-${type}`;
        feedback.style.cssText = `
            position: absolute;
            top: 0;
            ${type === 'delete' ? 'right: 0;' : 'left: 0;'}
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            ${type === 'delete' ? 'justify-content: flex-end;' : 'justify-content: flex-start;'}
            padding: 0 20px;
            opacity: ${progress};
            pointer-events: none;
            z-index: 1;
        `;
        
        if (type === 'delete') {
            feedback.innerHTML = `
                <div style="
                    background: var(--mondrian-red);
                    color: white;
                    padding: 10px 20px;
                    font-weight: bold;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                ">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                    删除
                </div>
            `;
        } else {
            feedback.innerHTML = `
                <div style="
                    background: var(--color-success);
                    color: white;
                    padding: 10px 20px;
                    font-weight: bold;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                ">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    完成
                </div>
            `;
        }
        
        tile.appendChild(feedback);
    }
    
    // 左滑完成
    async function handleSwipeLeft(tile) {
        const id = tile.dataset.id;
        if (!id) return;
        
        tile.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
        tile.style.transform = 'translateX(-100%)';
        tile.style.opacity = '0';
        
        playSound('complete');
        
        try {
            await TodoManager.toggleComplete(id);
            
            setTimeout(() => {
                tile.style.height = '0';
                tile.style.margin = '0';
                tile.style.padding = '0';
                tile.style.border = 'none';
                
                setTimeout(() => {
                    tile.remove();
                    UI.refresh();
                }, 300);
            }, 300);
            
            UI.showToast('任务已完成', 'success');
        } catch (error) {
            console.error('Swipe complete error:', error);
            resetTile(tile);
        }
    }
    
    // 右滑删除
    async function handleSwipeRight(tile) {
        const id = tile.dataset.id;
        if (!id) return;
        
        if (!confirm('确定要删除这个任务吗？')) {
            resetTile(tile);
            return;
        }
        
        tile.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
        tile.style.transform = 'translateX(100%)';
        tile.style.opacity = '0';
        
        playSound('delete');
        
        try {
            await TodoManager.delete(id);
            
            setTimeout(() => {
                tile.style.height = '0';
                tile.style.margin = '0';
                tile.style.padding = '0';
                tile.style.border = 'none';
                
                setTimeout(() => {
                    tile.remove();
                    UI.refresh();
                }, 300);
            }, 300);
            
            UI.showToast('任务已删除', 'info');
        } catch (error) {
            console.error('Swipe delete error:', error);
            resetTile(tile);
        }
    }
    
    // 重置磁贴
    function resetTile(tile) {
        if (!tile) return;
        
        const feedback = tile.querySelector('.swipe-feedback');
        if (feedback) feedback.remove();
        
        tile.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        tile.style.transform = '';
        tile.style.opacity = '';
        tile.classList.remove('long-pressing');
    }
    
    // 音效
    function playSound(type) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        if (type === 'complete') {
            oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } else if (type === 'delete') {
            oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(150, audioContext.currentTime + 0.2);
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
        }
    }
    
    // ==================== 拖拽排序功能 ====================
    
    let draggedTile = null;
    let draggedTodoId = null;
    let dragSourceIndex = null;
    let isDragSorting = false;
    
    function initDragAndDrop() {
        const tileGrid = document.getElementById('tileGrid');
        if (!tileGrid) return;
        
        enableGridDrag(tileGrid);
        console.log('DragDrop: Initialized');
    }
    
    function enableGridDrag(container) {
        container.addEventListener('dragstart', handleDragStart);
        container.addEventListener('dragend', handleDragEnd);
        container.addEventListener('dragover', handleDragOver);
        container.addEventListener('dragenter', handleDragEnter);
        container.addEventListener('dragleave', handleDragLeave);
        container.addEventListener('drop', handleDrop);
        
        updateDraggableTiles();
    }
    
    function updateDraggableTiles() {
        const tiles = document.querySelectorAll('.tile');
        tiles.forEach(tile => {
            tile.draggable = true;
            tile.classList.add('draggable-tile');
        });
    }
    
    function handleDragStart(e) {
        const tile = e.target.closest('.tile');
        if (!tile) return;
        
        draggedTile = tile;
        draggedTodoId = tile.dataset.id;
        dragSourceIndex = Array.from(tile.parentElement.children).indexOf(tile);
        isDragSorting = true;
        
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', draggedTodoId);
        
        setTimeout(() => {
            tile.classList.add('dragging');
        }, 0);
        
        document.dispatchEvent(new CustomEvent('tileDragStart', {
            detail: { todoId: draggedTodoId, sourceIndex: dragSourceIndex }
        }));
    }
    
    function handleDragEnd(e) {
        if (!draggedTile) return;
        
        draggedTile.classList.remove('dragging');
        
        document.querySelectorAll('.drag-over').forEach(el => {
            el.classList.remove('drag-over');
        });
        
        isDragSorting = false;
        draggedTile = null;
        draggedTodoId = null;
        dragSourceIndex = null;
        
        document.dispatchEvent(new CustomEvent('tileDragEnd'));
    }
    
    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        const targetTile = e.target.closest('.tile');
        if (!targetTile || targetTile === draggedTile || targetTile.classList.contains('dragging')) {
            return;
        }
        
        document.querySelectorAll('.drag-over').forEach(el => {
            el.classList.remove('drag-over');
        });
        targetTile.classList.add('drag-over');
    }
    
    function handleDragEnter(e) {
        const tile = e.target.closest('.tile');
        if (tile && tile !== draggedTile) {
            tile.classList.add('drag-over');
        }
    }
    
    function handleDragLeave(e) {
        const tile = e.target.closest('.tile');
        if (tile) {
            tile.classList.remove('drag-over');
        }
    }
    
    async function handleDrop(e) {
        e.preventDefault();
        
        const todoId = e.dataTransfer.getData('text/plain');
        if (!todoId) return;
        
        const container = document.getElementById('tileGrid');
        const tiles = Array.from(container.querySelectorAll('.tile'));
        const targetTile = e.target.closest('.tile');
        
        if (!targetTile || targetTile === draggedTile) {
            return;
        }
        
        const newIndex = tiles.indexOf(targetTile);
        const sourceIndex = tiles.indexOf(draggedTile);
        
        if (newIndex !== -1 && newIndex !== sourceIndex) {
            if (sourceIndex < newIndex) {
                targetTile.after(draggedTile);
            } else {
                targetTile.before(draggedTile);
            }
            
            await updateTodoOrder(todoId, newIndex);
            
            document.dispatchEvent(new CustomEvent('tileOrderChanged', {
                detail: { 
                    todoId, 
                    oldIndex: sourceIndex, 
                    newIndex,
                    order: tiles.map(t => t.dataset.id)
                }
            }));
            
            UI.showToast('任务排序已更新', 'success');
        }
        
        document.querySelectorAll('.drag-over').forEach(el => {
            el.classList.remove('drag-over');
        });
    }
    
    async function updateTodoOrder(todoId, newIndex) {
        try {
            const todos = TodoManager.getAll();
            const todo = todos.find(t => t.id === todoId);
            
            if (!todo) return;
            
            const filtered = todos.filter(t => t.id !== todoId);
            filtered.splice(newIndex, 0, todo);
            
            if (typeof Storage !== 'undefined' && Storage.saveOrder) {
                await Storage.saveOrder(filtered.map(t => t.id));
            }
            
            TodoManager.notify('reorder', { todoId, newIndex });
        } catch (error) {
            console.error('Update order error:', error);
        }
    }
    
    // API
    return {
        init,
        config,
        updateDraggableTiles,
        
        disable() {
            const tileGrid = document.getElementById('tileGrid');
            if (tileGrid) {
                tileGrid.style.pointerEvents = 'none';
            }
        },
        
        enable() {
            const tileGrid = document.getElementById('tileGrid');
            if (tileGrid) {
                tileGrid.style.pointerEvents = '';
            }
        }
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Gestures;
}
