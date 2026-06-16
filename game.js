// =====================
// Game Variables & Imports
// =====================
let currentLevel = parseInt(localStorage.getItem('currentLevel')) || 0;
let coins = parseInt(localStorage.getItem('coins')) || 0;

let levels = []; // Ensure levels.js provides this array with maze data
let maze = [];
let level = currentLevel + 1;

// Player parameters
let player = { x: 0, y: 0, height: 1.8, speed: 5, velocityY: 0, canJump: false };
let goal = { x: 0, y: 0 };
let enemy = { x: 0, y: 0 };

// Three.js essentials
let scene, camera, renderer;
let controls;
let clock = new THREE.Clock();

// Maze parameters
const CELL_SIZE = 4;
const mazeObjects = [];
const walls = [];
const enemyObject = new THREE.Object3D();
let enemyMesh;

// UI Elements
const levelDisplay = document.getElementById("levelDisplay");
const coinDisplay = document.getElementById("coinDisplay");
const gameLevel = document.getElementById("gameLevel");
const gameCoins = document.getElementById("gameCoins");

// =====================
// Initialization Functions
// =====================

function init() {
    // Initialize scene
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000000, 10, 50);
    scene.background = new THREE.Color(0x000000);

    // Camera setup
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(10, 20, 10);
    scene.add(directionalLight);

    // Initialize level
    loadLevel(currentLevel);
    animate();
}

function loadEnemyModel() {
    const loader = new THREE.GLTFLoader();
    loader.load('3dmodels/granny enemy 1.glb', (gltf) => {
        enemyMesh = gltf.scene;
        enemyMesh.scale.set(1, 1, 1);
        enemyMesh.position.set(enemy.x * CELL_SIZE, 0, enemy.y * CELL_SIZE);
        scene.add(enemyMesh);
    });
}

function onPointerLockChange() {
    controlsEnabled = document.pointerLockElement === document.body;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// =====================
// Level Loading & Maze Generation
// =====================

function loadLevel(index) {
    // Load maze data from levels.js
    const levelData = levels[index];
    maze = levelData.maze;
    player.x = levelData.start.x;
    player.y = levelData.start.y;
    goal.x = levelData.goal.x;
    goal.y = levelData.goal.y;
    enemy.x = levelData.enemySpawn.x;
    enemy.y = levelData.enemySpawn.y;
    level = index + 1;

    // Reset scene
    clearMaze();
    createMaze();

    // Reset enemy
    if(enemyMesh) scene.remove(enemyMesh);
    loadEnemyModel();

    updateUI();
}

function clearMaze() {
    mazeObjects.forEach(obj => scene.remove(obj));
    mazeObjects.length = 0;
    walls.length = 0;
}

function createMaze() {
    // Generate floor
    const floorGeo = new THREE.PlaneGeometry(maze[0].length * CELL_SIZE, maze.length * CELL_SIZE);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI/2;
    scene.add(floor);

    // Generate walls
    for (let y = 0; y < maze.length; y++) {
        for (let x = 0; x < maze[y].length; x++) {
            if (maze[y][x] === 1) {
                const wallGeo = new THREE.BoxGeometry(CELL_SIZE, CELL_SIZE, CELL_SIZE);
                const wallMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
                const wall = new THREE.Mesh(wallGeo, wallMat);
                wall.position.set(x * CELL_SIZE, CELL_SIZE/2, y * CELL_SIZE);
                scene.add(wall);
                mazeObjects.push(wall);
                walls.push({ x: x, y: y });
            }
        }
    }

    // Add goal object
    const goalGeo = new THREE.BoxGeometry(CELL_SIZE, 0.2, CELL_SIZE);
    const goalMat = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    const goalMesh = new THREE.Mesh(goalGeo, goalMat);
    goalMesh.position.set(goal.x * CELL_SIZE, 0.1, goal.y * CELL_SIZE);
    scene.add(goalMesh);
    mazeObjects.push(goalMesh);
}

function loadEnemyModel() {
    if (!enemyMesh) return;
    enemyMesh.position.set(enemy.x * CELL_SIZE, 0, enemy.y * CELL_SIZE);
    scene.add(enemyMesh);
}

// =====================
// Controls & Movement
// =====================

const moveState = { forward: false, backward: false, left: false, right: false, jump: false };
let controlsEnabled = false;

function onKeyDown(e) {
    switch(e.key.toLowerCase()) {
        case 'w': moveState.forward = true; break;
        case 's': moveState.backward = true; break;
        case 'a': moveState.left = true; break;
        case 'd': moveState.right = true; break;
        case ' ': moveState.jump = true; break;
    }
}

function onKeyUp(e) {
    switch(e.key.toLowerCase()) {
        case 'w': moveState.forward = false; break;
        case 's': moveState.backward = false; break;
        case 'a': moveState.left = false; break;
        case 'd': moveState.right = false; break;
        case ' ': moveState.jump = false; break;
    }
}

// Initialize controls
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    if (controlsEnabled) {
        movePlayer(delta);
        moveEnemy(delta);
        checkAttack();
        checkLevelComplete();
    }

    renderer.render(scene, camera);
    updateUI();
}

