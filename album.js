// 全局变量
let currentMedia = [];
let currentIndex = 0;
let currentFilter = 'all';
let videoThumbnails = {}; // 存储生成的视频缩略图
let videoDurations = {}; // 存储视频时长

// 按日期排序函数
function sortByDate(a, b) {
    return new Date(b.date) - new Date(a.date);
}

// 加载媒体内容
function loadMedia() {
    const mediaGrid = document.getElementById('mediaGrid');
    const loadingMessage = document.getElementById('loading-message');
    const errorMessage = document.getElementById('error-message');
    
    // 显示加载中消息
    loadingMessage.style.display = 'block';
    errorMessage.style.display = 'none';
    mediaGrid.innerHTML = '';
    
    // 同时加载图片和视频数据
    Promise.all([
        fetch('.//13classweb/data/photos.json').then(response => {
            if (!response.ok) throw new Error('图片数据加载失败');
            return response.json();
        }),
        fetch('.//13classweb/data/videos.json').then(response => {
            if (!response.ok) throw new Error('视频数据加载失败');
            return response.json();
        })
    ])
    .then(([photos, videos]) => {
        // 隐藏加载中消息
        loadingMessage.style.display = 'none';
        
        // 合并数据并添加类型标识
        const photosWithType = photos.map(photo => ({ ...photo, mediaType: 'image' }));
        const videosWithType = videos.map(video => ({ ...video, mediaType: 'video' }));
        
        // 按日期排序
        currentMedia = [...photosWithType, ...videosWithType].sort(sortByDate);
        
        if (currentMedia.length === 0) {
            mediaGrid.innerHTML = '<p class="no-content">暂无媒体内容</p>';
            return;
        }
        
        // 渲染媒体网格
        renderMediaGrid(currentMedia);
        
        // 为视频生成缩略图和获取时长
        generateVideoThumbnailsAndDurations();
    })
    .catch(error => {
        console.error('加载媒体内容失败:', error);
        loadingMessage.style.display = 'none';
        errorMessage.style.display = 'block';
        errorMessage.innerHTML = `
            <h3>媒体内容加载失败</h3>
            <p>错误信息: ${error.message}</p>
            <p>请检查以下可能的原因:</p>
            <ul>
                <li>确保 photos.json 和 videos.json 文件位于 data 文件夹中</li>
                <li>确保 media 文件夹存在并包含媒体文件</li>
                <li>确保在服务器环境下运行此网页</li>
            </ul>
        `;
    });
}

// 渲染媒体网格
function renderMediaGrid(mediaItems) {
    const mediaGrid = document.getElementById('mediaGrid');
    mediaGrid.innerHTML = '';
    
    const filteredMedia = mediaItems.filter(item => {
        if (currentFilter === 'all') return true;
        return item.mediaType === currentFilter;
    });
    
    if (filteredMedia.length === 0) {
        mediaGrid.innerHTML = '<p class="no-content">暂无相关内容</p>';
        return;
    }
    
    filteredMedia.forEach((media, index) => {
        const mediaItem = document.createElement('div');
        mediaItem.className = `media-item ${media.mediaType}-item`;
        mediaItem.setAttribute('data-index', index);
        mediaItem.setAttribute('data-original-index', currentMedia.indexOf(media));
        
        // 格式化日期显示
        const formattedDate = formatDateForDisplay(media.date);
        
        // 根据媒体类型生成不同的内容
        if (media.mediaType === 'image') {
            mediaItem.innerHTML = `
                <div class="media-img-container">
                    <img src="${media.url}" alt="${media.name}" 
                         onerror="this.onerror=null; this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuWbvueJh+WKoOi9veS4rTwvdGV4dD48L3N2Zz4='">
                </div>
                <div class="media-name">${media.name}</div>
                <div class="media-date">${formattedDate}</div>
            `;
        } else if (media.mediaType === 'video') {
            // 为视频项添加特殊类名和数据属性
            mediaItem.classList.add('video-item-loading');
            mediaItem.innerHTML = `
                <div class="media-video-container">
                    <div class="video-thumbnail-placeholder">
                        <div class="loading-spinner"></div>
                        <p>生成预览中...</p>
                    </div>
                    <div class="video-overlay">
                        <div class="play-icon">▶</div>
                        <div class="video-duration">--:--</div>
                    </div>
                </div>
                <div class="media-name">${media.name}</div>
                <div class="media-date">${formattedDate}</div>
            `;
        }
        
        // 添加点击事件
        mediaItem.addEventListener('click', () => openModal(currentMedia.indexOf(media)));
        
        mediaGrid.appendChild(mediaItem);
    });
}

