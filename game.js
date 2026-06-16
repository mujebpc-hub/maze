const playBtn = document.getElementById("playBtn");
const homeScreen = document.getElementById("homeScreen");
const gameScreen = document.getElementById("gameScreen");

const canvas = document.getElementById("mazeCanvas");
const ctx = canvas.getContext("2d");

let currentLevel = 0;
let level = 1;
let coins = 0;

let maze = levels[currentLevel].maze;

const keys = {};

document.addEventListener("keydown", (e) => {
    keys[e.key.toLowerCase()] = true;

    if(e.key.toLowerCase() === "w") movePlayer("up");
    if(e.key.toLowerCase() === "s") movePlayer("down");
    if(e.key.toLowerCase() === "a") movePlayer("left");
    if(e.key.toLowerCase() === "d") movePlayer("right");
});

document.addEventListener("keyup", (e) => {
    keys[e.key.toLowerCase()] = false;
});

let player = {...levels[currentLevel].start};
let goal = levels[currentLevel].goal;

// Enemy spawn
let enemy = {x:4, y:0};

const cellSize = 80;

playBtn.onclick = () => {
    homeScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
    drawMaze();
};

function drawMaze(){
    ctx.clearRect(0,0,canvas.width,canvas.height);

    for(let y=0; y<maze.length; y++){
        for(let x=0; x<maze[y].length; x++){
            if(maze[y][x] === 1){
                ctx.fillStyle = "black";
                ctx.fillRect(
                    x * cellSize,
                    y * cellSize,
                    cellSize,
                    cellSize
                );
            } else {
                ctx.strokeRect(
                    x * cellSize,
                    y * cellSize,
                    cellSize,
                    cellSize
                );
            }
        }
    }

    // Goal
    ctx.fillStyle = "green";
    ctx.fillRect(
        goal.x * cellSize + 20,
        goal.y * cellSize + 20,
        40,
        40
    );

    // Player
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(
        player.x * cellSize + 40,
        player.y * cellSize + 40,
        20,
        0,
        Math.PI * 2
    );
    ctx.fill();

    // Enemy
    ctx.fillStyle = "purple";
    ctx.fillRect(
        enemy.x * cellSize + 20,
        enemy.y * cellSize + 20,
        40,
        40
    );

    updateUI();
}

function movePlayer(direction){
    let newX = player.x;
    let newY = player.y;

    if(direction === "up") newY--;
    if(direction === "down") newY++;
    if(direction === "left") newX--;
    if(direction === "right") newX++;

    // Player movement
    if(
        newX >= 0 &&
        newY >= 0 &&
        newX < maze[0].length &&
        newY < maze.length &&
        maze[newY][newX] === 0
    ){
        player.x = newX;
        player.y = newY;
    }

    // Enemy chase player
    if(enemy.x < player.x) enemy.x++;
    else if(enemy.x > player.x) enemy.x--;

    if(enemy.y < player.y) enemy.y++;
    else if(enemy.y > player.y) enemy.y--;

    // Enemy attack
    if(enemy.x === player.x && enemy.y === player.y){
        alert("Enemy attacked you!");
        location.reload();
    }

    // Level complete
    if(player.x === goal.x && player.y === goal.y){
        coins += 10;
        currentLevel++;

        if(currentLevel < levels.length){
            level++;

            maze = levels[currentLevel].maze;
            player = {...levels[currentLevel].start};
            goal = levels[currentLevel].goal;

            // Reset enemy
            enemy = {x:4, y:0};

            alert("Next Level Unlocked!");
        } else {
            alert("Game Completed!");
        }

        updateUI();
    }

    drawMaze();
}

function updateUI(){
    document.getElementById("levelDisplay").innerText = level;
    document.getElementById("coinDisplay").innerText = coins;
    document.getElementById("gameLevel").innerText = level;
    document.getElementById("gameCoins").innerText = coins;
}
