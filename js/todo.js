/**
 * Todo Module - 任务数据管理
 * 提供任务 CRUD、筛选、排序等功能
 */

const TodoManager = (function() {
    'use strict';
    
    let todos = [];
    let listeners = [];
    
    // 生成唯一 ID
    function generateId() {
        return 'todo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    // 通知监听器
    function notify(event, data) {
        listeners.forEach(callback => {
            try {
                callback(event, data);
            } catch (error) {
                console.error('TodoManager: Listener error', error);
            }
        });
    }
    
    // 获取颜色主题
    function getColorTheme(category, priority) {
        if (category === 'urgent' || priority === 1) {
            return 'red';
        } else if (category === 'work') {
            return 'blue';
        } else if (category === 'personal') {
            return 'yellow';
        } else {
            return 'white';
        }
    }
    
    // 创建新任务对象
    function createTodoObject(data) {
        const now = Date.now();
        const category = data.category || 'work';
        const priority = parseInt(data.priority) || 4;
        
        // 处理提醒时间
        let reminder = null;
        if (data.reminder && data.reminder > 0 && data.dueDate) {
            reminder = data.reminder * 60 * 1000;
        } else if (data.reminderTime) {
            reminder = data.reminderTime;
        }
        
        return {
            id: data.id || generateId(),
            title: data.title || '',
            description: data.description || '',
            category: category,
            priority: priority,
            status: data.status || 'active',
            createdAt: data.createdAt || now,
            updatedAt: now,
            dueDate: data.dueDate || null,
            completedAt: data.completedAt || null,
            tags: Array.isArray(data.tags) ? data.tags : 
                  (data.tags ? data.tags.split(',').map(t => t.trim()).filter(t => t) : []),
            colorTheme: data.colorTheme || getColorTheme(category, priority),
            reminder: reminder,
            reminded: data.reminded || false
        };
    }
    
    return {
        // 初始化：从存储加载
        async init() {
            todos = await Storage.getAll();
            notify('init', { count: todos.length });
            return todos;
        },
        
        // 添加监听器
        onChange(callback) {
            listeners.push(callback);
            return () => {
                listeners = listeners.filter(cb => cb !== callback);
            };
        },
        
        // 获取所有任务
        getAll() {
            return [...todos];
        },
        
        // 根据 ID 获取任务
        getById(id) {
            return todos.find(t => t.id === id) || null;
        },
        
        // 创建任务
        async create(data) {
            if (!data.title || data.title.trim() === '') {
                throw new Error('Task title is required');
            }
            
            const todo = createTodoObject(data);
            todos.push(todo);
            
            await Storage.save(todo);
            notify('create', { todo });
            
            return todo;
        },
        
        // 更新任务
        async update(id, updates) {
            const index = todos.findIndex(t => t.id === id);
            if (index === -1) {
                throw new Error('Task not found');
            }
            
            const todo = todos[index];
            const updated = {
                ...todo,
                ...updates,
                id: todo.id, // 防止 ID 被修改
                updatedAt: Date.now()
            };
            
            // 如果分类或优先级改变，更新颜色主题
            if (updates.category || updates.priority) {
                updated.colorTheme = getColorTheme(
                    updates.category || todo.category,
                    updates.priority || todo.priority
                );
            }
            
            todos[index] = updated;
            await Storage.save(updated);
            notify('update', { todo: updated, previous: todo });
            
            return updated;
        },
        
        // 删除任务
        async delete(id) {
            const index = todos.findIndex(t => t.id === id);
            if (index === -1) {
                throw new Error('Task not found');
            }
            
            const todo = todos[index];
            todos.splice(index, 1);
            
            await Storage.delete(id);
            notify('delete', { todo });
            
            return todo;
        },
        
        // 标记完成
        async complete(id) {
            return this.update(id, {
                status: 'completed',
                completedAt: Date.now()
            });
        },
        
        // 标记未完成
        async uncomplete(id) {
            return this.update(id, {
                status: 'active',
                completedAt: null
            });
        },
        
        // 切换完成状态
        async toggleComplete(id) {
            const todo = this.getById(id);
            if (!todo) throw new Error('Task not found');
            
            if (todo.status === 'completed') {
                return this.uncomplete(id);
            } else {
                return this.complete(id);
            }
        },
        
        // 归档任务
        async archive(id) {
            return this.update(id, { status: 'archived' });
        },
        
        // 恢复归档
        async unarchive(id) {
            return this.update(id, { status: 'active' });
        },
        
        // 筛选任务
        filter(options = {}) {
            let result = [...todos];
            
            // 按状态筛选
            if (options.status) {
                result = result.filter(t => t.status === options.status);
            }
            
            // 按分类筛选
            if (options.category) {
                result = result.filter(t => t.category === options.category);
            }
            
            // 按优先级筛选
            if (options.priority) {
                result = result.filter(t => t.priority === options.priority);
            }
            
            // 按标签筛选
            if (options.tag) {
                result = result.filter(t => t.tags.includes(options.tag));
            }
            
            // 搜索关键词
            if (options.search) {
                const keyword = options.search.toLowerCase();
                result = result.filter(t => 
                    t.title.toLowerCase().includes(keyword) ||
                    t.description.toLowerCase().includes(keyword) ||
                    t.tags.some(tag => tag.toLowerCase().includes(keyword))
                );
            }
            
            // 按日期范围筛选
            if (options.dueBefore) {
                result = result.filter(t => t.dueDate && t.dueDate <= options.dueBefore);
            }
            
            if (options.dueAfter) {
                result = result.filter(t => t.dueDate && t.dueDate >= options.dueAfter);
            }
            
            // 排序
            if (options.sortBy) {
                const sortField = options.sortBy;
                const sortOrder = options.sortOrder === 'asc' ? 1 : -1;
                
                result.sort((a, b) => {
                    let valA = a[sortField];
                    let valB = b[sortField];
                    
                    if (valA === null) return 1;
                    if (valB === null) return -1;
                    
                    if (typeof valA === 'string') {
                        valA = valA.toLowerCase();
                        valB = valB.toLowerCase();
                    }
                    
                    if (valA < valB) return -1 * sortOrder;
                    if (valA > valB) return 1 * sortOrder;
                    return 0;
                });
            } else {
                // 默认排序：优先级（高到低）→ 创建时间（新到旧）
                result.sort((a, b) => {
                    if (a.priority !== b.priority) {
                        return a.priority - b.priority;
                    }
                    return b.createdAt - a.createdAt;
                });
            }
            
            return result;
        },
        
        // 获取四象限任务
        getMatrix() {
            const active = this.filter({ status: 'active' });
            
            return {
                q1: active.filter(t => t.priority === 1), // 重要且紧急
                q2: active.filter(t => t.priority === 2), // 重要不紧急
                q3: active.filter(t => t.priority === 3), // 不重要紧急
                q4: active.filter(t => t.priority === 4)  // 不重要不紧急
            };
        },
        
        // 获取日历视图数据
        getCalendarData(year, month) {
            const startDate = new Date(year, month, 1).getTime();
            const endDate = new Date(year, month + 1, 0).getTime();
            
            return this.filter({
                status: 'active'
            }).filter(t => {
                if (!t.dueDate) return false;
                return t.dueDate >= startDate && t.dueDate <= endDate;
            });
        },
        
        // 获取任务统计
        getStats() {
            return {
                total: todos.length,
                active: todos.filter(t => t.status === 'active').length,
                completed: todos.filter(t => t.status === 'completed').length,
                archived: todos.filter(t => t.status === 'archived').length,
                byCategory: {
                    all: todos.length,
                    work: todos.filter(t => t.category === 'work').length,
                    personal: todos.filter(t => t.category === 'personal').length,
                    urgent: todos.filter(t => t.category === 'urgent').length,
                    later: todos.filter(t => t.category === 'later').length
                },
                byPriority: {
                    1: todos.filter(t => t.priority === 1).length,
                    2: todos.filter(t => t.priority === 2).length,
                    3: todos.filter(t => t.priority === 3).length,
                    4: todos.filter(t => t.priority === 4).length
                }
            };
        },
        
        // 批量操作
        async batchComplete(ids) {
            const results = [];
            for (const id of ids) {
                try {
                    results.push(await this.complete(id));
                } catch (error) {
                    console.error('Batch complete error:', error);
                }
            }
            notify('batchComplete', { count: results.length });
            return results;
        },
        
        async batchDelete(ids) {
            const results = [];
            for (const id of ids) {
                try {
                    results.push(await this.delete(id));
                } catch (error) {
                    console.error('Batch delete error:', error);
                }
            }
            notify('batchDelete', { count: results.length });
            return results;
        },
        
        // 清空已完成
        async clearCompleted() {
            const completed = todos.filter(t => t.status === 'completed');
            for (const todo of completed) {
                await this.delete(todo.id);
            }
            notify('clearCompleted', { count: completed.length });
            return completed.length;
        },
        
        // 导出数据
        async export() {
            return await Storage.export();
        },
        
        // 导入数据
        async import(jsonString) {
            const result = await Storage.import(jsonString);
            if (result.success) {
                todos = await Storage.getAll();
                notify('import', { count: result.count });
            }
            return result;
        },
        
        // 重置所有数据
        async reset() {
            await Storage.clear();
            todos = [];
            notify('reset', {});
        }
    };
})();

// 兼容旧浏览器
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TodoManager;
}
