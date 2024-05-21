// Slide
const videos = document.querySelectorAll('.video')
const vPit = document.querySelectorAll('.v_pit')
liveVideo = 0

function showSlide(videoIndex) {
    liveVideo = videoIndex
    videos.forEach((video, index) => {
        video.style.display = index === liveVideo ? 'flex' : 'none'
        vPit[index].classList.toggle('live', index === liveVideo)
    })
}
showSlide(liveVideo)

document.querySelector('.v_next').addEventListener('click', nextSlide)
function nextSlide() {
    liveVideo = (liveVideo + 1) % videos.length
    videos[liveVideo].play()
    showSlide(liveVideo)
}

document.querySelector('.v_prev').addEventListener('click', () => {
    liveVideo = (liveVideo - 1 + videos.length) % videos.length
    videos[liveVideo].play()
    showSlide(liveVideo)
})


function goSlide(videoIndex) {
    videos[liveVideo].play()
    showSlide(videoIndex)
}

vPit.forEach((v_pit, index) => {
    v_pit.addEventListener('click', () => goSlide(index))
})

const iSlide = document.querySelector('.i_slide')
const pics = document.querySelectorAll('.pic')
const iPit = document.querySelectorAll('.i_pit')
let index = 0
let timer = 0
let time = 0

function setHeight() {
    setTimeout(() => {
        document.querySelector('.pics').style.height = document.querySelector('.pic').style.height = document.querySelector('.pic_s').offsetHeight + 'px'
    }, 750)
}
window.onresize = setHeight
setHeight()

function goIndex() {
    pics.forEach(pic => pic.className = 'pic')
    iPit.forEach(i_pit => i_pit.className = 'i_pit')
    pics[index].className = 'pic live'
    iPit[index].className = 'i_pit live'
    time = 0
}

document.querySelector('.i_next').addEventListener('click', goRight)
function goRight() {
    if (index == 3) {
        index = 0
    } else {
        index++
    }
    goIndex()
}

document.querySelector('.i_prev').addEventListener('click', () => {
    if (index == 0) {
        index = 3
    } else {
        index--
    }
    goIndex()
})

iPit.forEach(i_pit => i_pit.addEventListener('click', (e) => {
    const pitIndex = e.target.getAttribute('data-index')
    index = pitIndex
    goIndex()
}))

function slidePlay() {
    timer = setInterval(() => {
        time++
        if (time == 3) {
            goRight()
        }
    }, 1000)
}
slidePlay()

iSlide.onmousemove = () => clearInterval(timer)
iSlide.onmouseleave = slidePlay
// Slide

// IndexTop
document.onscroll = () => {
    let indexBox = document.querySelector('.index_top')
    if (document.documentElement.scrollTop > indexBox.offsetTop) {
        indexBox.style.cssText = 'position: fixed;top: 0;'
    } else {
        indexBox.style.cssText = 'position: relative;'
    }
}
// IndexTop

// CountdownTimer
const countDate = document.querySelectorAll(".count_date")
setInterval(() => {
    let nowDate = new Date()
    let newDate = new Date("2024/1/1 00:00:00")
    let times = (newDate - nowDate) / 1000
    let d = parseInt(times / 60 / 60 / 24)
    d = d < 10 ? "0" + d : d
    let h = parseInt(times / 60 / 60 % 24)
    h = h < 10 ? "0" + h : h
    let m = parseInt(times / 60 % 60)
    m = m < 10 ? "0" + m : m
    let s = parseInt(times % 60)
    s = s < 10 ? "0" + s : s
    let ds = String(d).split("")
    let hs = String(h).split("")
    let ms = String(m).split("")
    let ss = String(s).split("")
    countDate[0].innerHTML = ds[0]
    countDate[1].innerHTML = ds[1]
    countDate[2].innerHTML = hs[0]
    countDate[3].innerHTML = hs[1]
    countDate[4].innerHTML = ms[0]
    countDate[5].innerHTML = ms[1]
    countDate[6].innerHTML = ss[0]
    countDate[7].innerHTML = ss[1]
}, 1000)
// CountdownTimer

// TopButton
$(document).scroll(function () {
    let scrollTop = $(document).scrollTop()
    if (scrollTop > 1500) {
        $("#top_button").css("display", "block")
    } else {
        $("#top_button").css("display", "none")
    }
    $("#top_button").click(function () {
        $(document).scrollTop(0)
    })
})
// TopButton

// OnLoading
setTimeout(() => {
    $(".loading").fadeOut()
    $(document).scrollTop(0)
}, 3000)
// OnLoading