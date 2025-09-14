const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_KEY
    );

    if (event.httpMethod === 'GET') {
        const { data, error } = await supabase.from('grammar').select('*');
        if (error) return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
        return { statusCode: 200, body: JSON.stringify(data) };
    } else if (event.httpMethod === 'POST') {
        const body = JSON.parse(event.body);
        const { japanese, chinese, example } = body;
        if (!japanese || !chinese) {
            return { statusCode: 400, body: JSON.stringify({ error: '缺少必要欄位' }) };
        }
        const { data, error } = await supabase
            .from('grammar')
            .insert({ japanese, chinese, example })
            .select();
        if (error) return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
        return { statusCode: 200, body: JSON.stringify({ success: true, grammar: data[0] }) };
    } else if (event.httpMethod === 'PUT') {
        const body = JSON.parse(event.body);
        const { id, japanese, chinese, example } = body;
        if (!id || !japanese || !chinese) {
            return { statusCode: 400, body: JSON.stringify({ error: '缺少必要欄位' }) };
        }
        const { data, error } = await supabase
            .from('grammar')
            .update({ japanese, chinese, example })
            .eq('id', id)
            .select();
        if (error) return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
        return { statusCode: 200, body: JSON.stringify({ success: true, grammar: data[0] }) };
    } else if (event.httpMethod === 'DELETE') {
        const body = JSON.parse(event.body);
        const { id } = body;
        if (!id) return { statusCode: 400, body: JSON.stringify({ error: '缺少必要欄位' }) };
        const { error } = await supabase.from('grammar').delete().eq('id', id);
        if (error) return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
        return { statusCode: 200, body: JSON.stringify({ success: true }) };
    } else {
        return { statusCode: 405, body: JSON.stringify({ error: '方法不支援' }) };
    }
};