$(window).resize(setHeight)
function setHeight() {
    $('.pic_list, .pic').css('height', $('.pic_item').outerHeight())
}

let titles = []
$.each($('.pic_item'), function () {
    $.getJSON('https://api.vvhan.com/api/bing?type=json&rand=sj', data => {
        $(this).attr('src', data.data.url)
        titles.push(data.data.title)
        setHeight()
        goIndex()
    })
})

let index = 0
const pics = $('.pic')
const pots = $('.pot')
function goIndex() {
    pics.removeClass('live').eq(index).addClass('live')
    pots.removeClass('live').eq(index).addClass('live')
    $('.sli_txt').text(titles[index])
    time = 0
}

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

$.getJSON('https://api.vvhan.com/api/weather', data => {
    $('.top_right label').text('提 醒：' + data.tip)
    $('#wea1').text('城 市：' + data.city)
    $('#wea2').text('日 期：' + data.data.week)
    $('#wea3').text('天 气：' + data.data.type)
    $('#wea4').text('空 气：' + data.air.aqi_name)
    $('#wea5').text('风 向：' + data.data.fengxiang)
    $('#wea6').text('风 力：' + data.data.fengli)
    $('#wea7').text('最 高：' + data.data.high)
    $('#wea8').text('最 低：' + data.data.low)
})