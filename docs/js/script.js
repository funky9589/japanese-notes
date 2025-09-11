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

    // 根據頁面確定資料來源
    const path = window.location.pathname;
    const isGrammarPage = path.includes('grammar.html');
    const isFunnyPage = path.includes('Good-for-Nothing.html');
    const dataFile = isGrammarPage ? 'grammar.json' : isFunnyPage ? 'funny.json' : 'words.json';
    const cardLabels = isGrammarPage 
        ? { title: '日文文法', subtitle: '中文解釋', example: '例句' } 
        : isFunnyPage 
        ? { title: '標題', subtitle: '連結', description: '描述' } 
        : { title: '日文', subtitle: '中文', example: '例句', romaji: '羅馬拼音' };

    // 載入資料並顯示
    const notesContainer = document.getElementById('notes-container');
    const loadData = () => {
        let items = JSON.parse(localStorage.getItem(dataFile) || '[]');
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
                if (confirm('確定要刪除此項目？')) {
                    let items = JSON.parse(localStorage.getItem(dataFile) || '[]');
                    items = items.filter(item => item.id !== parseInt(id));
                    localStorage.setItem(dataFile, JSON.stringify(items));
                    loadData();
                    document.getElementById('formFeedback').innerHTML = '<div class="alert alert-success">刪除成功！</div>';
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
            let items = JSON.parse(localStorage.getItem(dataFile) || '[]');

            const newItem = isFunnyPage ? {
                id: editId || items.length + 1,
                title: formData.get('title'),
                url: formData.get('url'),
                description: formData.get('description')
            } : {
                id: editId || items.length + 1,
                japanese: formData.get('japanese'),
                chinese: formData.get('chinese'),
                ...(isGrammarPage ? {} : { romaji: formData.get('romaji') }),
                example: formData.get('example')
            };

            if (isEdit) {
                const index = items.findIndex(item => item.id === parseInt(editId));
                if (index !== -1) items[index] = newItem;
            } else {
                items.push(newItem);
            }

            localStorage.setItem(dataFile, JSON.stringify(items));

            formFeedback.innerHTML = `<div class="alert alert-success">${isEdit ? '編輯' : '提交'}成功！</div>`;
            loadData();
            form.reset();
            form.removeAttribute('data-edit-id');
        });
    }
});