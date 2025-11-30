export async function onRequestGet({ request, env }) {
    const url = new URL(request.url)
    const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lon=${url.searchParams.get('lon')}&lat=${url.searchParams.get('lat')}&appid=${env.OPEN_WEATHER}&units=metric&lang=zh_cn`
    )
    const data = await res.json()
    return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
}