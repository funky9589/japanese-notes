const { createClient } = require('@supabase/supabase-js');
const querystring = require('querystring');

exports.handler = async (event, context) => {
    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_KEY
    );

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
        return { 
            statusCode: 500, 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: '缺少 Supabase 環境變數' }) 
        };
    }

    if (event.httpMethod === 'GET') {
        const { data, error } = await supabase.from('words').select('*');
        if (error) return { 
            statusCode: 500, 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: error.message }) 
        };
        return { 
            statusCode: 200, 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data) 
        };
    } else if (event.httpMethod === 'POST') {
        if (!event.body) {
            return { 
                statusCode: 400, 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: '無請求主體' }) 
            };
        }
        const body = querystring.parse(event.body);
        const { japanese, chinese, example, romaji } = body;
        if (!japanese || !chinese || !romaji) {
            return { 
                statusCode: 400, 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: '缺少必要欄位' }) 
            };
        }
        const { data, error } = await supabase
            .from('words')
            .insert({ japanese, chinese, example, romaji })
            .select();
        if (error) return { 
            statusCode: 500, 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: error.message }) 
        };
        return { 
            statusCode: 200, 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: true, words: data || [] }) 
        };
    } else if (event.httpMethod === 'PUT') {
        if (!event.body) {
            return { 
                statusCode: 400, 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: '無請求主體' }) 
            };
        }
        const body = querystring.parse(event.body);
        const { id, japanese, chinese, example, romaji } = body;
        if (!id || !japanese || !chinese || !romaji) {
            return { 
                statusCode: 400, 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: '缺少必要欄位' }) 
            };
        }
        const { data, error } = await supabase
            .from('words')
            .update({ japanese, chinese, example, romaji })
            .eq('id', id)
            .select();
        if (error) return { 
            statusCode: 500, 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: error.message }) 
        };
        if (!data || data.length === 0) {
            return { 
                statusCode: 404, 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: '記錄未找到' }) 
            };
        }
        return { 
            statusCode: 200, 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: true, words: data }) 
        };
    } else if (event.httpMethod === 'DELETE') {
        if (!event.body) {
            return { 
                statusCode: 400, 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: '無請求主體' }) 
            };
        }
        const body = querystring.parse(event.body);
        const { id } = body;
        if (!id) return { 
            statusCode: 400, 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: '缺少必要欄位' }) 
        };
        const { error } = await supabase.from('words').delete().eq('id', id);
        if (error) return { 
            statusCode: 500, 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: error.message }) 
        };
        return { 
            statusCode: 200, 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: true }) 
        };
    } else {
        return { 
            statusCode: 405, 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: '方法不支援' }) 
        };
    }
};