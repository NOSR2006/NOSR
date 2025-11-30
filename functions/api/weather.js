require('dotenv').config()
export async function onRequestGet({ request, env }) {
    const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    try {
        const url = new URL(request.url)
        const lat = url.searchParams.get('lat')
        const lon = url.searchParams.get('lon')
        if (!lat || !lon) return new Response(JSON.stringify({ error: '缺少经纬度' }), { status: 400, headers })
        const baiduUrl = `https://api.map.baidu.com/weather/v1/?location=${encodeURIComponent(lon)},${encodeURIComponent(lat)}&data_type=all&ak=${env.BAIDU_WEATHER}`
        try {
            const baiduRes = await fetch(baiduUrl)
            if (baiduRes.ok) {
                const baiduData = await baiduRes.json()
                return new Response(JSON.stringify(baiduData), { headers })
            }
        } catch (e) {
        }
        const OpenUrl = `https://api.openweathermap.org/data/2.5/weather?lon=${encodeURIComponent(lon)}&lat=${encodeURIComponent(lat)}&appid=${env.OPEN_WEATHER}&units=metric&lang=zh_cn`
        const OpenRes = await fetch(OpenUrl)
        if (!OpenRes.ok) return new Response(JSON.stringify({ error: '服务端失败' }), { status: OpenRes.status, headers })
        const OpenData = await OpenRes.json()
        return new Response(JSON.stringify(OpenData), { headers })
    } catch {
        return new Response(JSON.stringify({ error: '客户端失败' }), { status: 500, headers })
    }
}