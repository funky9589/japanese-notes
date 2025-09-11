const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

export default async (req, res) => {
    if (req.method === 'GET') {
        const { data, error } = await supabase.from('funny').select('*');
        if (error) return res.status(500).json({ error: error.message });
        res.status(200).json(data);
    } else if (req.method === 'POST') {
        const { title, url, description } = req.body;
        if (!title || !url) {
            return res.status(400).json({ error: '缺少必要欄位: title, url' });
        }
        const { data, error } = await supabase
            .from('funny')
            .insert({ title, url, description })
            .select();
        if (error) return res.status(500).json({ error: error.message });
        res.status(200).json({ success: true, funny: data[0] });
    } else if (req.method === 'PUT') {
        const { id, title, url, description } = req.body;
        if (!id || !title || !url) {
            return res.status(400).json({ error: '缺少必要欄位: id, title, url' });
        }
        const { data, error } = await supabase
            .from('funny')
            .update({ title, url, description })
            .eq('id', id)
            .select();
        if (error) return res.status(500).json({ error: error.message });
        res.status(200).json({ success: true, funny: data[0] });
    } else if (req.method === 'DELETE') {
        const { id } = req.body;
        if (!id) return res.status(400).json({ error: '缺少必要欄位: id' });
        const { error } = await supabase.from('funny').delete().eq('id', id);
        if (error) return res.status(500).json({ error: error.message });
        res.status(200).json({ success: true });
    } else {
        res.status(405).json({ error: '方法不支援' });
    }
};