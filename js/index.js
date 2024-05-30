$(window).on('resize', setHeight)
function setHeight() {
    setTimeout(() => {
        $('.pic_list, .pic').css('height', $('.pic_item').outerHeight())
    }, 250)
}

$.ajax({
    url: "https://api.oioweb.cn/api/bing",
    type: "GET",
    success: (data) => {
        localStorage.setItem('data', JSON.stringify(data));
        $('.pic_item').each(function (i) {
            $(this).attr('src', data.result[i].url)
        })
        setHeight()
        goIndex()
    }
})

let index = 0
const pots = $('.pot')
const pics = $('.pic')
const pict = JSON.parse(localStorage.getItem('data'))
function goIndex() {
    pics.removeClass('live')
    pots.removeClass('live')
    pics.eq(index).addClass('live')
    pots.eq(index).addClass('live')
    $('.pic_txt1').html(pict.result[index].title)
    $('.pic_txt2').html(pict.result[index].copyright)
    time = 0
}

$('#pot_right').on('click', goRight)
function goRight() {
    index = (index + 1) % pics.length
    goIndex()
}

$('#pot_left').on('click', () => {
    index = (index - 1 + pics.length) % pics.length
    goIndex()
})

$('.pot').on('click', function () {
    index = $(this).data('index')
    goIndex()
})

$('.pot').on('mouseenter', function () {
    $(this).siblings('.pot').not(this).css('background-color', '#0d1117')
}).on('mouseleave', function () {
    $(this).siblings('.pot').css('background-color', '')
})

let time = 0
setInterval(() => {
    if (time === 3) {
        goRight()
    } else {
        time++
    }
}, 1000)

navigator.geolocation.getCurrentPosition((i) => {
    $.ajax({
        url: `https://api.oioweb.cn/api/ip/geocoder?lng=${i.coords.longitude}&lat=${i.coords.latitude}`,
        type: "GET",
        success: (loc) => {
            $('#wea1').text('城市：' + loc.result.ad_info.city)
            $.ajax({
                url: `https://api.oioweb.cn/api/weather/weather?city_name=${loc.result.ad_info.city}`,
                type: "GET",
                success: (data) => {
                    $('.top_right label').text('提 醒：' + data.result.tips)
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