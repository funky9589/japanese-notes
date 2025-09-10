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
    const cardLabels = isGrammarPage ? 
        { title: '日文文法', subtitle: '中文解釋', example: '例句' } : 
        isFunnyPage ? 
        { title: '標題', subtitle: '連結', description: '描述' } : 
        { title: '日文', subtitle: '中文', example: '例句', romaji: '羅馬拼音' };

    // 載入資料並顯示
    const notesContainer = document.getElementById('notes-container');
    if (notesContainer) {
        fetch(dataFile)
            .then(response => response.json())
            .then(items => {
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
                            </div>
                        </div>
                    `;
                    notesContainer.appendChild(card);
                });
            })
            .catch(error => {
                console.error('載入資料失敗:', error);
                notesContainer.innerHTML = '<p class="text-danger">無法載入資料，請稍後再試。</p>';
            });
    }

    // 處理表單提交
    const formId = isGrammarPage ? 'grammarForm' : isFunnyPage ? 'funnyForm' : 'wordForm';
    const form = document.getElementById(formId);
    const formFeedback = document.getElementById('formFeedback');
    if (form && formFeedback) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            const formData = new FormData(form);
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

            fetch(apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newItem)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    formFeedback.innerHTML = '<div class="alert alert-success">提交成功！</div>';
                    const card = document.createElement('div');
                    card.className = 'col';
                    card.innerHTML = `
                        <div class="card h-100">
                            <div class="card-body">
                                <h5 class="card-title">${newItem.title || newItem.japanese}</h5>
                                ${isFunnyPage ? `<p class="card-text"><strong>${cardLabels.subtitle}</strong>: <a href="${newItem.url}" target="_blank">${newItem.url}</a></p>` : `<p class="card-text"><strong>${cardLabels.subtitle}</strong>: ${newItem.chinese}</p>`}
                                ${isFunnyPage ? '' : isGrammarPage ? '' : `<p class="card-text"><strong>${cardLabels.romaji}</strong>: ${newItem.romaji}</p>`}
                                <p class="card-text"><strong>${cardLabels.example || cardLabels.description}</strong>: ${newItem.example || newItem.description || '無'}</p>
                            </div>
                        </div>
                    `;
                    notesContainer.prepend(card);
                    form.reset();
                } else {
                    formFeedback.innerHTML = '<div class="alert alert-danger">提交失敗：' + data.message + '</div>';
                }
            })
            .catch(error => {
                console.error('提交錯誤:', error);
                formFeedback.innerHTML = '<div class="alert alert-danger">提交失敗，請檢查網路連線。</div>';
            });
        });
    }
});