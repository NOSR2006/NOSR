// 获取DOM元素
const game = document.getElementById('game')
const player = document.getElementById('player')
const score = document.getElementById('score')
const message = document.getElementById('message')
const play = document.getElementById('play')

// 初始化游戏参数
let scoreValue = 0 // 得分
let isGameOver = false // 游戏结束状态
let obstacleInterval // 障碍物下落间隔
let gameTimer // 游戏计时器
const obstacleSpeed = 5 // 障碍物下落速度
const obstacleWidth = 50 // 障碍物宽度
const obstacleHeight = 50 // 障碍物高度
const playerSpeed = 15 // 玩家移动速度

// 监听键盘事件，控制玩家左右移动，以及限制移动范围，在结束时禁止移动
document.addEventListener('keydown', event => {
    if (isGameOver) {
        return
    } else if (event.key === 'ArrowLeft') {
        player.style.left = Math.max(0 + player.offsetWidth / 2, player.offsetLeft - playerSpeed) + 'px'
    } else if (event.key === 'ArrowRight') {
        player.style.left = Math.min(game.clientWidth - player.offsetWidth / 2, player.offsetLeft + playerSpeed) + 'px'
    }
})

// 检测碰撞以结束游戏
function detectCollision() {
    // 对玩家和每个障碍物都进行碰撞检测
    const obstacles = document.querySelectorAll('.obstacle')
    obstacles.forEach(obstacle => {
        if (isCollided(player, obstacle)) {
            endGame()
        }
    })
}

// 碰撞检测函数
function isCollided(element1, element2) {
    const rect1 = element1.getBoundingClientRect()
    const rect2 = element2.getBoundingClientRect()
    return !(rect1.bottom < rect2.top || rect1.top > rect2.bottom || rect1.right < rect2.left || rect1.left > rect2.right)
}

// 随机位置生成障碍物并下落
function dropObstacle() {
    const obstacle = document.createElement('div')
    obstacle.classList.add('obstacle')
    obstacle.style.width = obstacleWidth + 'px'
    obstacle.style.height = obstacleHeight + 'px'
    obstacle.style.top = -obstacleHeight + 'px'
    obstacle.style.left = Math.floor(Math.random() * game.clientWidth) + 'px'
    game.appendChild(obstacle)
    // 使障碍物下落
    const obstacleDrop = setInterval(() => {
        if (!isGameOver) {
            obstacle.style.top = obstacle.offsetTop + obstacleSpeed + 'px'
            if (obstacle.offsetTop >= game.clientHeight) {
                game.removeChild(obstacle)
                clearInterval(obstacleDrop)
                scoreValue++
                score.innerText = 'Score: ' + scoreValue
            }
            detectCollision()
        }
    }, 10)
}

// 开始游戏以及重新开始
play.addEventListener('click', () => {
    isGameOver = false
    scoreValue = 0
    score.innerText = 'Score: 0'
    play.style.display = 'none'
    message.style.display = 'none'
    obstacleInterval = setInterval(dropObstacle, 300)
    gameTimer = setTimeout(() => {
        endGame()
    }, 60000)
})

// 结束游戏并且重置数据
function endGame() {
    isGameOver = true
    clearTimeout(gameTimer)
    clearInterval(obstacleInterval)
    player.style.left = 50 + '%'
    play.style.display = 'block'
    message.style.display = 'block'
    play.innerText = 'Click to replay'
    message.innerText = 'Game Over! Your score is ' + scoreValue
    const obstacle = game.getElementsByClassName('obstacle')
    while (obstacle.length > 0) {
        game.removeChild(obstacle[0])
    }
}