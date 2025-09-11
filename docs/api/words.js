const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

export default async (req, res) => {
    if (req.method === 'GET') {
        const { data, error } = await supabase.from('words').select('*');
        if (error) return res.status(500).json({ error: error.message });
        res.status(200).json(data);
    } else if (req.method === 'POST') {
        const { japanese, chinese, romaji, example } = req.body;
        if (!japanese || !chinese) {
            return res.status(400).json({ error: '缺少必要欄位: japanese, chinese' });
        }
        const { data, error } = await supabase
            .from('words')
            .insert({ japanese, chinese, romaji, example })
            .select();
        if (error) return res.status(500).json({ error: error.message });
        res.status(200).json({ success: true, word: data[0] });
    } else if (req.method === 'PUT') {
        const { id, japanese, chinese, romaji, example } = req.body;
        if (!id || !japanese || !chinese) {
            return res.status(400).json({ error: '缺少必要欄位: id, japanese, chinese' });
        }
        const { data, error } = await supabase
            .from('words')
            .update({ japanese, chinese, romaji, example })
            .eq('id', id)
            .select();
        if (error) return res.status(500).json({ error: error.message });
        res.status(200).json({ success: true, word: data[0] });
    } else if (req.method === 'DELETE') {
        const { id } = req.body;
        if (!id) return res.status(400).json({ error: '缺少必要欄位: id' });
        const { error } = await supabase.from('words').delete().eq('id', id);
        if (error) return res.status(500).json({ error: error.message });
        res.status(200).json({ success: true });
    } else {
        res.status(405).json({ error: '方法不支援' });
    }
};