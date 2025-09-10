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
        await fs.appendFile('error.log', `${new Date().toISOString()} - ${type}: ${error.message}\n`);
    } catch (logError) {
        console.error('日誌記錄失敗:', logError);
    }
};

// Load words
app.get('/api/words', async (req, res) => {
    try {
        const words = JSON.parse(await fs.readFile('words.json') || '[]');
        res.json(words);
    } catch (error) {
        await logError(error, 'read_words');
        console.error('讀取單字失敗:', error);
        res.status(500).json({ success: false, message: '無法讀取單字' });
    }
});

// Load grammar
app.get('/api/grammar', async (req, res) => {
    try {
        const grammar = JSON.parse(await fs.readFile('grammar.json') || '[]');
        res.json(grammar);
    } catch (error) {
        await logError(error, 'read_grammar');
        console.error('讀取文法失敗:', error);
        res.status(500).json({ success: false, message: '無法讀取文法' });
    }
});

// Load funny
app.get('/api/funny', async (req, res) => {
    try {
        const funny = JSON.parse(await fs.readFile('Good-for-Nothing.json') || '[]');
        res.json(funny);
    } catch (error) {
        await logError(error, 'read_funny');
        console.error('讀取資源失敗:', error);
        res.status(500).json({ success: false, message: '無法讀取資源' });
    }
});

// Add new word
app.post('/api/words', async (req, res) => {
    try {
        const { japanese, chinese, romaji, example } = req.body;
        if (!japanese || !chinese || !romaji) {
            return res.status(400).json({ success: false, message: '缺少必要欄位' });
        }

        const words = JSON.parse(await fs.readFile('words.json') || '[]');
        const newId = words.length > 0 ? Math.max(...words.map(w => w.id)) + 1 : 1;
        const newWord = { id: newId, japanese, chinese, romaji, example: example || '' };
        words.push(newWord);
        await fs.writeFile('words.json', JSON.stringify(words, null, 2));

        // Push to GitHub
        try {
            await execPromise('git init || true');
            await execPromise('git config user.name "Render Bot"');
            await execPromise('git config user.email "bot@render.com"');
            await execPromise('git add words.json');
            await execPromise('git commit -m "Add new word" || true');
            await execPromise(`git remote set-url origin https://${process.env.GIT_TOKEN}@github.com/funky9589/japanese-notes.git || git remote add origin https://${process.env.GIT_TOKEN}@github.com/funky9589/japanese-notes.git`);
            await execPromise('git fetch origin');
            await execPromise('git pull origin main --rebase');
            await execPromise('git push origin main');
        } catch (gitError) {
            await logError(gitError, 'git_push_words');
            console.error('Git 推送失敗 (words):', gitError);
        }

        res.json({ success: true, word: newWord });
    } catch (error) {
        await logError(error, 'add_words');
        console.error('提交錯誤 (words):', error);
        res.status(500).json({ success: false, message: '伺服器錯誤' });
    }
});

// Update word
app.put('/api/words/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { japanese, chinese, romaji, example } = req.body;
        if (!japanese || !chinese || !romaji) {
            return res.status(400).json({ success: false, message: '缺少必要欄位' });
        }

        const words = JSON.parse(await fs.readFile('words.json') || '[]');
        const index = words.findIndex(w => w.id === id);
        if (index === -1) {
            return res.status(404).json({ success: false, message: '單字不存在' });
        }

        words[index] = { id, japanese, chinese, romaji, example: example || '' };
        await fs.writeFile('words.json', JSON.stringify(words, null, 2));

        // Push to GitHub
        try {
            await execPromise('git init || true');
            await execPromise('git config user.name "Render Bot"');
            await execPromise('git config user.email "bot@render.com"');
            await execPromise('git add words.json');
            await execPromise('git commit -m "Update word" || true');
            await execPromise(`git remote set-url origin https://${process.env.GIT_TOKEN}@github.com/funky9589/japanese-notes.git || git remote add origin https://${process.env.GIT_TOKEN}@github.com/funky9589/japanese-notes.git`);
            await execPromise('git fetch origin');
            await execPromise('git pull origin main --rebase');
            await execPromise('git push origin main');
        } catch (gitError) {
            await logError(gitError, 'git_push_update_words');
            console.error('Git 推送失敗 (update word):', gitError);
        }

        res.json({ success: true, word: words[index] });
    } catch (error) {
        await logError(error, 'update_words');
        console.error('更新錯誤 (words):', error);
        res.status(500).json({ success: false, message: '伺服器錯誤' });
    }
});