// 为所有视频生成缩略图和获取时长
function generateVideoThumbnailsAndDurations() {
    const videoItems = document.querySelectorAll('.video-item-loading');
    
    videoItems.forEach((item, index) => {
        const originalIndex = item.getAttribute('data-original-index');
        const videoData = currentMedia[originalIndex];
        
        if (videoData.mediaType === 'video') {
            generateVideoThumbnailAndDuration(videoData.url, item, originalIndex);
        }
    });
}

// 为单个视频生成缩略图和获取时长
function generateVideoThumbnailAndDuration(videoUrl, container, originalIndex) {
    // 创建视频元素用于提取缩略图和获取时长
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous'; // 处理跨域问题
    video.preload = 'metadata';
    
    // 设置视频源
    video.src = videoUrl;
    
    // 当视频元数据加载完成后提取第一帧和时长
    video.addEventListener('loadedmetadata', function() {
        // 获取视频时长并格式化
        const duration = formatDuration(video.duration);
        videoDurations[originalIndex] = duration;
        
        // 设置当前时间为第一帧
        video.currentTime = 0.1; // 设置为0.1秒以确保获取到有效帧
        
        // 监听seeked事件，当视频跳转到指定时间后触发
        video.addEventListener('seeked', function() {
            // 创建canvas用于绘制视频帧
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // 设置canvas尺寸与视频一致
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            // 将视频帧绘制到canvas上
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // 将canvas内容转换为数据URL
            const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
            
            // 存储缩略图URL
            videoThumbnails[originalIndex] = thumbnailUrl;
            
            // 更新UI显示缩略图和时长
            updateVideoThumbnailAndDuration(container, thumbnailUrl, duration);
            
            // 清理视频元素
            video.remove();
        });
    });
    
    // 处理视频加载错误
    video.addEventListener('error', function() {
        console.error('视频加载失败:', videoUrl);
        // 使用默认占位图和未知时长
        updateVideoThumbnailAndDuration(
            container, 
            'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuWbvueJh+WKoOi9veS4rTwvdGV4dD48L3N2Zz4=',
            '未知'
        );
    });
}

