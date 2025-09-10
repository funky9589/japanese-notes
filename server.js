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
        await fs.appendFile('error.log', `${new Date().toISOString()} - ${type}: ${error.message}\n${error.stderr || ''}\n`, 'utf8');
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

// Load words
app.get('/api/words', async (req, res) => {
    try {
        await initializeFile('words.json');
        const words = JSON.parse(await fs.readFile('words.json', 'utf8') || '[]');
        res.json(words);
    } catch (error) {
        await logError(error, 'read_words');
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

            const { stdout: statusOutput } = await execPromise('git status --porcelain');
            if (statusOutput) {
                await execPromise('git stash || true');
            }

            await execPromise(`git remote set-url origin https://${process.env.GIT_TOKEN}@github.com/funky9589/japanese-notes.git || git remote add origin https://${process.env.GIT_TOKEN}@github.com/funky9589/japanese-notes.git`);
            await execPromise('git fetch origin');
            await execPromise('git pull origin main --rebase || true');
            const { stderr: pushError } = await execPromise('git push origin main');
            if (pushError && !pushError.includes('Everything up-to-date')) {
                throw new Error('Git push failed: ' + pushError);
            }

            if (statusOutput) {
                await execPromise('git stash pop || true');
            }
        } catch (gitError) {
            gitSuccess = false;
            await logError(gitError, 'git_push_words');
        }

        res.json({ success: true, word: newWord, gitSuccess: gitSuccess });
    } catch (error) {
        await logError(error, 'add_words');
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
        let words = JSON.parse(await fs.readFile('words.json', 'utf8') || '[]');
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

            const { stdout: statusOutput } = await execPromise('git status --porcelain');
            if (statusOutput) {
                await execPromise('git stash || true');
            }

            await execPromise(`git remote set-url origin https://${process.env.GIT_TOKEN}@github.com/funky9589/japanese-notes.git || git remote add origin https://${process.env.GIT_TOKEN}@github.com/funky9589/japanese-notes.git`);
            await execPromise('git fetch origin');
            await execPromise('git pull origin main --rebase || true');
            const { stderr: pushError } = await execPromise('git push origin main');
            if (pushError && !pushError.includes('Everything up-to-date')) {
                throw new Error('Git push failed: ' + pushError);
            }

            if (statusOutput) {
                await execPromise('git stash pop || true');
            }
        } catch (gitError) {
            gitSuccess = false;
            await logError(gitError, 'git_push_words');
        }

        res.json({ success: true, word: words[index], gitSuccess: gitSuccess });
    } catch (error) {
        await logError(error, 'update_words');
        res.status(500).json({ success: false, message: '伺服器錯誤: ' + error.message });
    }
});

// Delete word
app.delete('/api/words/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await initializeFile('words.json');
        let words = JSON.parse(await fs.readFile('words.json', 'utf8') || '[]');
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

            const { stdout: statusOutput } = await execPromise('git status --porcelain');
            if (statusOutput) {
                await execPromise('git stash || true');
            }

            await execPromise(`git remote set-url origin https://${process.env.GIT_TOKEN}@github.com/funky9589/japanese-notes.git || git remote add origin https://${process.env.GIT_TOKEN}@github.com/funky9589/japanese-notes.git`);
            await execPromise('git fetch origin');
            await execPromise('git pull origin main --rebase || true');
            const { stderr: pushError } = await execPromise('git push origin main');
            if (pushError && !pushError.includes('Everything up-to-date')) {
                throw new Error('Git push failed: ' + pushError);
            }

            if (statusOutput) {
                await execPromise('git stash pop || true');
            }
        } catch (gitError) {
            gitSuccess = false;
            await logError(gitError, 'git_push_words');
        }

        res.json({ success: true, gitSuccess: gitSuccess });
    } catch (error) {
        await logError(error, 'delete_words');
        res.status(500).json({ success: false, message: '伺服器錯誤: ' + error.message });
    }
});

