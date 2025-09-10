const express = require('express');
const fs = require('fs').promises;
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const app = express();
app.use(express.json());
app.use(express.static('.')); // 提供靜態檔案（HTML、CSS、JS、JSON）

// 載入單字
app.get('/api/words', async (req, res) => {
    try {
        const words = JSON.parse(await fs.readFile('words.json'));
        res.json(words);
    } catch (error) {
        res.status(500).json({ success: false, message: '無法讀取單字' });
    }
});

// 新增單字
app.post('/api/words', async (req, res) => {
    try {
        const { japanese, chinese, romaji, example } = req.body;
        if (!japanese || !chinese || !romaji) {
            return res.status(400).json({ success: false, message: '缺少必要欄位' });
        }

        const words = JSON.parse(await fs.readFile('words.json'));
        const newId = words.length > 0 ? Math.max(...words.map(w => w.id)) + 1 : 1;
        const newWord = { id: newId, japanese, chinese, romaji, example: example || '' };
        words.push(newWord);
        await fs.writeFile('words.json', JSON.stringify(words, null, 2));

        // 推送到 GitHub
        try {
            await execPromise('git config user.name "Render Bot"');
            await execPromise('git config user.email "bot@render.com"');
            await execPromise('git add words.json');
            await execPromise('git commit -m "Add new word"');
            await execPromise('git push origin main');
        } catch (gitError) {
            console.error('Git 推送失敗:', gitError);
            // 不因 Git 失敗影響提交
        }

        res.json({ success: true, word: newWord });
    } catch (error) {
        console.error('提交錯誤:', error);
        res.status(500).json({ success: false, message: '伺服器錯誤' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));