// Delete word
app.delete('/api/words/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const words = JSON.parse(await fs.readFile('words.json') || '[]');
        const index = words.findIndex(w => w.id === id);
        if (index === -1) {
            return res.status(404).json({ success: false, message: '單字不存在' });
        }

        words.splice(index, 1);
        await fs.writeFile('words.json', JSON.stringify(words, null, 2));

        // Push to GitHub
        try {
            await execPromise('git init || true');
            await execPromise('git config user.name "Render Bot"');
            await execPromise('git config user.email "bot@render.com"');
            await execPromise('git add words.json');
            await execPromise('git commit -m "Delete word" || true');
            await execPromise(`git remote set-url origin https://${process.env.GIT_TOKEN}@github.com/funky9589/japanese-notes.git || git remote add origin https://${process.env.GIT_TOKEN}@github.com/funky9589/japanese-notes.git`);
            await execPromise('git fetch origin');
            await execPromise('git pull origin main --rebase');
            await execPromise('git push origin main');
        } catch (gitError) {
            await logError(gitError, 'git_push_delete_words');
            console.error('Git 推送失敗 (delete word):', gitError);
        }

        res.json({ success: true });
    } catch (error) {
        await logError(error, 'delete_words');
        console.error('刪除錯誤 (words):', error);
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

        const grammar = JSON.parse(await fs.readFile('grammar.json') || '[]');
        const newId = grammar.length > 0 ? Math.max(...grammar.map(g => g.id)) + 1 : 1;
        const newGrammar = { id: newId, japanese, chinese, example: example || '' };
        grammar.push(newGrammar);
        await fs.writeFile('grammar.json', JSON.stringify(grammar, null, 2));

        // Push to GitHub
        try {
            await execPromise('git init || true');
            await execPromise('git config user.name "Render Bot"');
            await execPromise('git config user.email "bot@render.com"');
            await execPromise('git add grammar.json');
            await execPromise('git commit -m "Add new grammar" || true');
            await execPromise(`git remote set-url origin https://${process.env.GIT_TOKEN}@github.com/funky9589/japanese-notes.git || git remote add origin https://${process.env.GIT_TOKEN}@github.com/funky9589/japanese-notes.git`);
            await execPromise('git fetch origin');
            await execPromise('git pull origin main --rebase');
            await execPromise('git push origin main');
        } catch (gitError) {
            await logError(gitError, 'git_push_grammar');
            console.error('Git 推送失敗 (grammar):', gitError);
        }

        res.json({ success: true, grammar: newGrammar });
    } catch (error) {
        await logError(error, 'add_grammar');
        console.error('提交錯誤 (grammar):', error);
        res.status(500).json({ success: false, message: '伺服器錯誤' });
    }
});

