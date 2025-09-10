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

// 提供日誌端點
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
        await initializeFile('words.json');
        let content = await fs.readFile('words.json', 'utf8');
        let words = [];
        try {
            words = JSON.parse(content || '[]');
        } catch (parseError) {
            await logError(parseError, 'parse_words');
            words = []; // 解析失敗時重置為空陣列
            await fs.writeFile('words.json', '[]', 'utf8'); // 修復損壞檔案
        }
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

        await initializeFile('words.json');
        let content = await fs.readFile('words.json', 'utf8');
        let words = [];
        try {
            words = JSON.parse(content || '[]');
        } catch (parseError) {
            await logError(parseError, 'parse_words');
            words = []; // 解析失敗時重置
            await fs.writeFile('words.json', '[]', 'utf8'); // 修復
        }
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
            await execPromise(`git remote set-url origin https://${process.env.GIT_TOKEN}@github.com/funky9589/japanese-notes.git || git remote add origin https://${process.env.GIT_TOKEN}@github.com/funky9589/japanese-notes.git`);
            await execPromise('git fetch origin');
            await execPromise('git pull origin main --rebase || true');
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

        await initializeFile('words.json');
        let content = await fs.readFile('words.json', 'utf8');
        let words = [];
        try {
            words = JSON.parse(content || '[]');
        } catch (parseError) {
            await logError(parseError, 'parse_words');
            words = [];
            await fs.writeFile('words.json', '[]', 'utf8');
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
        await initializeFile('words.json');
        let content = await fs.readFile('words.json', 'utf8');
        let words = [];
        try {
            words = JSON.parse(content || '[]');
        } catch (parseError) {
            await logError(parseError, 'parse_words');
            words = [];
            await fs.writeFile('words.json', '[]', 'utf8');
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

// Load grammar
app.get('/api/grammar', async (req, res) => {
    try {
        await initializeFile('grammar.json');
        let content = await fs.readFile('grammar.json', 'utf8');
        let grammar = [];
        try {
            grammar = JSON.parse(content || '[]');
        } catch (parseError) {
            await logError(parseError, 'parse_grammar');
            grammar = [];
            await fs.writeFile('grammar.json', '[]', 'utf8');
        }
        res.json(grammar);
    } catch (error) {
        await logError(error, 'read_grammar');
        console.error('讀取文法失敗:', error);
        res.status(500).json({ success: false, message: '無法讀取文法' });
    }
});

// Add new grammar
app.post('/api/grammar', async (req, res) => {
    try {
        const { japanese, chinese, example } = req.body;
        if (!japanese || !chinese) {
            return res.status(400).json({ success: false, message: '缺少必要欄位: japanese, chinese' });
        }

        await initializeFile('grammar.json');
        let content = await fs.readFile('grammar.json', 'utf8');
        let grammar = [];
        try {
            grammar = JSON.parse(content || '[]');
        } catch (parseError) {
            await logError(parseError, 'parse_grammar');
            grammar = [];
            await fs.writeFile('grammar.json', '[]', 'utf8');
        }
        const newId = grammar.length > 0 ? Math.max(...grammar.map(g => g.id)) + 1 : 1;
        const newGrammar = { id: newId, japanese, chinese, example: example || '' };
        grammar.push(newGrammar);
        await fs.writeFile('grammar.json', JSON.stringify(grammar, null, 2), 'utf8');

        let gitSuccess = true;
        try {
            await execPromise('git init || true');
            await execPromise('git config user.name "funky9589"');
            await execPromise('git config user.email "alanandy010@gmail.com"');
            await execPromise('git add grammar.json');
            await execPromise('git commit -m "Add new grammar" || true');
            await execPromise(`git remote set-url origin https://${process.env.GIT_TOKEN}@github.com/funky9589/japanese-notes.git || git remote add origin https://${process.env.GIT_TOKEN}@github.com/funky9589/japanese-notes.git`);
            await execPromise('git fetch origin');
            await execPromise('git pull origin main --rebase || true');
            await execPromise('git push origin main');
        } catch (gitError) {
            gitSuccess = false;
            await logError(gitError, 'git_push_grammar');
            console.error('Git 推送失敗 (grammar):', gitError);
        }

        res.json({ success: true, grammar: newGrammar, gitSuccess: gitSuccess });
    } catch (error) {
        await logError(error, 'add_grammar');
        console.error('提交文法錯誤:', error);
        res.status(500).json({ success: false, message: '伺服器錯誤: ' + error.message });
    }
});

// Update grammar
app.put('/api/grammar/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { japanese, chinese, example } = req.body;
        if (!japanese || !chinese) {
            return res.status(400).json({ success: false, message: '缺少必要欄位: japanese, chinese' });
        }

        await initializeFile('grammar.json');
        let content = await fs.readFile('grammar.json', 'utf8');
        let grammar = [];
        try {
            grammar = JSON.parse(content || '[]');
        } catch (parseError) {
            await logError(parseError, 'parse_grammar');
            grammar = [];
            await fs.writeFile('grammar.json', '[]', 'utf8');
        }
        const index = grammar.findIndex(g => g.id === id);
        if (index === -1) {
            return res.status(404).json({ success: false, message: '文法不存在' });
        }

        grammar[index] = { id, japanese, chinese, example: example || '' };
        await fs.writeFile('grammar.json', JSON.stringify(grammar, null, 2), 'utf8');

        let gitSuccess = true;
        try {
            await execPromise('git init || true');
            await execPromise('git config user.name "funky9589"');
            await execPromise('git config user.email "alanandy010@gmail.com"');
            await execPromise('git add grammar.json');
            await execPromise('git commit -m "Update grammar" || true');
            await execPromise(`git remote set-url origin https://${process.env.GIT_TOKEN}@github.com/funky9589/japanese-notes.git || git remote add origin https://${process.env.GIT_TOKEN}@github.com/funky9589/japanese-notes.git`);
            await execPromise('git fetch origin');
            await execPromise('git pull origin main --rebase || true');
            await execPromise('git push origin main');
        } catch (gitError) {
            gitSuccess = false;
            await logError(gitError, 'git_push_update_grammar');
            console.error('Git 推送失敗 (update grammar):', gitError);
        }

        res.json({ success: true, grammar: grammar[index], gitSuccess: gitSuccess });
    } catch (error) {
        await logError(error, 'update_grammar');
        console.error('更新文法錯誤:', error);
        res.status(500).json({ success: false, message: '伺服器錯誤: ' + error.message });
    }
});