// Load grammar
app.get('/api/grammar', async (req, res) => {
    try {
        await initializeFile('grammar.json');
        const grammar = JSON.parse(await fs.readFile('grammar.json', 'utf8') || '[]');
        res.json(grammar);
    } catch (error) {
        await logError(error, 'read_grammar');
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
        let grammar = JSON.parse(await fs.readFile('grammar.json', 'utf8') || '[]');
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

            const { stdout: statusOutput } = await execPromise('git status --porcelain');
            if (statusOutput) {
                await execPromise('git stash || true');
            }

            await execPromise(`git remote set-url origin https://${process.env.GIT_TOKEN}@github.com/funky9589/japanese-notes.git || git remote add origin https://${process.env.GIT_TOKEN}@github.com/funky9589/japanese-notes.git`);
            await execPromise('git fetch origin');
            await execPromise('git pull origin main --rebase || true');
            const { stderr: pushError } = await execPromise('git push origin main');
            if (pushError && !pushError.includes('Everything up-to-date')) {
                throw new Error('Git push failed: ' + pushError);
            }

            if (statusOutput) {
                await execPromise('git stash pop || true');
            }
        } catch (gitError) {
            gitSuccess = false;
            await logError(gitError, 'git_push_grammar');
        }

        res.json({ success: true, grammar: newGrammar, gitSuccess: gitSuccess });
    } catch (error) {
        await logError(error, 'add_grammar');
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
        let grammar = JSON.parse(await fs.readFile('grammar.json', 'utf8') || '[]');
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

            const { stdout: statusOutput } = await execPromise('git status --porcelain');
            if (statusOutput) {
                await execPromise('git stash || true');
            }

            await execPromise(`git remote set-url origin https://${process.env.GIT_TOKEN}@github.com/funky9589/japanese-notes.git || git remote add origin https://${process.env.GIT_TOKEN}@github.com/funky9589/japanese-notes.git`);
            await execPromise('git fetch origin');
            await execPromise('git pull origin main --rebase || true');
            const { stderr: pushError } = await execPromise('git push origin main');
            if (pushError && !pushError.includes('Everything up-to-date')) {
                throw new Error('Git push failed: ' + pushError);
            }

            if (statusOutput) {
                await execPromise('git stash pop || true');
            }
        } catch (gitError) {
            gitSuccess = false;
            await logError(gitError, 'git_push_grammar');
        }

        res.json({ success: true, grammar: grammar[index], gitSuccess: gitSuccess });
    } catch (error) {
        await logError(error, 'update_grammar');
        res.status(500).json({ success: false, message: '伺服器錯誤: ' + error.message });
    }
});

// Delete grammar
app.delete('/api/grammar/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await initializeFile('grammar.json');
        let grammar = JSON.parse(await fs.readFile('grammar.json', 'utf8') || '[]');
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

            const { stdout: statusOutput } = await execPromise('git status --porcelain');
            if (statusOutput) {
                await execPromise('git stash || true');
            }

            await execPromise(`git remote set-url origin https://${process.env.GIT_TOKEN}@github.com/funky9589/japanese-notes.git || git remote add origin https://${process.env.GIT_TOKEN}@github.com/funky9589/japanese-notes.git`);
            await execPromise('git fetch origin');
            await execPromise('git pull origin main --rebase || true');
            const { stderr: pushError } = await execPromise('git push origin main');
            if (pushError && !pushError.includes('Everything up-to-date')) {
                throw new Error('Git push failed: ' + pushError);
            }

            if (statusOutput) {
                await execPromise('git stash pop || true');
            }
        } catch (gitError) {
            gitSuccess = false;
            await logError(gitError, 'git_push_grammar');
        }

        res.json({ success: true, gitSuccess: gitSuccess });
    } catch (error) {
        await logError(error, 'delete_grammar');
        res.status(500).json({ success: false, message: '伺服器錯誤: ' + error.message });
    }
});

// Load funny
app.get('/api/funny', async (req, res) => {
    try {
        await initializeFile('funny.json');
        const funny = JSON.parse(await fs.readFile('funny.json', 'utf8') || '[]');
        res.json(funny);
    } catch (error) {
        await logError(error, 'read_funny');
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
        let funny = JSON.parse(await fs.readFile('funny.json', 'utf8') || '[]');
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

            const { stdout: statusOutput } = await execPromise('git status --porcelain');
            if (statusOutput) {
                await execPromise('git stash || true');
            }

            await execPromise(`git remote set-url origin https://${process.env.GIT_TOKEN}@github.com/funky9589/japanese-notes.git || git remote add origin https://${process.env.GIT_TOKEN}@github.com/funky9589/japanese-notes.git`);
            await execPromise('git fetch origin');
            await execPromise('git pull origin main --rebase || true');
            const { stderr: pushError } = await execPromise('git push origin main');
            if (pushError && !pushError.includes('Everything up-to-date')) {
                throw new Error('Git push failed: ' + pushError);
            }

            if (statusOutput) {
                await execPromise('git stash pop || true');
            }
        } catch (gitError) {
            gitSuccess = false;
            await logError(gitError, 'git_push_funny');
        }

        res.json({ success: true, funny: newFunny, gitSuccess: gitSuccess });
    } catch (error) {
        await logError(error, 'add_funny');
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
        let funny