// 格式化视频时长（秒转换为分:秒）
function formatDuration(seconds) {
    if (isNaN(seconds) || seconds === Infinity) {
        return '未知';
    }
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    // 格式化为 MM:SS
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// 更新视频缩略图和时长显示
function updateVideoThumbnailAndDuration(container, thumbnailUrl, duration) {
    const videoContainer = container.querySelector('.media-video-container');
    const placeholder = container.querySelector('.video-thumbnail-placeholder');
    const durationElement = container.querySelector('.video-duration');
    
    // 移除加载状态类
    container.classList.remove('video-item-loading');
    container.classList.add('video-item-loaded');
    
    // 创建缩略图元素
    const thumbnailImg = document.createElement('img');
    thumbnailImg.src = thumbnailUrl;
    thumbnailImg.alt = container.querySelector('.media-name').textContent;
    thumbnailImg.className = 'video-thumbnail';
    
    // 替换占位符为缩略图
    if (placeholder) {
        videoContainer.replaceChild(thumbnailImg, placeholder);
    } else {
        videoContainer.appendChild(thumbnailImg);
    }
    
    // 更新时长显示
    if (durationElement) {
        durationElement.textContent = duration;
    }
}

// 格式化日期显示
function formatDateForDisplay(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}年${month}月${day}日`;
}

// 打开媒体模态框
function openModal(index) {
    const modal = document.getElementById('mediaModal');
    const modalImage = document.getElementById('modalImage');
    const modalVideo = document.getElementById('modalVideo');
    const modalTitle = document.getElementById('modalTitle');
    const modalMeta = document.getElementById('modalMeta');
    const modalDescription = document.getElementById('modalDescription');
    
    currentIndex = index;
    const media = currentMedia[index];
    
    // 根据媒体类型设置模态框内容
    if (media.mediaType === 'image') {
        modalImage.src = media.url;
        modalImage.alt = media.name;
        modalImage.style.display = 'block';
        modalVideo.style.display = 'none';
        modalVideo.pause();
    } else if (media.mediaType === 'video') {
        modalVideo.src = media.url;
        modalVideo.style.display = 'block';
        modalImage.style.display = 'none';
        
        // 如果已经有生成的缩略图，设置为海报
        if (videoThumbnails[index]) {
            modalVideo.poster = videoThumbnails[index];
        }
    }
    
    // 设置模态框信息
    modalTitle.textContent = media.name;
    
    // 设置媒体元数据
    const formattedDate = formatDateForDisplay(media.date);
    
    if (media.mediaType === 'image') {
        modalMeta.innerHTML = `
            <span class="media-type-tag image-tag">图片</span>
            <span class="media-date">${formattedDate}</span>
        `;
    } else if (media.mediaType === 'video') {
        // 获取视频时长，如果已经获取则显示，否则显示"加载中"
        const duration = videoDurations[index] || '加载中...';
        
        modalMeta.innerHTML = `
            <span class="media-type-tag video-tag">视频</span>
            <span class="media-date">${formattedDate}</span>
            <span class="video-duration">时长: ${duration}</span>
        `;
    }
    
    modalDescription.textContent = media.description || '';
    
    // 显示模态框
    modal.style.display = 'block';
    
    // 更新导航按钮状态
    updateNavButtons();
}

// 关闭模态框
function closeModal() {
    const modal = document.getElementById('mediaModal');
    const modalVideo = document.getElementById('modalVideo');
    
    // 暂停视频播放
    modalVideo.pause();
    
    modal.style.display = 'none';
}

// 显示上一个媒体
function showPrevMedia() {
    if (currentIndex > 0) {
        currentIndex--;
        openModal(currentIndex);
    }
}

// 显示下一个媒体
function showNextMedia() {
    if (currentIndex < currentMedia.length - 1) {
        currentIndex++;
        openModal(currentIndex);
    }
}

// 更新导航按钮状态
function updateNavButtons() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    // 更新上一张按钮状态
    if (currentIndex === 0) {
        prevBtn.disabled = true;
        prevBtn.style.opacity = '0.5';
    } else {
        prevBtn.disabled = false;
        prevBtn.style.opacity = '1';
    }
    
    // 更新下一张按钮状态
    if (currentIndex === currentMedia.length - 1) {
        nextBtn.disabled = true;
        nextBtn.style.opacity = '0.5';
    } else {
        nextBtn.disabled = false;
        nextBtn.style.opacity = '1';
    }
}

// 初始化筛选按钮事件
function initFilterButtons() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // 移除所有按钮的active类
            filterButtons.forEach(btn => btn.classList.remove('active'));
            
            // 为当前按钮添加active类
            this.classList.add('active');
            
            // 更新当前筛选条件
            currentFilter = this.getAttribute('data-filter');
            
            // 重新渲染媒体网格
            renderMediaGrid(currentMedia);
            
            // 重新生成视频缩略图和获取时长
            generateVideoThumbnailsAndDurations();
        });
    });
}

// 初始化模态框事件
function initModalEvents() {
    const modal = document.getElementById('mediaModal');
    const closeBtn = document.querySelector('.close');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    // 关闭按钮点击事件
    closeBtn.addEventListener('click', closeModal);
    
    // 导航按钮点击事件
    prevBtn.addEventListener('click', showPrevMedia);
    nextBtn.addEventListener('click', showNextMedia);
    
    // 点击模态框背景关闭
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    // 键盘事件
    document.addEventListener('keydown', (e) => {
        if (modal.style.display === 'block') {
            switch(e.key) {
                case 'Escape':
                    closeModal();
                    break;
                case 'ArrowLeft':
                    showPrevMedia();
                    break;
                case 'ArrowRight':
                    showNextMedia();
                    break;
            }
        }
    });
}

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    loadMedia();
    initFilterButtons();
    initModalEvents();
});