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

// 初始化或檢查檔案
const initializeFile = async (filename) => {
    try {
        await fs.access(filename);
    } catch {
        await fs.writeFile(filename, '[]', 'utf8');
        await execPromise('git add ' + filename + ' || true');
        await execPromise('git commit -m "Initialize ' + filename + '" || true');
    }
};

// Add new word
app.post('/api/words', async (req, res) => {
    try {
        const { japanese, chinese, romaji, example } = req.body;
        if (!japanese || !chinese || !romaji) {
            return res.status(400).json({ success: false, message: '缺少必要欄位: japanese, chinese, romaji' });
        }

        await initializeFile('words.json');
        let words = JSON.parse(await fs.readFile('words.json', 'utf8') || '[]');
        const newId = words.length > 0 ? Math.max(...words.map(w => w.id)) + 1 : 1;
        const newWord = { id: newId, japanese, chinese, romaji, example: example || '' };
        words.push(newWord);
        await fs.writeFile('words.json', JSON.stringify(words, null, 2), 'utf8');

        let gitSuccess = true;
        try {
            await execPromise('git init || true');
            await execPromise('git config user.name "funky9589"');
            await execPromise('git config user.email "alanandy010@gmail.com"');
            await execPromise('git add words.json');
            await execPromise('git commit -m "Add new word" || true');

            // 檢查本地狀態並處理衝突
            const { stdout: statusOutput } = await execPromise('git status --porcelain');
            if (statusOutput) {
                await execPromise('git stash || true'); // 暫存本地更改
            }

            await execPromise(`git remote set-url origin https://${process.env.GIT_TOKEN}@github.com/funky9589/japanese-notes.git || git remote add origin https://${process.env.GIT_TOKEN}@github.com/funky9589/japanese-notes.git`);
            await execPromise('git fetch origin');
            await execPromise('git pull origin main --rebase || true');
            await execPromise('git push origin main');

            if (statusOutput) {
                await execPromise('git stash pop || true'); // 恢復暫存
            }
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

// 其他端點 (get/put/delete for words, grammar, funny) 保持類似邏輯，僅更新 Git 部分
// 以下為範例，完整代碼請參考前述版本並應用相同修改

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));