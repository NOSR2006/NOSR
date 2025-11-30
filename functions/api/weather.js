export async function onRequestGet(context) {
    const { request, env } = context
    const url = new URL(request.url)
    const lat = url.searchParams.get('lat')
    const lon = url.searchParams.get('lon')

    const apiKey = env.WEATHER_API
    if (!apiKey || !lat || !lon) {
        return new Response(JSON.stringify({ error: '参数缺失' }), { status: 400 })
    }

    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=zh_cn`
    const response = await fetch(weatherUrl)
    const data = await response.json()

    return new Response(JSON.stringify(data), {
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    })
}