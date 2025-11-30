let topBgm = $(".top_bgm")
$(window).resize(setHeight)
function setHeight() {
    $('.pic_list, .pic').css('height', $('.pic_item').outerHeight())
    topBgm.css('height', $('.top_box').outerHeight())
}

$(window).on('scroll', () => {
    if ($(this).scrollTop() > topBgm.offset().top) {
        $('.top_box').addClass('show')
        $('.top_left').addClass('show')
        $('.top_right').addClass('show')
        $('.top_wea').addClass('show')
    } else {
        $('.show').removeClass('show');
    }
})

let index = 0
let titles = []
const pics = $('.pic')
const pots = $('.pot')
function goIndex() {
    pics.removeClass('live').eq(index).addClass('live')
    pots.removeClass('live').eq(index).addClass('live')
    $('.sli_txt').text(titles[index])
    time = 0
}

$.ajax({
    url: `https://api.pexels.com/v1/curated?page=${Math.ceil(Math.random() * 100)}&per_page=7`,
    method: 'GET',
    headers: {
        'Authorization': PexelsAPI
    },
    success: function (data) {
        console.log('Pexels_API: ', data)
        $('.pic_item').each(function (i) {
            if ($(this).attr('src')) {
                titles.push("The future will come")
            } else {
                $(this).attr('src', data.photos[i].src.original)
                titles.push(data.photos[i].alt)
            }
        })
        setHeight()
        goIndex()
    }
})

$('#right').click(goRight)
function goRight() {
    index = (index + 1) % pics.length
    goIndex()
}

$('#left').on('click', () => {
    index = (index - 1 + pics.length) % pics.length
    goIndex()
})

$('.pot').on('click', function () {
    index = $(this).data('index')
    goIndex()
})

$('.pot').hover(
    function () {
        $(this).siblings('.pot').not(this).css('background-color', '#0d1117')
    },
    function () {
        $(this).siblings('.pot').css('background-color', '')
    }
)

let timer
let time = 0
function setTime() {
    timer = setInterval(() => {
        if (time === 3) goRight()
        else time++
    }, 1000)
}

setTime()
const ctrl = $('.ctrl div')
$('.slider').hover(
    function () {
        clearInterval(timer)
        ctrl.css('transform', 'scale(1)')
    },
    function () {
        setTime()
        ctrl.css('transform', 'scale(0)')
    }
)

ctrl.hover(
    function () {
        $(this).css('transform', 'scale(1.35)')
    },
    function () {
        $(this).css('transform', 'scale(1)')
    }
)

navigator.geolocation.getCurrentPosition(i => {
    $.getJSON(`/api/weather?lat=${i.coords.latitude}&lon=${i.coords.longitude}`, data => {
        console.log('Weather_API: ', data);
        let today = new Date(data.dt * 1000 + 2592000000)
        $('.top_right label').text('日 期: ' + today.getFullYear() + '年' + today.getMonth() + '月' + today.getDate() + '日')
        $('#wea1').text('天 气: ' + data.weather[0].description)
        $('#wea2').text('视 距: ' + data.visibility / 1000 + ' 公 里')
        $('#wea3').text('湿 度: ' + data.main.humidity + ' %')
        $('#wea4').text('云 量: ' + data.clouds.all + ' %')
        $('#wea5').text('气 温: ' + data.main.temp + ' C')
        $('#wea6').text('体 感: ' + data.main.feels_like + ' C')
        $('#wea7').text('最 高: ' + data.main.temp_max + ' C')
        $('#wea8').text('最 低: ' + data.main.temp_min + ' C')
    })
})

$(function () {
    setTimeout(() => {
        $('.mask').fadeOut(1500)
        $('.mask p').text('Ending')
    }, 1500)
    setHeight()
})