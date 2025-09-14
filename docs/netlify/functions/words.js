const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_KEY
    );

    if (event.httpMethod === 'GET') {
        const { data, error } = await supabase.from('words').select('*');
        if (error) return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
        return { statusCode: 200, body: JSON.stringify(data) };
    } else if (event.httpMethod === 'POST') {
        const body = JSON.parse(event.body);
        const { japanese, chinese, romaji, example } = body;
        if (!japanese || !chinese) {
            return { statusCode: 400, body: JSON.stringify({ error: '缺少必要欄位' }) };
        }
        const { data, error } = await supabase
            .from('words')
            .insert({ japanese, chinese, romaji, example })
            .select();
        if (error) return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
        return { statusCode: 200, body: JSON.stringify({ success: true, word: data[0] }) };
    } else if (event.httpMethod === 'PUT') {
        const body = JSON.parse(event.body);
        const { id, japanese, chinese, romaji, example } = body;
        if (!id || !japanese || !chinese) {
            return { statusCode: 400, body: JSON.stringify({ error: '缺少必要欄位' }) };
        }
        const { data, error } = await supabase
            .from('words')
            .update({ japanese, chinese, romaji, example })
            .eq('id', id)
            .select();
        if (error) return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
        return { statusCode: 200, body: JSON.stringify({ success: true, word: data[0] }) };
    } else if (event.httpMethod === 'DELETE') {
        const body = JSON.parse(event.body);
        const { id } = body;
        if (!id) return { statusCode: 400, body: JSON.stringify({ error: '缺少必要欄位' }) };
        const { error } = await supabase.from('words').delete().eq('id', id);
        if (error) return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
        return { statusCode: 200, body: JSON.stringify({ success: true }) };
    } else {
        return { statusCode: 405, body: JSON.stringify({ error: '方法不支援' }) };
    }
};