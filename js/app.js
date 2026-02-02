/**
 * Main Application - 主应用入口
 * 整合所有模块，初始化应用
 */

(function() {
    'use strict';
    
    // 应用版本
    const APP_VERSION = '1.0.0';
    
    // 初始化应用
    async function init() {
        console.log(`🎨 Mondrian Metro Todo v${APP_VERSION} - Initializing...`);
        
        try {
            // 1. 初始化存储
            await Storage.init();
            console.log('✅ Storage initialized');
            
            // 2. 加载任务数据
            await TodoManager.init();
            console.log(`✅ Loaded ${TodoManager.getAll().length} todos`);
            
            // 3. 初始化 UI
            UI.init();
            console.log('✅ UI initialized');
            
            // 4. 初始化手势
            Gestures.init();
            console.log('✅ Gestures initialized');
            
            // 4.5. 初始化看板拖拽
            UI.initBoardDragDrop();
            console.log('✅ Board drag & drop initialized');
            
            // 4.6. 初始化任务提醒
            if (typeof Reminder !== 'undefined') {
                Reminder.init();
                console.log('✅ Reminder initialized');
            }
            
            // 5. 注册数据变更监听器
            TodoManager.onChange(handleTodoChange);
            
            // 6. 首次渲染
            UI.refresh();
            
            // 7. 加载示例数据（如果是首次使用）
            if (TodoManager.getAll().length === 0) {
                await loadDemoData();
            }
            
            // 8. 初始化新用户向导
            OnboardingWizard.init();
            console.log('✅ Onboarding wizard initialized');
            
            console.log('🚀 Application ready!');
            
            // 显示欢迎提示
            setTimeout(() => {
                UI.showToast('欢迎使用蒙德里安·Metro Todo！', 'success');
            }, 500);
            
        } catch (error) {
            console.error('❌ Initialization failed:', error);
            UI.showToast('应用初始化失败，请刷新页面重试', 'error');
        }
    }
    
    // 处理任务数据变更
    function handleTodoChange(event, data) {
        console.log(`📢 Todo change: ${event}`, data);
        
        // 更新统计
        const stats = TodoManager.getStats();
        UI.updateStats(stats);
        
        // 根据当前视图刷新
        switch (event) {
            case 'create':
            case 'update':
            case 'delete':
            case 'batchComplete':
            case 'batchDelete':
            case 'clearCompleted':
            case 'import':
                UI.refresh();
                break;
        }
    }
    
    // 加载示例数据
    async function loadDemoData() {
        const demoTodos = [
            {
                title: '完成项目设计文档',
                description: '编写完整的项目需求分析和设计方案',
                category: 'work',
                priority: 1,
                dueDate: Date.now() + 86400000, // 明天
                tags: ['文档', '设计']
            },
            {
                title: '团队周会',
                description: '周五下午3点，会议室A',
                category: 'work',
                priority: 2,
                dueDate: Date.now() + 172800000, // 后天
                tags: ['会议']
            },
            {
                title: '购买生活用品',
                description: '牛奶、面包、鸡蛋、水果',
                category: 'personal',
                priority: 3,
                dueDate: Date.now() + 43200000, // 12小时后
                tags: ['购物']
            },
            {
                title: '学习新技术',
                description: '研究 WebAssembly 和 WebGL',
                category: 'later',
                priority: 4,
                tags: ['学习', '技术']
            },
            {
                title: '处理客户紧急反馈',
                description: '客户报告的系统崩溃问题需要立即处理',
                category: 'urgent',
                priority: 1,
                dueDate: Date.now() + 3600000, // 1小时后
                tags: ['紧急', '客户']
            },
            {
                title: '整理桌面文件',
                description: '清理电脑桌面，归档旧文件',
                category: 'personal',
                priority: 4,
                tags: ['整理']
            }
        ];
        
        for (const todo of demoTodos) {
            await TodoManager.create(todo);
        }
        
        console.log(`📦 Loaded ${demoTodos.length} demo todos`);
    }
    
    // 全局错误处理
    window.addEventListener('error', (e) => {
        console.error('Global error:', e.error);
        UI.showToast('发生错误，请检查控制台', 'error');
    });
    
    window.addEventListener('unhandledrejection', (e) => {
        console.error('Unhandled promise rejection:', e.reason);
        UI.showToast('操作失败，请重试', 'error');
    });
    
    // 离线支持
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            // 可以在这里注册 Service Worker
            console.log('Service Worker support available');
        });
    }
    
    // 页面可见性变化（节省资源）
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            console.log('Page hidden - pausing animations');
        } else {
            console.log('Page visible - resuming');
            UI.refresh();
        }
    });
    
    // DOM 加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // ==================== 新用户向导 ====================
    
    const OnboardingWizard = {
        currentStep: 1,
        totalSteps: 5,
        wizardElement: null,
        settingElement: null,
        showWizardKey: 'mondrian_todo_show_wizard',
        
        // 初始化向导
        init() {
            this.wizardElement = document.getElementById('onboardingWizard');
            this.settingElement = document.getElementById('wizardSetting');
            
            if (!this.wizardElement) return;
            
            // 检查是否应该显示向导
            const shouldShow = this.shouldShowWizard();
            
            if (shouldShow) {
                // 延迟显示向导，让应用先加载完成
                setTimeout(() => {
                    this.show();
                }, 800);
            } else {
                // 不显示向导，但显示设置开关
                setTimeout(() => {
                    this.showSetting();
                }, 1000);
            }
            
            // 绑定事件
            this.bindEvents();
        },
        
        // 检查是否应该显示向导
        shouldShowWizard() {
            // 如果没有存储过设置，默认显示
            const stored = localStorage.getItem(this.showWizardKey);
            if (stored === null) {
                return true;
            }
            return stored === 'true';
        },
        
        // 显示向导
        show() {
            if (!this.wizardElement) return;
            
            this.wizardElement.classList.add('active');
            document.body.classList.add('app-blur');
            this.currentStep = 1;
            this.updateStep();
            
            // 同时显示设置开关
            this.showSetting();
        },
        
        // 隐藏向导
        hide() {
            if (!this.wizardElement) return;
            
            this.wizardElement.classList.remove('active');
            document.body.classList.remove('app-blur');
        },
        
        // 显示设置开关
        showSetting() {
            if (!this.settingElement) return;
            this.settingElement.classList.add('visible');
        },
        
        // 更新步骤显示
        updateStep() {
            // 更新步骤内容
            const steps = this.wizardElement.querySelectorAll('.wizard-step');
            steps.forEach(step => {
                step.classList.remove('active');
                if (parseInt(step.dataset.step) === this.currentStep) {
                    step.classList.add('active');
                }
            });
            
            // 更新指示点
            const dots = this.wizardElement.querySelectorAll('.dot');
            dots.forEach(dot => {
                dot.classList.remove('active');
                if (parseInt(dot.dataset.step) === this.currentStep) {
                    dot.classList.add('active');
                }
            });
            
            // 更新按钮
            const prevBtn = document.getElementById('wizardPrev');
            const nextBtn = document.getElementById('wizardNext');
            
            if (prevBtn) {
                prevBtn.style.display = this.currentStep === 1 ? 'none' : 'block';
            }
            
            if (nextBtn) {
                if (this.currentStep === this.totalSteps) {
                    nextBtn.textContent = '开始使用';
                    nextBtn.style.background = 'var(--color-success)';
                } else {
                    nextBtn.textContent = '下一步';
                    nextBtn.style.background = '';
                }
            }
        },
        
        // 下一步
        next() {
            if (this.currentStep < this.totalSteps) {
                this.currentStep++;
                this.updateStep();
            } else {
                this.hide();
            }
        },
        
        // 上一步
        prev() {
            if (this.currentStep > 1) {
                this.currentStep--;
                this.updateStep();
            }
        },
        
        // 跳转到指定步骤
        goToStep(step) {
            if (step >= 1 && step <= this.totalSteps) {
                this.currentStep = step;
                this.updateStep();
            }
        },
        
        // 绑定事件
        bindEvents() {
            // 下一步按钮
            const nextBtn = document.getElementById('wizardNext');
            if (nextBtn) {
                nextBtn.addEventListener('click', () => this.next());
            }
            
            // 上一步按钮
            const prevBtn = document.getElementById('wizardPrev');
            if (prevBtn) {
                prevBtn.addEventListener('click', () => this.prev());
            }
            
            // 跳过按钮
            const skipBtn = document.getElementById('wizardSkip');
            if (skipBtn) {
                skipBtn.addEventListener('click', () => this.hide());
            }
            
            // 点击指示点跳转
            const dots = this.wizardElement?.querySelectorAll('.dot');
            if (dots) {
                dots.forEach(dot => {
                    dot.addEventListener('click', () => {
                        const step = parseInt(dot.dataset.step);
                        this.goToStep(step);
                    });
                });
            }
            
            // 设置开关
            const toggle = document.getElementById('showWizardToggle');
            if (toggle) {
                // 设置初始状态
                toggle.checked = this.shouldShowWizard();
                
                toggle.addEventListener('change', (e) => {
                    const showWizard = e.target.checked;
                    localStorage.setItem(this.showWizardKey, showWizard);
                    
                    UI.showToast(
                        showWizard ? '每次打开将显示向导' : '已关闭自动显示向导', 
                        'info'
                    );
                });
            }
            
            // 点击遮罩关闭（可选）
            const overlay = this.wizardElement?.querySelector('.wizard-overlay');
            if (overlay) {
                overlay.addEventListener('click', () => this.hide());
            }
            
            // 键盘导航
            document.addEventListener('keydown', (e) => {
                if (!this.wizardElement?.classList.contains('active')) return;
                
                if (e.key === 'ArrowRight' || e.key === ' ') {
                    e.preventDefault();
                    this.next();
                } else if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    this.prev();
                } else if (e.key === 'Escape') {
                    this.hide();
                }
            });
        },
        
        // 手动触发显示向导（用于设置菜单）
        showManually() {
            this.show();
        }
    };
    
    // 暴露到全局，供 UI 模块使用
    window.OnboardingWizard = OnboardingWizard;

    // 暴露全局 API（调试用）
    window.MondrianTodo = {
        version: APP_VERSION,
        Storage,
        TodoManager,
        UI,
        Gestures,
        
        // 调试工具
        debug: {
            // 查看所有任务
            todos: () => TodoManager.getAll(),
            
            // 查看统计
            stats: () => TodoManager.getStats(),
            
            // 导出数据
            export: () => Storage.export().then(data => {
                console.log(data);
                return data;
            }),
            
            // 清空所有数据
            clear: () => TodoManager.reset().then(() => {
                UI.showToast('所有数据已清空', 'info');
                UI.refresh();
            }),
            
            // 重新加载示例数据
            demo: () => loadDemoData().then(() => {
                UI.showToast('示例数据已加载', 'success');
                UI.refresh();
            })
        }
    };
    
    console.log('💡 Debug API available: window.MondrianTodo');
})();
