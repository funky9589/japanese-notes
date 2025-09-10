document.addEventListener('DOMContentLoaded', function () {
    // 倒數計時器邏輯
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

    // 根據頁面確定資料來源和表單提交路徑
    const path = window.location.pathname;
    const isGrammarPage = path.includes('grammar.html');
    const isFunnyPage = path.includes('Good-for-Nothing.html');
    const dataFile = isGrammarPage ? '/grammar.json' : isFunnyPage ? '/Good-for-Nothing.json' : '/words.json';
    const apiEndpoint = isGrammarPage ? '/api/grammar' : isFunnyPage ? '/api/funny' : '/api/words';
    const cardLabels = isGrammarPage 
        ? { title: '日文文法', subtitle: '中文解釋', example: '例句' } 
        : isFunnyPage 
        ? { title: '標題', subtitle: '連結', description: '描述' } 
        : { title: '日文', subtitle: '中文', example: '例句', romaji: '羅馬拼音' };

    // 載入資料並顯示
    const notesContainer = document.getElementById('notes-container');
    const loadData = () => {
        fetch(dataFile, { cache: 'no-store' })
            .then(response => {
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response.json();
            })
            .then(items => {
                notesContainer.innerHTML = '';
                items.forEach(item => {
                    const card = document.createElement('div');
                    card.className = 'col';
                    card.innerHTML = `
                        <div class="card h-100">
                            <div class="card-body">
                                <h5 class="card-title">${item.title || item.japanese}</h5>
                                ${isFunnyPage ? `<p class="card-text"><strong>${cardLabels.subtitle}</strong>: <a href="${item.url}" target="_blank">${item.url}</a></p>` : `<p class="card-text"><strong>${cardLabels.subtitle}</strong>: ${item.chinese}</p>`}
                                ${isFunnyPage ? '' : isGrammarPage ? '' : `<p class="card-text"><strong>${cardLabels.romaji}</strong>: ${item.romaji}</p>`}
                                <p class="card-text"><strong>${cardLabels.example || cardLabels.description}</strong>: ${item.example || item.description || '無'}</p>
                                ${!isFunnyPage ? `
                                    <button class="btn btn-danger btn-sm delete-btn" data-id="${item.id}">刪除</button>
                                    <button class="btn btn-warning btn-sm edit-btn" data-id="${item.id}" data-japanese="${item.japanese}" data-chinese="${item.chinese}" data-romaji="${item.romaji || ''}" data-example="${item.example || ''}">編輯</button>
                                ` : ''}
                            </div>
                        </div>
                    `;
                    notesContainer.appendChild(card);
                });

                // 刪除事件監聽器
                document.querySelectorAll('.delete-btn').forEach(button => {
                    button.addEventListener('click', function () {
                        const id = this.getAttribute('data-id');
                        const endpoint = isGrammarPage ? '/api/grammar' : '/api/words';
                        if (confirm('確定要刪除此項目？')) {
                            fetch(`${endpoint}/${id}`, { method: 'DELETE' })
                                .then(response => response.json())
                                .then(data => {
                                    if (data.success) {
                                        loadData();
                                        document.getElementById('formFeedback').innerHTML = '<div class="alert alert-success">刪除成功！' + (data.gitSuccess ? '' : ' 但 Git 推送失敗，請檢查伺服器日誌。') + '</div>';
                                    } else {
                                        document.getElementById('formFeedback').innerHTML = '<div class="alert alert-danger">刪除失敗：' + data.message + '</div>';
                                    }
                                })
                                .catch(error => {
                                    console.error('刪除錯誤:', error);
                                    document.getElementById('formFeedback').innerHTML = '<div class="alert alert-danger">刪除失敗，請檢查網路連線。</div>';
                                });
                        }
                    });
                });

                // 編輯事件監聽器
                document.querySelectorAll('.edit-btn').forEach(button => {
                    button.addEventListener('click', function () {
                        const id = this.getAttribute('data-id');
                        const japanese = this.getAttribute('data-japanese');
                        const chinese = this.getAttribute('data-chinese');
                        const romaji = this.getAttribute('data-romaji');
                        const example = this.getAttribute('data-example');

                        document.getElementById(isGrammarPage ? 'japanese' : 'japanese').value = japanese;
                        document.getElementById('chinese').value = chinese;
                        if (!isGrammarPage) document.getElementById('romaji').value = romaji;
                        document.getElementById('example').value = example;
                        document.getElementById(isGrammarPage ? 'grammarForm' : 'wordForm').setAttribute('data-edit-id', id);
                    });
                });
            })
            .catch(error => {
                console.error('載入資料失敗:', error);
                notesContainer.innerHTML = '<p class="text-danger">無法載入資料，請稍後再試。</p>';
            });
    };

    if (notesContainer) {
        loadData();
    }

    // 處理表單提交
    const formId = isGrammarPage ? 'grammarForm' : isFunnyPage ? 'funnyForm' : 'wordForm';
    const form = document.getElementById(formId);
    const formFeedback = document.getElementById('formFeedback');
    if (form && formFeedback) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            const formData = new FormData(form);
            const editId = form.getAttribute('data-edit-id');
            const isEdit = !!editId;
            const endpoint = isEdit ? `${apiEndpoint}/${editId}` : apiEndpoint;
            const method = isEdit ? 'PUT' : 'POST';

            const newItem = isFunnyPage ? {
                title: formData.get('title'),
                url: formData.get('url'),
                description: formData.get('description')
            } : {
                japanese: formData.get('japanese'),
                chinese: formData.get('chinese'),
                ...(isGrammarPage ? {} : { romaji: formData.get('romaji') }),
                example: formData.get('example')
            };

            fetch(endpoint, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newItem)
            })
            .then(response => {
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    formFeedback.innerHTML = `<div class="alert alert-success">${isEdit ? '編輯' : '提交'}成功！` + (data.gitSuccess !== undefined && !data.gitSuccess ? ' 但 Git 推送失敗，請檢查伺服器日誌。' : '') + '</div>';
                    loadData();
                    form.reset();
                    form.removeAttribute('data-edit-id');
                } else {
                    formFeedback.innerHTML = `<div class="alert alert-danger">${isEdit ? '編輯' : '提交'}失敗：${data.message || '未知錯誤'}</div>`;
                }
            })
            .catch(error => {
                console.error('提交錯誤:', error);
                formFeedback.innerHTML = '<div class="alert alert-danger">提交失敗，請檢查網路連線或伺服器狀態。</div>';
            });
        });
    }
});