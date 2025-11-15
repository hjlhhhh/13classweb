// 获取URL参数
function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// 格式化日期显示
function formatDateForDisplay(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}年${month}月${day}日`;
}

// 加载通知详情
function loadNoticeDetail() {
    const noticeIdParam = getUrlParameter('id');
    const noticeIndexParam = getUrlParameter('index');
    const noticeDate = getUrlParameter('date');
    const noticeDetail = document.getElementById('noticeDetail');
    const loadingMessage = document.getElementById('loading-message');
    const errorMessage = document.getElementById('error-message');
    
    if (noticeIdParam === null && noticeIndexParam === null && !noticeDate) {
        loadingMessage.style.display = 'none';
        errorMessage.style.display = 'block';
        errorMessage.innerHTML = `
            <h3>参数错误</h3>
            <p>未找到通知标识，请从通知列表页面正确访问。</p>
            <a href="/13classweb/notice.html" class="button">返回通知列表</a>
        `;
        return;
    }
    
    // 显示加载中消息
    loadingMessage.style.display = 'block';
    errorMessage.style.display = 'none';
    noticeDetail.style.display = 'none';
    
    // 从JSON文件加载通知数据
    fetch('./data/notices.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP错误! 状态: ${response.status}`);
            }
            return response.json();
        })
        .then(notices => {
            // 隐藏加载中消息
            loadingMessage.style.display = 'none';
            
            // 优先根据 id 参数查找，次选 index，最后回退到 date（兼容旧链接）
            let notice = null;
            if (noticeIdParam !== null) {
                notice = notices.find(n => n.id === noticeIdParam);
                if (!notice) {
                    errorMessage.style.display = 'block';
                    errorMessage.innerHTML = `
                        <h3>通知不存在</h3>
                        <p>未找到 id 为 ${noticeIdParam} 的通知，请检查链接是否正确。</p>
                        <a href="/13classweb/notice.html" class="button">返回通知列表</a>
                    `;
                    return;
                }
            } else if (noticeIndexParam !== null) {
                const idx = parseInt(noticeIndexParam, 10);
                if (isNaN(idx) || idx < 0 || idx >= notices.length) {
                    errorMessage.style.display = 'block';
                    errorMessage.innerHTML = `
                        <h3>通知不存在</h3>
                        <p>未找到索引为 ${noticeIndexParam} 的通知，请检查链接是否正确。</p>
                        <a href="/13classweb/notice.html" class="button">返回通知列表</a>
                    `;
                    return;
                }
                notice = notices[idx];
            } else {
                // 兼容旧的 date 参数
                notice = notices.find(n => n.date === noticeDate);
                if (!notice) {
                    errorMessage.style.display = 'block';
                    errorMessage.innerHTML = `
                        <h3>通知不存在</h3>
                        <p>未找到日期为 ${noticeDate} 的通知，请检查链接是否正确。</p>
                        <a href="/13classweb/notice.html" class="button">返回通知列表</a>
                    `;
                    return;
                }
            }
            
            // 格式化日期显示
            const formattedDate = formatDateForDisplay(notice.date);
            
            // 渲染通知详情
            noticeDetail.style.display = 'block';
            noticeDetail.innerHTML = `
                <h2 class="notice-detail-title">${notice.title}</h2>
                <div class="notice-detail-meta">
                    <span class="notice-detail-date">发布时间: ${formattedDate}</span>
                    <span class="notice-detail-author">发布人: ${notice.author}</span>
                </div>
                <div class="notice-detail-content">
                    ${formatNoticeContent(notice.content)}
                </div>
            `;
            
            // 更新页面标题
            document.title = `${notice.title} - 北京师范大学亚太实验学校1+3班`;
        })
        .catch(error => {
            console.error('加载通知详情失败:', error);
            loadingMessage.style.display = 'none';
            errorMessage.style.display = 'block';
            errorMessage.innerHTML = `
                <h3>通知详情加载失败</h3>
                <p>错误信息: ${error.message}</p>
                <p>请检查以下可能的原因:</p>
                <ul>
                    <li>确保 notices.json 文件位于 data 文件夹中</li>
                    <li>确保 notices.json 文件格式正确</li>
                    <li>确保在服务器环境下运行此网页</li>
                </ul>
                <a href="/13classweb/notice.html" class="button">返回通知列表</a>
            `;
        });
}

// 格式化通知内容（将换行符转换为HTML段落）
function formatNoticeContent(content) {
    if (!content) return '';
    
    // 将换行符转换为段落
    const paragraphs = content.split('\n\n');
    let html = '';
    
    paragraphs.forEach(paragraph => {
        if (paragraph.trim()) {
            html += `<p>${paragraph.replace(/\n/g, '<br>')}</p>`;
        }
    });
    
    return html;
}

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    loadNoticeDetail();
});