// Delete grammar
app.delete('/api/grammar/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await initializeFile('grammar.json');
        let content = await fs.readFile('grammar.json', 'utf8');
        let grammar = [];
        try {
            grammar = JSON.parse(content || '[]');
        } catch (parseError) {
            await logError(parseError, 'parse_grammar');
            grammar = [];
            await fs.writeFile('grammar.json', '[]', 'utf8');
        }
        const index = grammar.findIndex(g => g.id === id);
        if (index === -1) {
            return res.status(404).json({ success: false, message: '文法不存在' });
        }

        grammar.splice(index, 1);
        await fs.writeFile('grammar.json', JSON.stringify(grammar, null, 2), 'utf8');

        let gitSuccess = true;
        try {
            await execPromise('git init || true');
            await execPromise('git config user.name "funky9589"');
            await execPromise('git config user.email "alanandy010@gmail.com"');
            await execPromise('git add grammar.json');
            await execPromise('git commit -m "Delete grammar" || true');
            await execPromise(`git remote set-url origin https://${process.env.GIT_TOKEN}@github.com/funky9589/japanese-notes.git || git remote add origin https://${process.env.GIT_TOKEN}@github.com/funky9589/japanese-notes.git`);
            await execPromise('git fetch origin');
            await execPromise('git pull origin main --rebase || true');
            await execPromise('git push origin main');
        } catch (gitError) {
            gitSuccess = false;
            await logError(gitError, 'git_push_delete_grammar');
            console.error('Git 推送失敗 (delete grammar):', gitError);
        }

        res.json({ success: true, gitSuccess: gitSuccess });
    } catch (error) {
        await logError(error, 'delete_grammar');
        console.error('刪除文法錯誤:', error);
        res.status(500).json({ success: false, message: '伺服器錯誤: ' + error.message });
    }
});

// Load funny
app.get('/api/funny', async (req, res) => {
    try {
        await initializeFile('funny.json');
        let content = await fs.readFile('funny.json', 'utf8');
        let funny = [];
        try {
            funny = JSON.parse(content || '[]');
        } catch (parseError) {
            await logError(parseError, 'parse_funny');
            funny = [];
            await fs.writeFile('funny.json', '[]', 'utf8');
        }
        res.json(funny);
    } catch (error) {
        await logError(error, 'read_funny');
        console.error('讀取小廢物失敗:', error);
        res.status(500).json({ success: false, message: '無法讀取小廢物' });
    }
});

