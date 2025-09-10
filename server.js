const express = require('express');
const fs = require('fs').promises;
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const app = express();
app.use(express.json());
app.use(express.static('.')); // Serve static files (HTML, CSS, JS, JSON)

// Load words
app.get('/api/words', async (req, res) => {
    try {
        const words = JSON.parse(await fs.readFile('words.json'));
        res.json(words);
    } catch (error) {
        res.status(500).json({ success: false, message: '無法讀取單字' });
    }
});

// Load grammar
app.get('/api/grammar', async (req, res) => {
    try {
        const grammar = JSON.parse(await fs.readFile('grammar.json'));
        res.json(grammar);
    } catch (error) {
        res.status(500).json({ success: false, message: '無法讀取文法' });
    }
});

// Add new word
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

        // Push to GitHub
        try {
            await execPromise('git config user.name "Render Bot"');
            await execPromise('git config user.email "bot@render.com"');
            await execPromise('git add words.json');
            await execPromise('git commit -m "Add new word"');
            await execPromise(`git remote set-url origin https://${process.env.GIT_TOKEN}@github.com/YOUR_USERNAME/japanese-notes.git`);
            await execPromise('git push origin main');
        } catch (gitError) {
            console.error('Git 推送失敗 (words):', gitError);
        }

        res.json({ success: true, word: newWord });
    } catch (error) {
        console.error('提交錯誤 (words):', error);
        res.status(500).json({ success: false, message: '伺服器錯誤' });
    }
});

// Add new grammar
app.post('/api/grammar', async (req, res) => {
    try {
        const { japanese, chinese, example } = req.body;
        if (!japanese || !chinese) {
            return res.status(400).json({ success: false, message: '缺少必要欄位' });
        }

        const grammar = JSON.parse(await fs.readFile('grammar.json'));
        const newId = grammar.length > 0 ? Math.max(...grammar.map(g => g.id)) + 1 : 1;
        const newGrammar = { id: newId, japanese, chinese, example: example || '' };
        grammar.push(newGrammar);
        await fs.writeFile('grammar.json', JSON.stringify(grammar, null, 2));

        // Push to GitHub
        try {
            await execPromise('git config user.name "Render Bot"');
            await execPromise('git config user.email "bot@render.com"');
            await execPromise('git add grammar.json');
            await execPromise('git commit -m "Add new grammar"');
            await execPromise(`git remote set-url origin https://${process.env.GIT_TOKEN}@github.com/YOUR_USERNAME/japanese-notes.git`);
            await execPromise('git push origin main');
        } catch (gitError) {
            console.error('Git 推送失敗 (grammar):', gitError);
        }

        res.json({ success: true, grammar: newGrammar });
    } catch (error) {
        console.error('提交錯誤 (grammar):', error);
        res.status(500).json({ success: false, message: '伺服器錯誤' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));