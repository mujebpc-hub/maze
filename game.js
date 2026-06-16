// =====================
// Game Variables
// =====================
let currentLevel = parseInt(localStorage.getItem('currentLevel')) || 0;
let coins = parseInt(localStorage.getItem('coins')) || 0;

let maze = [];
let level = currentLevel + 1;

// Player
let player = {
    x: 0,
    y: 0,
    height: 1.8,
    speed: 5,
    velocityY: 0,
    onGround: true
};

let goal = { x: 0, y: 0 };
let enemy = { x: 0, y: 0 };

// Three.js
let scene, camera, renderer;
let clock = new THREE.Clock();

// Maze
const CELL_SIZE = 4;
const mazeObjects = [];
const walls = [];

let enemyMesh = null;

// UI
const levelDisplay = document.getElementById("levelDisplay");
const coinDisplay = document.getElementById("coinDisplay");
const gameLevel = document.getElementById("gameLevel");
const gameCoins = document.getElementById("gameCoins");

// Controls
const moveState = { forward: false, backward: false, left: false, right: false, jump: false };
let controlsEnabled = false;

const direction = new THREE.Vector3();

// =====================
// INIT
// =====================
function init() {
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000000, 10, 60);
    scene.background = new THREE.Color(0x000000);

    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    document.getElementById("gameContainer").appendChild(renderer.domElement);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    // Events
    document.addEventListener("click", () => {
        document.body.requestPointerLock();
    });

    document.addEventListener("pointerlockchange", () => {
        controlsEnabled = document.pointerLockElement === document.body;
    });

    window.addEventListener("resize", onResize);

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);

    loadLevel(currentLevel);
    animate();
}

// =====================
// LEVEL
// =====================
function loadLevel(index) {
    const levelData = window.levels?.[index];

    if (!levelData) {
        alert("Levels missing in levels.js");
        return;
    }

    maze = levelData.maze;
    player.x = levelData.start.x;
    player.y = levelData.start.y;

    goal.x = levelData.goal.x;
    goal.y = levelData.goal.y;

    enemy.x = levelData.enemySpawn.x;
    enemy.y = levelData.enemySpawn.y;

    level = index + 1;

    clearMaze();
    createMaze();

    spawnEnemy();

    // spawn camera
    camera.position.set(
        player.x * CELL_SIZE,
        player.height,
        player.y * CELL_SIZE
    );

    updateUI();
}

// =====================
// MAZE
// =====================
function clearMaze() {
    mazeObjects.forEach(o => scene.remove(o));
    mazeObjects.length = 0;
    walls.length = 0;
}

function createMaze() {
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(maze[0].length * CELL_SIZE, maze.length * CELL_SIZE),
        new THREE.MeshStandardMaterial({ color: 0x222222 })
    );

    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);
    mazeObjects.push(floor);

    for (let y = 0; y < maze.length; y++) {
        for (let x = 0; x < maze[y].length; x++) {

            if (maze[y][x] === 1) {
                const wall = new THREE.Mesh(
                    new THREE.BoxGeometry(CELL_SIZE, CELL_SIZE, CELL_SIZE),
                    new THREE.MeshStandardMaterial({ color: 0x888888 })
                );

                wall.position.set(x * CELL_SIZE, CELL_SIZE / 2, y * CELL_SIZE);
                scene.add(wall);

                mazeObjects.push(wall);
                walls.push({ x, y });
            }
        }
    }

    const goalMesh = new THREE.Mesh(
        new THREE.BoxGeometry(CELL_SIZE, 0.2, CELL_SIZE),
        new THREE.MeshStandardMaterial({ color: 0x00ff00 })
    );

    goalMesh.position.set(goal.x * CELL_SIZE, 0.1, goal.y * CELL_SIZE);
    scene.add(goalMesh);

    mazeObjects.push(goalMesh);
}

// =====================
// ENEMY
// =====================
function spawnEnemy() {
    if (enemyMesh) {
        scene.remove(enemyMesh);
        enemyMesh = null;
    }

    const loader = new THREE.GLTFLoader();

    loader.load("3dmodels/granny enemy 1.glb", (gltf) => {
        enemyMesh = gltf.scene;
        enemyMesh.scale.set(1, 1, 1);

        enemyMesh.position.set(
            enemy.x * CELL_SIZE,
            0,
            enemy.y * CELL_SIZE
        );

        scene.add(enemyMesh);
    });
}

