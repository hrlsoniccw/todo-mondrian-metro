/**
 * Storage Module - 本地存储封装
 * 提供 LocalStorage 和 IndexedDB 双存储方案
 */

const Storage = (function() {
    'use strict';
    
    const DB_NAME = 'MondrianTodoDB';
    const DB_VERSION = 1;
    const STORE_NAME = 'todos';
    
    let db = null;
    let useIndexedDB = false;
    
    // 初始化存储
    async function init() {
        // 检测是否支持 IndexedDB
        if ('indexedDB' in window) {
            try {
                db = await openDB();
                useIndexedDB = true;
                console.log('Storage: Using IndexedDB');
            } catch (error) {
                console.warn('Storage: IndexedDB failed, falling back to LocalStorage', error);
                useIndexedDB = false;
            }
        } else {
            console.log('Storage: Using LocalStorage');
        }
    }
    
    // 打开 IndexedDB
    function openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            
            request.onupgradeneeded = (event) => {
                const database = event.target.result;
                if (!database.objectStoreNames.contains(STORE_NAME)) {
                    const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
                    store.createIndex('status', 'status', { unique: false });
                    store.createIndex('category', 'category', { unique: false });
                    store.createIndex('priority', 'priority', { unique: false });
                    store.createIndex('dueDate', 'dueDate', { unique: false });
                }
            };
        });
    }
    
    // LocalStorage 操作
    const localStorageAPI = {
        getAll() {
            try {
                const data = localStorage.getItem('mondrian_todos');
                return data ? JSON.parse(data) : [];
            } catch (error) {
                console.error('Storage: Failed to read from LocalStorage', error);
                return [];
            }
        },
        
        saveAll(todos) {
            try {
                localStorage.setItem('mondrian_todos', JSON.stringify(todos));
                return true;
            } catch (error) {
                console.error('Storage: Failed to write to LocalStorage', error);
                return false;
            }
        },
        
        getById(id) {
            const todos = this.getAll();
            return todos.find(t => t.id === id) || null;
        },
        
        save(todo) {
            const todos = this.getAll();
            const index = todos.findIndex(t => t.id === todo.id);
            
            if (index >= 0) {
                todos[index] = todo;
            } else {
                todos.push(todo);
            }
            
            return this.saveAll(todos);
        },
        
        delete(id) {
            const todos = this.getAll();
            const filtered = todos.filter(t => t.id !== id);
            return this.saveAll(filtered);
        },
        
        clear() {
            localStorage.removeItem('mondrian_todos');
            return true;
        }
    };
    
    // IndexedDB 操作
    const indexedDBAPI = {
        async getAll() {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([STORE_NAME], 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.getAll();
                
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        },
        
        async saveAll(todos) {
            // IndexedDB 不提供批量替换，需要逐个处理
            const existing = await this.getAll();
            const existingIds = new Set(existing.map(t => t.id));
            const newIds = new Set(todos.map(t => t.id));
            
            // 删除已不存在的
            for (const id of existingIds) {
                if (!newIds.has(id)) {
                    await this.delete(id);
                }
            }
            
            // 保存所有
            for (const todo of todos) {
                await this.save(todo);
            }
            
            return true;
        },
        
        async getById(id) {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([STORE_NAME], 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.get(id);
                
                request.onsuccess = () => resolve(request.result || null);
                request.onerror = () => reject(request.error);
            });
        },
        
        async save(todo) {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([STORE_NAME], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.put(todo);
                
                request.onsuccess = () => resolve(true);
                request.onerror = () => reject(request.error);
            });
        },
        
        async delete(id) {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([STORE_NAME], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.delete(id);
                
                request.onsuccess = () => resolve(true);
                request.onerror = () => reject(request.error);
            });
        },
        
        async clear() {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([STORE_NAME], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.clear();
                
                request.onsuccess = () => resolve(true);
                request.onerror = () => reject(request.error);
            });
        },
        
        // 高级查询
        async queryByIndex(indexName, value) {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([STORE_NAME], 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const index = store.index(indexName);
                const request = index.getAll(value);
                
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        }
    };
    
    // 公共 API
    const api = useIndexedDB ? indexedDBAPI : localStorageAPI;
    
    return {
        init,
        
        async getAll() {
            await init();
            return useIndexedDB ? await indexedDBAPI.getAll() : localStorageAPI.getAll();
        },
        
        async saveAll(todos) {
            await init();
            return useIndexedDB ? await indexedDBAPI.saveAll(todos) : localStorageAPI.saveAll(todos);
        },
        
        async getById(id) {
            await init();
            return useIndexedDB ? await indexedDBAPI.getById(id) : localStorageAPI.getById(id);
        },
        
        async save(todo) {
            await init();
            return useIndexedDB ? await indexedDBAPI.save(todo) : localStorageAPI.save(todo);
        },
        
        async delete(id) {
            await init();
            return useIndexedDB ? await indexedDBAPI.delete(id) : localStorageAPI.delete(id);
        },
        
        async clear() {
            await init();
            return useIndexedDB ? await indexedDBAPI.clear() : localStorageAPI.clear();
        },
        
        // 导出数据
        async export() {
            const todos = await this.getAll();
            return JSON.stringify(todos, null, 2);
        },
        
        // 导入数据
        async import(jsonString) {
            try {
                const todos = JSON.parse(jsonString);
                if (Array.isArray(todos)) {
                    await this.saveAll(todos);
                    return { success: true, count: todos.length };
                } else {
                    throw new Error('Invalid data format');
                }
            } catch (error) {
                return { success: false, error: error.message };
            }
        },
        
        // 获取统计信息
        async getStats() {
            const todos = await this.getAll();
            return {
                total: todos.length,
                active: todos.filter(t => t.status === 'active').length,
                completed: todos.filter(t => t.status === 'completed').length,
                archived: todos.filter(t => t.status === 'archived').length,
                byCategory: {
                    work: todos.filter(t => t.category === 'work').length,
                    personal: todos.filter(t => t.category === 'personal').length,
                    urgent: todos.filter(t => t.category === 'urgent').length,
                    later: todos.filter(t => t.category === 'later').length
                }
            };
        }
    };
})();

// 兼容旧浏览器
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Storage;
}