// Add new funny
app.post('/api/funny', async (req, res) => {
    try {
        const { title, url, description } = req.body;
        if (!title || !url) {
            return res.status(400).json({ success: false, message: '缺少必要欄位: title, url' });
        }

        await initializeFile('funny.json');
        let content = await fs.readFile('funny.json', 'utf8');
        let funny = [];
        try {
            funny = JSON.parse(content || '[]');
        } catch (parseError) {
            await logError(parseError, 'parse_funny');
            funny = [];
            await fs.writeFile('funny.json', '[]', 'utf8');
        }
        const newId = funny.length > 0 ? Math.max(...funny.map(f => f.id)) + 1 : 1;
        const newFunny = { id: newId, title, url, description: description || '' };
        funny.push(newFunny);
        await fs.writeFile('funny.json', JSON.stringify(funny, null, 2), 'utf8');

        let gitSuccess = true;
        try {
            await execPromise('git init || true');
            await execPromise('git config user.name "funky9589"');
            await execPromise('git config user.email "alanandy010@gmail.com"');
            await execPromise('git add funny.json');
            await execPromise('git commit -m "Add new funny" || true');
            await execPromise(`git remote set-url origin https://${process.env.GIT_TOKEN}@github.com/funky9589/japanese-notes.git || git remote add origin https://${process.env.GIT_TOKEN}@github.com/funky9589/japanese-notes.git`);
            await execPromise('git fetch origin');
            await execPromise('git pull origin main --rebase || true');
            await execPromise('git push origin main');
        } catch (gitError) {
            gitSuccess = false;
            await logError(gitError, 'git_push_funny');
            console.error('Git 推送失敗 (funny):', gitError);
        }

        res.json({ success: true, funny: newFunny, gitSuccess: gitSuccess });
    } catch (error) {
        await logError(error, 'add_funny');
        console.error('提交小廢物錯誤:', error);
        res.status(500).json({ success: false, message: '伺服器錯誤: ' + error.message });
    }
});

// Update funny
app.put('/api/funny/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { title, url, description } = req.body;
        if (!title || !url) {
            return res.status(400).json({ success: false, message: '缺少必要欄位: title, url' });
        }

        await initializeFile('funny.json');
        let content = await fs.readFile('funny.json', 'utf8');
        let funny = [];
        try {
            funny = JSON.parse(content || '[]');
        } catch (parseError) {
            await logError(parseError, 'parse_funny');
            funny = [];
            await fs.writeFile('funny.json', '[]', 'utf8');
        }
        const index = funny.findIndex(f => f.id === id);
        if (index === -1) {
            return res.status(404).json({ success: false, message: '小廢物不存在' });
        }

        funny[index] = { id, title, url, description: description || '' };
        await fs.writeFile('funny.json', JSON.stringify(funny, null, 2), 'utf8');

        let gitSuccess = true;
        try {
            await execPromise('git init || true');
            await execPromise('git config user.name "funky9589"');
            await execPromise('git config user.email "alanandy010@gmail.com"');
            await execPromise('git add funny.json');
            await execPromise('git commit -m "Update funny" || true');
            await execPromise(`git remote set-url origin https://${process.env.GIT_TOKEN}@github.com/funky9589/japanese-notes.git || git remote add origin https://${process.env.GIT_TOKEN}@github.com/funky9589/japanese-notes.git`);
            await execPromise('git fetch origin');
            await execPromise('git pull origin main --rebase || true');
            await execPromise('git push origin main');
        } catch (gitError) {
            gitSuccess = false;
            await logError(gitError, 'git_push_update_funny');
            console.error('Git 推送失敗 (update funny):', gitError);
        }

        res.json({ success: true, funny: funny[index], gitSuccess: gitSuccess });
    } catch (error) {
        await logError(error, 'update_funny');
        console.error('更新小廢物錯誤:', error);
        res.status(500).json({ success: false, message: '伺服器錯誤: ' + error.message });
    }
});

// Delete funny
app.delete('/api/funny/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await initializeFile('funny.json');
        let content = await fs.readFile('funny.json', 'utf8');
        let funny = [];
        try {
            funny = JSON.parse(content || '[]');
        } catch (parseError) {
            await logError(parseError, 'parse_funny');
            funny = [];
            await fs.writeFile('funny.json', '[]', 'utf8');
        }
        const index = funny.findIndex(f => f.id === id);
        if (index === -1) {
            return res.status(404).json({ success: false, message: '小廢物不存在' });
        }

        funny.splice(index, 1);
        await fs.writeFile('funny.json', JSON.stringify(funny, null, 2), 'utf8');

        let gitSuccess = true;
        try {
            await execPromise('git init || true');
            await execPromise('git config user.name "funky9589"');
            await execPromise('git config user.email "alanandy010@gmail.com"');
            await execPromise('git add funny.json');
            await execPromise('git commit -m "Delete funny" || true');
            await execPromise(`git remote set-url origin https://${process.env.GIT_TOKEN}@github.com/funky9589/japanese-notes.git || git remote add origin https://${process.env.GIT_TOKEN}@github.com/funky9589/japanese-notes.git`);
            await execPromise('git fetch origin');
            await execPromise('git pull origin main --rebase || true');
            await execPromise('git push origin main');
        } catch (gitError) {
            gitSuccess = false;
            await logError(gitError, 'git_push_delete_funny');
            console.error('Git 推送失敗 (delete funny):', gitError);
        }

        res.json({ success: true, gitSuccess: gitSuccess });
    } catch (error) {
        await logError(error, 'delete_funny');
        console.error('刪除小廢物錯誤:', error);
        res.status(500).json({ success: false, message: '伺服器錯誤: ' + error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));