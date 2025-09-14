const { createClient } = require('@supabase/supabase-js');
const querystring = require('querystring');

exports.handler = async (event, context) => {
    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_KEY
    );

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
        return { statusCode: 500, body: JSON.stringify({ error: '缺少 Supabase 環境變數' }) };
    }

    if (event.httpMethod === 'GET') {
        const { data, error } = await supabase.from('grammar').select('*');
        if (error) return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
        return { statusCode: 200, body: JSON.stringify(data) };
    } else if (event.httpMethod === 'POST') {
        if (!event.body) {
            return { statusCode: 400, body: JSON.stringify({ error: '無請求主體' }) };
        }
        const body = querystring.parse(event.body);
        const { japanese, chinese, example } = body;
        if (!japanese || !chinese) {
            return { statusCode: 400, body: JSON.stringify({ error: '缺少必要欄位' }) };
        }
        const { data, error } = await supabase
            .from('grammar')
            .insert({ japanese, chinese, example })
            .select();
        if (error) return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
        return { statusCode: 200, body: JSON.stringify({ success: true, word: data[0] || null }) };
    } else if (event.httpMethod === 'PUT') {
        if (!event.body) {
            return { statusCode: 400, body: JSON.stringify({ error: '無請求主體' }) };
        }
        const body = querystring.parse(event.body);
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
        if (!data || data.length === 0) {
            return { statusCode: 404, body: JSON.stringify({ error: '記錄未找到' }) };
        }
        return { statusCode: 200, body: JSON.stringify({ success: true, word: data[0] }) };
    } else if (event.httpMethod === 'DELETE') {
        if (!event.body) {
            return { statusCode: 400, body: JSON.stringify({ error: '無請求主體' }) };
        }
        const body = querystring.parse(event.body);
        const { id } = body;
        if (!id) return { statusCode: 400, body: JSON.stringify({ error: '缺少必要欄位' }) };
        const { error } = await supabase.from('grammar').delete().eq('id', id);
        if (error) return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
        return { statusCode: 200, body: JSON.stringify({ success: true }) };
    } else {
        return { statusCode: 405, body: JSON.stringify({ error: '方法不支援' }) };
    }
};