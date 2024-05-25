window.onload = function () {
    let son = document.querySelector('.picture_item')
    let fat = document.querySelector('.picture')
    let fat_f = document.querySelector('.picture_list')
    let all = document.querySelector('.slider')
    let points = document.querySelectorAll('.point')
    let picture = document.querySelectorAll('.picture_item')
    let pictures = document.querySelectorAll('.picture')
    let left = document.getElementById('b_left')
    let right = document.getElementById('b_right')
    let index = 0
    let time = 0
    let pic = 0
    let timer

    function setHeight() {
        fat_f.style.height = fat.style.height = son.offsetHeight + 'px'
    }
    window.onresize = setHeight
    $.ajax({
        url: "https://api.oioweb.cn/api/bing",
        type: "GET",
        success: function (data) {
            picture.forEach(function (item) {
                if (pic < data.result.length) {
                    item.src = data.result[pic].url
                    pic++
                }
            })
            setHeight()
        }
    })

    let goIndex = function () {
        for (i = 0; i < pictures.length; i++) {
            pictures[i].className = 'picture'
        }
        for (j = 0; j < points.length; j++) {
            points[j].className = 'point'
        }
        pictures[index].className = 'picture active'
        points[index].className = 'point active'
        time = 0
    }

    function goRight() {
        if (index == 3) {
            index = 0
        } else {
            index++
        }
        goIndex()
    }

    right.addEventListener('click', goRight)

    left.addEventListener('click', function () {
        if (index == 0) {
            index = 3
        } else {
            index--
        }
        goIndex()
    })

    for (i = 0; i < points.length; i++) {
        points[i].addEventListener('click', function () {
            let pointIndex = this.getAttribute('data-index')
            index = pointIndex
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