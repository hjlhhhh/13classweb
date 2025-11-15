// 按日期排序函数
function sortByDate(a, b) {
    return new Date(b.date) - new Date(a.date);
}

// 格式化日期显示
function formatDateForDisplay(dateString) {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日`;
}

// 加载通知列表
function loadNotices() {
    const noticeList = document.getElementById('noticeList');
    const loadingMessage = document.getElementById('loading-message');
    const errorMessage = document.getElementById('error-message');
    
    // 显示加载中消息
    loadingMessage.style.display = 'block';
    errorMessage.style.display = 'none';
    noticeList.innerHTML = '';
    
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
            
            // 按日期排序
            notices.sort(sortByDate);
            
            if (notices.length === 0) {
                noticeList.innerHTML = '<p class="no-content">暂无通知</p>';
                return;
            }
            
            // 渲染通知列表
            notices.forEach((notice, index) => {
                const noticeItem = document.createElement('div');
                noticeItem.className = 'notice-item';
                
                // 格式化日期显示
                const formattedDate = formatDateForDisplay(notice.date);
                
                noticeItem.innerHTML = `
                    <div class="notice-title">
                        <a href="/13classweb/notice_detail.html?id=${encodeURIComponent(notice.id || index)}">${notice.title}</a>
                    </div>
                    <div class="notice-meta">
                        <span class="notice-date">${formattedDate}</span>
                        <span class="notice-author">${notice.author}</span>
                    </div>
                `;
                
                noticeList.appendChild(noticeItem);
            });
        })
        .catch(error => {
            console.error('加载通知失败:', error);
            loadingMessage.style.display = 'none';
            errorMessage.style.display = 'block';
            errorMessage.innerHTML = `
                <h3>通知加载失败</h3>
                <p>错误信息: ${error.message}</p>
                <p>请检查以下可能的原因:</p>
                <ul>
                    <li>确保 notices.json 文件位于 data 文件夹中</li>
                    <li>确保 notices.json 文件格式正确</li>
                    <li>确保在服务器环境下运行此网页</li>
                </ul>
            `;
        });
}

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    loadNotices();
});