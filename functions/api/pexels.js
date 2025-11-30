export async function onRequestGet({ env }) {
    try {
        const res = await fetch(
            `https://api.pexels.com/v1/curated?page=${Math.ceil(Math.random() * 100)}&per_page=7`,
            { headers: { Authorization: env.PEXELS } }
        )
        if (!res.ok) return new Response(JSON.stringify({ error: '服务端失败' }), { status: res.status })
        const data = await res.json()
        return new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        })
    } catch {
        return new Response(JSON.stringify({ error: '客户端失败' }), { status: 500 })
    }
}