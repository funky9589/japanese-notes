document.addEventListener('DOMContentLoaded', function () {
    // 倒數計時器邏輯 (保持不變)
    const countdownElement = document.getElementById('countdown');
    if (countdownElement) {
        const targetDate = new Date('2025-12-07T00:00:00').getTime();
        setInterval(() => {
            const now = new Date().getTime();
            const distance = targetDate - now;
            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            countdownElement.innerHTML = `距離日文檢定還有 ${days} 天 ${hours} 小時 ${minutes} 分 ${seconds} 秒`;
        }, 1000);
    }

    // 根據頁面確定 API 路徑
    const path = window.location.pathname;
    const isUnitPage = path.includes('Unit.html');
    const apiEndpoint = isUnitPage ? '/.netlify/functions/unit' : path.includes('grammar.html') ? '/.netlify/functions/grammar' : path.includes('Good-for-Nothing.html') ? '/.netlify/functions/funny' : '/.netlify/functions/words';
    const cardLabels = isUnitPage 
        ? { title: '單元', subtitle: '發音', description: '說明' } 
        : path.includes('grammar.html') 
        ? { title: '日文文法', subtitle: '中文解釋', example: '例句' } 
        : path.includes('Good-for-Nothing.html') 
        ? { title: '標題', subtitle: '連結', description: '描述' } 
        : { title: '日文', subtitle: '中文', example: '例句', romaji: '羅馬拼音' };

    // 載入資料
    const notesContainer = document.getElementById('notes-container');
    const loadData = async () => {
        try {
            const response = await fetch(apiEndpoint);
            if (!response.ok) throw new Error('載入失敗: ' + response.statusText);
            const data = await response.json();
            if (notesContainer) {
                if (!Array.isArray(data)) {
                    notesContainer.innerHTML = '<p>無數據可用</p>';
                    return;
                }
                notesContainer.innerHTML = data.map(item => {
                    // 安全檢查每個屬性
                    const title = item[cardLabels.title] || '無標題';
                    const subtitle = cardLabels.subtitle ? (item[cardLabels.subtitle] || '') : '';
                    const example = cardLabels.example ? (item[cardLabels.example] || '') : '';
                    const romaji = cardLabels.romaji ? (item[cardLabels.romaji] || '') : '';
                    const description = cardLabels.description ? (item[cardLabels.description] || '') : '';
                    const id = item.id || '';

                    return `
                        <div class="col">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h5 class="card-title">${title}</h5>
                                    <p class="card-text">${subtitle}</p>
                                    ${example ? `<p class="card-text">${example}</p>` : ''}
                                    ${romaji ? `<p class="card-text">${romaji}</p>` : ''}
                                    ${description ? `<p class="card-text">${description}</p>` : ''}
                                    <button class="btn btn-danger btn-sm delete-btn" data-id="${id}">刪除</button>
                                    <button class="btn btn-primary btn-sm edit-btn" data-id="${id}">編輯</button>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        } catch (error) {
            console.error('載入數據錯誤:', error);
            if (notesContainer) notesContainer.innerHTML = '<p>載入錯誤，請重試</p>';
        }
    };

    if (notesContainer) {
        loadData();
    }

    // 提交表單
    const formId = isUnitPage ? 'unitForm' : path.includes('grammar.html') ? 'grammarForm' : path.includes('Good-for-Nothing.html') ? 'funnyForm' : 'wordForm';
    const form = document.getElementById(formId);
    const formFeedback = document.getElementById('formFeedback');
    if (form && formFeedback) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const data = Object.fromEntries(formData);
            try {
                const response = await fetch(apiEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                if (!response.ok) throw new Error('提交失敗: ' + response.statusText);
                const result = await response.json();
                if (result.success) {
                    formFeedback.textContent = '提交成功！';
                    formFeedback.className = 'alert alert-success';
                    loadData(); // 重新載入資料
                    form.reset();
                } else {
                    throw new Error(result.error || '提交失敗');
                }
            } catch (error) {
                formFeedback.textContent = `提交失敗，請重試: ${error.message}`;
                formFeedback.className = 'alert alert-danger';
                console.error('提交錯誤:', error);
            }
        });
    }

    // 刪除與編輯
    notesContainer.addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const id = e.target.dataset.id;
            if (!id) {
                console.error('刪除失敗: 無效 ID');
                return;
            }
            const response = await fetch(apiEndpoint, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            if (response.ok) {
                loadData();
            } else {
                console.error('刪除失敗:', await response.text());
            }
        } else if (e.target.classList.contains('edit-btn')) {
            const id = e.target.dataset.id;
            if (!id) {
                console.error('編輯失敗: 無效 ID');
                return;
            }
            // 編輯邏輯 (依需求實現)
            console.log('編輯 ID:', id);
        }
    });
});