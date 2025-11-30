export async function onRequestGet({ request, env }) {
    const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    try {
        const url = new URL(request.url)
        const lat = url.searchParams.get('lat')
        const lon = url.searchParams.get('lon')
        if (!lat || !lon) return new Response(JSON.stringify({ error: '缺少经纬度' }), { status: 400, headers })
        const res = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&appid=${env.WEATHER_API}&units=metric&lang=zh_cn`
        )
        if (!res.ok) return new Response(JSON.stringify({ error: '服务端失败' }), { status: res.status, headers })
        const data = await res.json()
        return new Response(JSON.stringify(data), { headers })
    } catch {
        return new Response(JSON.stringify({ error: '客户端失败' }), { status: 500, headers })
    }
}