// =====================
// INPUT
// =====================
function onKeyDown(e) {
    switch (e.key.toLowerCase()) {
        case "w": moveState.forward = true; break;
        case "s": moveState.backward = true; break;
        case "a": moveState.left = true; break;
        case "d": moveState.right = true; break;
        case " ": moveState.jump = true; break;
    }
}

function onKeyUp(e) {
    switch (e.key.toLowerCase()) {
        case "w": moveState.forward = false; break;
        case "s": moveState.backward = false; break;
        case "a": moveState.left = false; break;
        case "d": moveState.right = false; break;
        case " ": moveState.jump = false; break;
    }
}

// =====================
// GAME LOOP
// =====================
function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();

    if (controlsEnabled) {
        movePlayer(delta);
        moveEnemy(delta);
        checkAttack();
        checkGoal();
    }

    renderer.render(scene, camera);
    updateUI();
}

// =====================
// PLAYER
// =====================
function movePlayer(delta) {

    // gravity
    if (!player.onGround) {
        player.velocityY -= 9.8 * delta;
        player.y += player.velocityY * delta;

        if (player.y <= player.height) {
            player.y = player.height;
            player.velocityY = 0;
            player.onGround = true;
        }
    }

    direction.x = Number(moveState.right) - Number(moveState.left);
    direction.z = Number(moveState.forward) - Number(moveState.backward);
    direction.normalize();

    if (direction.length() > 0) {

        const moveX = direction.x * player.speed * delta;
        const moveZ = direction.z * player.speed * delta;

        const newX = camera.position.x + moveX;
        const newZ = camera.position.z + moveZ;

        if (!isWall(newX, newZ)) {
            camera.position.x = newX;
            camera.position.z = newZ;
        }
    }

    if (moveState.jump && player.onGround) {
        player.velocityY = 5;
        player.onGround = false;
    }

    camera.position.y = player.y + 1.8;
}

// =====================
// COLLISION
// =====================
function isWall(x, z) {
    const gx = Math.floor(x / CELL_SIZE);
    const gy = Math.floor(z / CELL_SIZE);
    return walls.some(w => w.x === gx && w.y === gy);
}

// =====================
// ENEMY AI
// =====================
function moveEnemy(delta) {
    if (!enemyMesh) return;

    const p = camera.position;
    const e = enemyMesh.position;

    const dx = p.x - e.x;
    const dz = p.z - e.z;

    const dist = Math.hypot(dx, dz);

    if (dist > 0.5) {
        e.x += (dx / dist) * 2 * delta;
        e.z += (dz / dist) * 2 * delta;

        enemyMesh.lookAt(p.x, e.y, p.z);
    }
}

// =====================
// GAME LOGIC
// =====================
function checkAttack() {
    if (!enemyMesh) return;

    const d = camera.position.distanceTo(enemyMesh.position);

    if (d < 1.5) {
        alert("Game Over");
        save();
        location.reload();
    }
}

function checkGoal() {
    const px = Math.floor(camera.position.x / CELL_SIZE);
    const pz = Math.floor(camera.position.z / CELL_SIZE);

    if (px === goal.x && pz === goal.y) {
        coins += 10;
        save();

        if (currentLevel + 1 < window.levels.length) {
            currentLevel++;
            loadLevel(currentLevel);
        } else {
            alert("YOU WIN!");
        }
    }
}

// =====================
// SAVE
// =====================
function save() {
    localStorage.setItem("currentLevel", currentLevel);
    localStorage.setItem("coins", coins);
}

// =====================
// UI
// =====================
function updateUI() {
    if (levelDisplay) levelDisplay.innerText = level;
    if (coinDisplay) coinDisplay.innerText = coins;
    if (gameLevel) gameLevel.innerText = level;
    if (gameCoins) gameCoins.innerText = coins;
}

// =====================
// RESIZE
// =====================
function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// START
init();
