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

    // 載入單字並顯示
    const notesContainer = document.getElementById('notes-container');
    if (notesContainer) {
        fetch('/words.json')
            .then(response => response.json())
            .then(words => {
                words.forEach(word => {
                    const card = document.createElement('div');
                    card.className = 'col';
                    card.innerHTML = `
                        <div class="card h-100">
                            <div class="card-body">
                                <h5 class="card-title">${word.japanese}</h5>
                                <p class="card-text"><strong>中文</strong>: ${word.chinese}</p>
                                <p class="card-text"><strong>羅馬拼音</strong>: ${word.romaji}</p>
                                <p class="card-text"><strong>例句</strong>: ${word.example || '無'}</p>
                            </div>
                        </div>
                    `;
                    notesContainer.appendChild(card);
                });
            })
            .catch(error => {
                console.error('載入單字失敗:', error);
                notesContainer.innerHTML = '<p class="text-danger">無法載入單字，請稍後再試。</p>';
            });
    }

    // 處理表單提交
    const wordForm = document.getElementById('wordForm');
    const formFeedback = document.getElementById('formFeedback');
    if (wordForm && formFeedback) {
        wordForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const formData = new FormData(wordForm);
            const newWord = {
                japanese: formData.get('japanese'),
                chinese: formData.get('chinese'),
                romaji: formData.get('romaji'),
                example: formData.get('example')
            };

            fetch('/api/words', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newWord)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    formFeedback.innerHTML = '<div class="alert alert-success">單字提交成功！</div>';
                    const card = document.createElement('div');
                    card.className = 'col';
                    card.innerHTML = `
                        <div class="card h-100">
                            <div class="card-body">
                                <h5 class="card-title">${newWord.japanese}</h5>
                                <p class="card-text"><strong>中文</strong>: ${newWord.chinese}</p>
                                <p class="card-text"><strong>羅馬拼音</strong>: ${newWord.romaji}</p>
                                <p class="card-text"><strong>例句</strong>: ${newWord.example || '無'}</p>
                            </div>
                        </div>
                    `;
                    notesContainer.prepend(card);
                    wordForm.reset();
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