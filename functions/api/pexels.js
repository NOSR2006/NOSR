export async function onRequestGet({ request, env }) {
    const url = new URL(request.url)
    const res = await fetch(
        `https://api.pexels.com/v1/curated?page=${Math.ceil(Math.random() * 100)}&per_page=${url.searchParams.get('count')}`,
        { headers: { Authorization: env.PEXELS } }
    )
    const data = await res.json()
    return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
}