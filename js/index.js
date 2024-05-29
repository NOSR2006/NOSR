window.onresize = setHeight
function setHeight() {
    setTimeout(() => {
        document.querySelector('.pic_list').style.height = document.querySelector('.pic').style.height = document.querySelector('.pic_item').offsetHeight + 'px'
        document.querySelector('.top').style.height = document.querySelector('.milky').offsetHeight + 'px'
    }, 100)
}

let pic = 0
$.ajax({
    url: "https://api.oioweb.cn/api/bing",
    type: "GET",
    success: function (data) {
        localStorage.setItem('data', JSON.stringify(data))
        goIndex()
        document.querySelectorAll('.pic_item').forEach(function (item) {
            if (pic < data.result.length) {
                item.src = data.result[pic].url
                setHeight()
                pic++
            }
        })
    }
})

let index = 0
const pots = document.querySelectorAll('.pot')
const pics = document.querySelectorAll('.pic')
const pict = JSON.parse(localStorage.getItem('data'))
function goIndex() {
    pics.forEach(pic => pic.className = 'pic')
    pots.forEach(pot => pot.className = 'pot')
    pics[index].className = 'pic live'
    pots[index].className = 'pot live'
    time = 0
    document.querySelector('.pic_txt1').innerHTML = pict.result[index].title
    document.querySelector('.pic_txt2').innerHTML = pict.result[index].copyright
}

document.querySelector('#pot_right').addEventListener('click', goRight)
function goRight() {
    if (index == pics.length - 1) {
        index = 0
    } else {
        index++
    }
    goIndex()
}
document.querySelector('#pot_left').addEventListener('click', () => {
    if (index == 0) {
        index = pics.length - 1
    } else {
        index--
    }
    goIndex()
})

pots.forEach(pot => pot.addEventListener('click', (e) => {
    const potIndex = e.target.getAttribute('data-index')
    index = potIndex
    goIndex()
}))

let time = 0
setInterval(() => {
    if (time == 3) {
        goRight()
        time = 0
    } else {
        time++
    }
}, 1000)

navigator.geolocation.getCurrentPosition((i) => {
    $.ajax({
        url: `https://api.oioweb.cn/api/ip/geocoder?lng=${i.coords.longitude}&lat=${i.coords.latitude}`,
        type: "GET",
        success: function (loc) {
            $('#wea0').text('城市：' + loc.result.ad_info.city)
            $.ajax({
                url: `https://api.oioweb.cn/api/weather/weather?city_name=${loc.result.ad_info.city}`,
                type: "GET",
                success: function (data) {
                    $('#wea1').text('日 期：' + data.result.forecast_list[1].date)
                    $('#wea2').text('天 气：' + data.result.hourly_forecast[1].condition)
                    $('#wea3').text('空 气：' + data.result.quality_level)
                    $('#wea4').text('风 向：' + data.result.wind_direction)
                    $('#wea5').text('风 力：' + data.result.wind_level + '级')
                    $('#wea6').text('气 温：' + data.result.hourly_forecast[1].temperature + '°C')
                    $('#wea7').text('最 高：' + data.result.high_temperature + '°C')
                    $('#wea8').text('最 低：' + data.result.low_temperature + '°C')
                }
            })
        }
    })
})