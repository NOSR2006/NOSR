export async function onRequestGet({ env }) {
    const res = await fetch(
        `https://api.pexels.com/v1/curated?page=${Math.ceil(Math.random() * 100)}&per_page=7`,
        { headers: { Authorization: env.PEXELS } }
    )
    const data = await res.json()
    return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
}