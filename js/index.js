window.onload = function () {
    let all = document.querySelector('.slider')
    let pots = document.querySelectorAll('.pot')
    let pics = document.querySelectorAll('.pic')
    let left = document.getElementById('b_left')
    let right = document.getElementById('b_right')
    let index = 0
    let time = 0
    let pic = 0
    let timer

    function setHeight() {
        document.querySelector('.pic_list').style.height = document.querySelector('.pic').style.height = document.querySelector('.pic_item').offsetHeight + 'px'
        document.querySelector('.top').style.height = document.querySelector('.milky').offsetHeight + 'px'
    }
    window.onresize = setHeight
    $.ajax({
        url: "https://api.oioweb.cn/api/bing",
        type: "GET",
        success: function (data) {
            document.querySelectorAll('.pic_item').forEach(function (item) {
                if (pic < data.result.length) {
                    item.src = data.result[pic].url
                    setHeight()
                    pic++
                }
            })
        }
    })


    let goIndex = function () {
        for (i = 0; i < pics.length; i++) {
            pics[i].className = 'pic'
        }
        for (j = 0; j < pots.length; j++) {
            pots[j].className = 'pot'
        }
        pics[index].className = 'pic live'
        pots[index].className = 'pot live'
        time = 0
    }

    function goRight() {
        if (index == pics.length - 1) {
            index = 0
        } else {
            index++
        }
        goIndex()
    }

    right.addEventListener('click', goRight)

    left.addEventListener('click', function () {
        if (index == 0) {
            index = pics.length - 1
        } else {
            index--
        }
        goIndex()
    })

    for (i = 0; i < pots.length; i++) {
        pots[i].addEventListener('click', function () {
            let potIndex = this.getAttribute('data-index')
            index = potIndex
            goIndex()
        })
    }

    function play() {
        timer = setInterval(() => {
            time++
            if (time == 3) {
                goRight()
            }
        }, 1000)
    }
    play()

    all.onmousemove = function () {
        clearInterval(timer)
    }

    all.onmouseleave = function () {
        play()
    }
}