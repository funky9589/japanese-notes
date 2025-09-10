const express = require('express');
const fs = require('fs').promises;
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const app = express();
app.use(express.json());
app.use(express.static('.'));

// 日誌記錄函數
const logError = async (error, type) => {
    try {
        await fs.appendFile('error.log', `${new Date().toISOString()} - ${type}: ${error.message}\n`, 'utf8');
    } catch (logError) {
        console.error('日誌記錄失敗:', logError);
    }
};

// 提供日誌端點（僅限開發使用，需添加安全措施）
app.get('/api/logs', async (req, res) => {
    try {
        const logs = await fs.readFile('error.log', 'utf8');
        res.send(logs);
    } catch (error) {
        await logError(error, 'read_logs');
        res.status(500).json({ success: false, message: '無法讀取日誌' });
    }
});

// Load words
app.get('/api/words', async (req, res) => {
    try {
        const words = JSON.parse(await fs.readFile('words.json', 'utf8') || '[]');
        res.json(words);
    } catch (error) {
        await logError(error, 'read_words');
        console.error('讀取單字失敗:', error);
        res.status(500).json({ success: false, message: '無法讀取單字' });
    }
});

// Add new word
app.post('/api/words', async (req, res) => {
    try {
        const { japanese, chinese, romaji, example } = req.body;
        if (!japanese || !chinese || !romaji) {
            return res.status(400).json({ success: false, message: '缺少必要欄位: japanese, chinese, romaji' });
        }

        let words = [];
        try {
            words = JSON.parse(await fs.readFile('words.json', 'utf8') || '[]');
        } catch (parseError) {
            await logError(parseError, 'parse_words');
            words = [];
        }
        const newId = words.length > 0 ? Math.max(...words.map(w => w.id)) + 1 : 1;
        const newWord = { id: newId, japanese, chinese, romaji, example: example || '' };
        words.push(newWord);
        await fs.writeFile('words.json', JSON.stringify(words, null, 2), 'utf8');

        let gitSuccess = true;
        try {
            await execPromise('git init || true');
            await execPromise('git config user.name "funky9589"'); // 使用你的 GitHub 名稱
            await execPromise('git config user.email "alanandy010@gmail.com"');
            await execPromise('git add words.json');
            await execPromise('git commit -m "Add new word" || true');
            await execPromise(`git remote set-url origin https://${process.env.GIT_TOKEN}@github.com/funky9589/japanese-notes.git || git remote add origin https://${process.env.GIT_TOKEN}@github.com/funky9589/japanese-notes.git`);
            await execPromise('git fetch origin');
            await execPromise('git pull origin main --rebase || true'); // 容錯處理衝突
            await execPromise('git push origin main');
        } catch (gitError) {
            gitSuccess = false;
            await logError(gitError, 'git_push_words');
            console.error('Git 推送失敗 (words):', gitError);
        }

        res.json({ success: true, word: newWord, gitSuccess: gitSuccess });
    } catch (error) {
        await logError(error, 'add_words');
        console.error('提交錯誤 (words):', error);
        res.status(500).json({ success: false, message: '伺服器錯誤: ' + error.message });
    }
});

// Update word
app.put('/api/words/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { japanese, chinese, romaji, example } = req.body;
        if (!japanese || !chinese || !romaji) {
            return res.status(400).json({ success: false, message: '缺少必要欄位: japanese, chinese, romaji' });
        }

        let words = [];
        try {
            words = JSON.parse(await fs.readFile('words.json', 'utf8') || '[]');
        } catch (parseError) {
            await logError(parseError, 'parse_words');
            words = [];
        }
        const index = words.findIndex(w => w.id === id);
        if (index === -1) {
            return res.status(404).json({ success: false, message: '單字不存在' });
        }

        words[index] = { id, japanese, chinese, romaji, example: example || '' };
        await fs.writeFile('words.json', JSON.stringify(words, null, 2), 'utf8');

        let gitSuccess = true;
        try {
            await execPromise('git init || true');
            await execPromise('git config user.name "funky9589"');
            await execPromise('git config user.email "alanandy010@gmail.com"');
            await execPromise('git add words.json');
            await execPromise('git commit -m "Update word" || true');
            await execPromise(`git remote set-url origin https://${process.env.GIT_TOKEN}@github.com/funky9589/japanese-notes.git || git remote add origin https://${process.env.GIT_TOKEN}@github.com/funky9589/japanese-notes.git`);
            await execPromise('git fetch origin');
            await execPromise('git pull origin main --rebase || true');
            await execPromise('git push origin main');
        } catch (gitError) {
            gitSuccess = false;
            await logError(gitError, 'git_push_update_words');
            console.error('Git 推送失敗 (update word):', gitError);
        }

        res.json({ success: true, word: words[index], gitSuccess: gitSuccess });
    } catch (error) {
        await logError(error, 'update_words');
        console.error('更新錯誤 (words):', error);
        res.status(500).json({ success: false, message: '伺服器錯誤: ' + error.message });
    }
});

// Delete word
app.delete('/api/words/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        let words = [];
        try {
            words = JSON.parse(await fs.readFile('words.json', 'utf8') || '[]');
        } catch (parseError) {
            await logError(parseError, 'parse_words');
            words = [];
        }
        const index = words.findIndex(w => w.id === id);
        if (index === -1) {
            return res.status(404).json({ success: false, message: '單字不存在' });
        }

        words.splice(index, 1);
        await fs.writeFile('words.json', JSON.stringify(words, null, 2), 'utf8');

        let gitSuccess = true;
        try {
            await execPromise('git init || true');
            await execPromise('git config user.name "funky9589"');
            await execPromise('git config user.email "alanandy010@gmail.com"');
            await execPromise('git add words.json');
            await execPromise('git commit -m "Delete word" || true');
            await execPromise(`git remote set-url origin https://${process.env.GIT_TOKEN}@github.com/funky9589/japanese-notes.git || git remote add origin https://${process.env.GIT_TOKEN}@github.com/funky9589/japanese-notes.git`);
            await execPromise('git fetch origin');
            await execPromise('git pull origin main --rebase || true');
            await execPromise('git push origin main');
        } catch (gitError) {
            gitSuccess = false;
            await logError(gitError, 'git_push_delete_words');
            console.error('Git 推送失敗 (delete word):', gitError);
        }

        res.json({ success: true, gitSuccess: gitSuccess });
    } catch (error) {
        await logError(error, 'delete_words');
        console.error('刪除錯誤 (words):', error);
        res.status(500).json({ success: false, message: '伺服器錯誤: ' + error.message });
    }
});

// 其他端點 (grammar, funny) 保持不變，僅展示 /api/words 相關修改

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));