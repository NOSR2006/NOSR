    function setHeight() {
        setTimeout(() => {
            document.querySelector('.pic_list').style.height = document.querySelector('.pic').style.height = document.querySelector('.pic_item').offsetHeight + 'px'
            document.querySelector('.top').style.height = document.querySelector('.milky').offsetHeight + 'px'
        }, 100)
    }
    window.onresize = setHeight

    let pic = 0
    const pict1 = document.querySelector('.pic_txt1')
    const pict2 = document.querySelector('.pic_txt2')
    $.ajax({
        url: "https://api.oioweb.cn/api/bing",
        type: "GET",
        success: function (data) {
            pict1.innerHTML = data.result[index].title
            pict2.innerHTML = data.result[index].copyright
            localStorage.setItem('data', JSON.stringify(data))
            document.querySelectorAll('.pic_item').forEach(function (item) {
                if (pic < data.result.length) {
                    item.src = data.result[pic].url
                    pic++
                    setHeight()
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
        pict1.innerHTML = pict.result[index].title
        pict2.innerHTML = pict.result[index].copyright
    }

    document.getElementById('pot_right').addEventListener('click', goRight)
    function goRight() {
        if (index == pics.length - 1) {
            index = 0
        } else {
            index++
        }
        goIndex()
    }
    document.getElementById('pot_left').addEventListener('click', () => {
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
    let timer
    function play() {
        timer = setInterval(() => {
            if (time == 3) {
                goRight()
                time = 0
            } else {
                time++
            }
        }, 1000)
    }
    play()