// Update grammar
app.put('/api/grammar/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { japanese, chinese, example } = req.body;
        if (!japanese || !chinese) {
            return res.status(400).json({ success: false, message: '缺少必要欄位' });
        }

        const grammar = JSON.parse(await fs.readFile('grammar.json') || '[]');
        const index = grammar.findIndex(g => g.id === id);
        if (index === -1) {
            return res.status(404).json({ success: false, message: '文法不存在' });
        }

        grammar[index] = { id, japanese, chinese, example: example || '' };
        await fs.writeFile('grammar.json', JSON.stringify(grammar, null, 2));

        // Push to GitHub
        try {
            await execPromise('git init || true');
            await execPromise('git config user.name "Render Bot"');
            await execPromise('git config user.email "bot@render.com"');
            await execPromise('git add grammar.json');
            await execPromise('git commit -m "Update grammar" || true');
            await execPromise(`git remote set-url origin https://${process.env.GIT_TOKEN}@github.com/funky9589/japanese-notes.git || git remote add origin https://${process.env.GIT_TOKEN}@github.com/funky9589/japanese-notes.git`);
            await execPromise('git fetch origin');
            await execPromise('git pull origin main --rebase');
            await execPromise('git push origin main');
        } catch (gitError) {
            await logError(gitError, 'git_push_update_grammar');
            console.error('Git 推送失敗 (update grammar):', gitError);
        }

        res.json({ success: true, grammar: grammar[index] });
    } catch (error) {
        await logError(error, 'update_grammar');
        console.error('更新錯誤 (grammar):', error);
        res.status(500).json({ success: false, message: '伺服器錯誤' });
    }
});

// Delete grammar
app.delete('/api/grammar/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const grammar = JSON.parse(await fs.readFile('grammar.json') || '[]');
        const index = grammar.findIndex(g => g.id === id);
        if (index === -1) {
            return res.status(404).json({ success: false, message: '文法不存在' });
        }

        grammar.splice(index, 1);
        await fs.writeFile('grammar.json', JSON.stringify(grammar, null, 2));

        // Push to GitHub
        try {
            await execPromise('git init || true');
            await execPromise('git config user.name "Render Bot"');
            await execPromise('git config user.email "bot@render.com"');
            await execPromise('git add grammar.json');
            await execPromise('git commit -m "Delete grammar" || true');
            await execPromise(`git remote set-url origin https://${process.env.GIT_TOKEN}@github.com/funky9589/japanese-notes.git || git remote add origin https://${process.env.GIT_TOKEN}@github.com/funky9589/japanese-notes.git`);
            await execPromise('git fetch origin');
            await execPromise('git pull origin main --rebase');
            await execPromise('git push origin main');
        } catch (gitError) {
            await logError(gitError, 'git_push_delete_grammar');
            console.error('Git 推送失敗 (delete grammar):', gitError);
        }

        res.json({ success: true });
    } catch (error) {
        await logError(error, 'delete_grammar');
        console.error('刪除錯誤 (grammar):', error);
        res.status(500).json({ success: false, message: '伺服器錯誤' });
    }
});

// Add new funny
app.post('/api/funny', async (req, res) => {
    try {
        const { title, url, description } = req.body;
        if (!title || !url) {
            return res.status(400).json({ success: false, message: '缺少必要欄位' });
        }

        const funny = JSON.parse(await fs.readFile('Good-for-Nothing.json') || '[]');
        const newId = funny.length > 0 ? Math.max(...funny.map(f => f.id)) + 1 : 1;
        const newFunny = { id: newId, title, url, description: description || '' };
        funny.push(newFunny);
        await fs.writeFile('Good-for-Nothing.json', JSON.stringify(funny, null, 2));

        // Push to GitHub
        try {
            await execPromise('git init || true');
            await execPromise('git config user.name "Render Bot"');
            await execPromise('git config user.email "bot@render.com"');
            await execPromise('git add Good-for-Nothing.json');
            await execPromise('git commit -m "Add new funny resource" || true');
            await execPromise(`git remote set-url origin https://${process.env.GIT_TOKEN}@github.com/funky9589/japanese-notes.git || git remote add origin https://${process.env.GIT_TOKEN}@github.com/funky9589/japanese-notes.git`);
            await execPromise('git fetch origin');
            await execPromise('git pull origin main --rebase');
            await execPromise('git push origin main');
        } catch (gitError) {
            await logError(gitError, 'git_push_funny');
            console.error('Git 推送失敗 (funny):', gitError);
        }

        res.json({ success: true, funny: newFunny });
    } catch (error) {
        await logError(error, 'add_funny');
        console.error('提交錯誤 (funny):', error);
        res.status(500).json({ success: false, message: '伺服器錯誤' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));