function movePlayer(delta) {
    // Gravity
    if (!player.onGround) {
        player.velocityY -= 9.8 * delta;
        player.y += player.velocityY * delta;
        if (player.y <= player.height) {
            player.y = player.height;
            player.velocityY = 0;
            player.onGround = true;
        }
    }

    // Movement
    direction.z = Number(moveState.forward) - Number(moveState.backward);
    direction.x = Number(moveState.right) - Number(moveState.left);
    direction.normalize();

    if (direction.length() > 0) {
        const moveX = direction.x * player.speed * delta;
        const moveZ = direction.z * player.speed * delta;

        // Calculate new positions
        const newX = camera.position.x + moveX;
        const newZ = camera.position.z + moveZ;

        // Collision detection with walls
        if (!isWallAt(newX, newZ)) {
            camera.position.x = newX;
            camera.position.z = newZ;
        }
    }

    // Jumping
    if (moveState.jump && player.onGround) {
        player.velocityY = 5;
        player.onGround = false;
    }

    // Update camera height
    camera.position.y = player.y + 1.8; // eye height
    camera.lookAt(new THREE.Vector3(camera.position.x, player.y + 1.8, camera.position.z));
}

function isWallAt(x, z) {
    const gridX = Math.floor(x / CELL_SIZE);
    const gridY = Math.floor(z / CELL_SIZE);
    return walls.some(w => w.x === gridX && w.y === gridY);
}

// =====================
// Enemy Behavior
// =====================

function moveEnemy(delta) {
    if (!enemyMesh) return;

    const enemyPos = enemyMesh.position;
    const targetX = camera.position.x;
    const targetZ = camera.position.z;

    const dx = targetX - enemyPos.x;
    const dz = targetZ - enemyPos.z;
    const dist = Math.hypot(dx, dz);

    if (dist > 0.1) {
        const speed = 2; // Enemy speed
        enemyPos.x += (dx / dist) * speed * delta;
        enemyPos.z += (dz / dist) * speed * delta;

        // Rotate enemy to face player
        enemyMesh.lookAt(new THREE.Vector3(targetX, enemyPos.y, targetZ));
    }
}

// =====================
// Attack & Level Logic
// =====================

function checkAttack() {
    const dx = camera.position.x - enemyMesh.position.x;
    const dz = camera.position.z - enemyMesh.position.z;
    const dist = Math.hypot(dx, dz);

    if (dist < 1.5) {
        alert("Jump scare! Game Over.");
        saveProgress();
        location.reload();
    }
}

function checkLevelComplete() {
    const px = Math.floor(camera.position.x / CELL_SIZE);
    const pz = Math.floor(camera.position.z / CELL_SIZE);
    if (px === goal.x && pz === goal.y) {
        coins += 10;
        saveProgress();
        if (currentLevel + 1 < levels.length) {
            alert("Level Completed! Loading next...");
            currentLevel++;
            saveProgress();
            loadLevel(currentLevel);
        } else {
            alert("Congratulations! You've completed all levels.");
            // Implement win condition here
        }
    }
}

// =====================
// Save & UI Functions
// =====================

function saveProgress() {
    localStorage.setItem('currentLevel', currentLevel);
    localStorage.setItem('coins', coins);
}

function updateUI() {
    levelDisplay.innerText = level;
    coinDisplay.innerText = coins;
    gameLevel.innerText = level;
    gameCoins.innerText = coins;
}

// =====================
// Start the Game
// =====================

init();
