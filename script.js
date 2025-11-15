// 通用功能脚本
document.addEventListener('DOMContentLoaded', function() {
    
    // 滚动动画
    initScrollAnimation();
    
    // 导航栏激活状态
    initNavActiveState();
    
    // 表单交互效果
    initFormInteractions();
    
    // 图片懒加载
    initLazyLoading();
});

// 初始化滚动动画
function initScrollAnimation() {
    const animatedElements = document.querySelectorAll('.scroll-animate');
    
    if (animatedElements.length === 0) return;
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animated');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });
    
    animatedElements.forEach(element => {
        observer.observe(element);
    });
}

// 初始化导航栏激活状态
function initNavActiveState() {
    const currentPage = window.location.pathname.split('/').pop() || '/13classweb/index.html';
    const navLinks = document.querySelectorAll('nav a');
    
    navLinks.forEach(link => {
        const linkHref = link.getAttribute('href');
        if (linkHref === currentPage) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// 初始化表单交互效果
function initFormInteractions() {
    const formInputs = document.querySelectorAll('input, textarea');
    
    formInputs.forEach(input => {
        // 添加输入动画
        input.addEventListener('focus', function() {
            this.parentElement.classList.add('focused');
        });
        
        input.addEventListener('blur', function() {
            if (this.value === '') {
                this.parentElement.classList.remove('focused');
            }
        });
        
        // 添加输入验证效果
        input.addEventListener('input', function() {
            if (this.value !== '') {
                this.classList.add('has-value');
            } else {
                this.classList.remove('has-value');
            }
        });
    });
}

// 初始化图片懒加载
function initLazyLoading() {
    if ('IntersectionObserver' in window) {
        const lazyImages = document.querySelectorAll('img[data-src]');
        
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    img.classList.add('fade-in');
                    imageObserver.unobserve(img);
                }
            });
        });
        
        lazyImages.forEach(img => imageObserver.observe(img));
    }
}

// 添加页面切换动画
function navigateTo(url) {
    // 添加页面离开动画
    document.querySelector('.page-container').style.animation = 'fadeOut 0.25s ease-in forwards';

    // 延迟跳转以显示动画（同步为 250ms）
    setTimeout(() => {
        window.location.href = url;
    }, 250);
}

// (已移除调试输出与未使用的防抖函数以精简代码)