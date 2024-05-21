// ImageAPI
$.ajax({
    url: 'https://api.oioweb.cn/api/bing',
    datatype: 'json',
    type: 'get',
    success: (a) => {
        console.log(a)
        $('#pic1').attr('src', a.result[0].url)
        $('#pic2').attr('src', a.result[1].url)
        $('#pic3').attr('src', a.result[2].url)
        $('#pic4').attr('src', a.result[3].url)
    }
})

// Weather API
$('.search').click(() => {
    $.ajax({
        url: 'https://api.oioweb.cn/api/weather/weather?city_name=' + $('.cities').val(),
        datatype: 'json',
        type: 'get',
        success: (a) => {
            console.log(a)
            $('#api1').text('日期: ' + a.result.forecast_list[1].date)
            $('#api2').text('天气: ' + a.result.hourly_forecast[1].condition)
            $('#api3').text('空气: ' + a.result.quality_level)
            $('#api4').text('风向: ' + a.result.wind_direction)
            $('#api5').text('风力: ' + a.result.wind_level + '级')
            $('#api6').text('气温: ' + a.result.hourly_forecast[1].temperature + '°')
            $('#api7').text('最高: ' + a.result.high_temperature + '°')
            $('#api8').text('最低: ' + a.result.low_temperature + '°')
        }
    })
})