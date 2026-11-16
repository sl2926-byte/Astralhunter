
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreDisplay = document.getElementById("score");
const livesDisplay = document.getElementById("lives");
const waveDisplay = document.getElementById("wave");
const overlay = document.getElementById("overlay");
const message = document.getElementById("message");
const instructions = document.getElementById("instructions");
const startButton = document.getElementById("startButton");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

let keys = {};
let state = "menu";

let player;
let enemies = [];
let bullets = [];
let enemyBullets = [];
let powerUps = [];
let boss = null;
let stars = [];

let score = 0;
let lives = 3;
let wave = 1;
let gameMode = "campaign";
let enemiesRemaining = 0;
let spawnTimer = 0;
let transitionTimer = 0;
let survivalTimer = 0;
let bossActive = false;
let lastTime = 0;

function createStars() {
  stars = [];

  for (let i = 0; i < 85; i++) {
    stars.push({
      x: Math.random() * WIDTH,
      y: Math.random() * HEIGHT,
      size: Math.random() * 2 + 1,
      speed: Math.random() * 35 + 15
    });
  }
}

function resetGame() {
  score = 0;
  lives = 3;
  wave = 1;

  enemies = [];
  bullets = [];
  enemyBullets = [];
  powerUps = [];
  boss = null;

  bossActive = false;
  survivalTimer = 0;
  transitionTimer = 0;

  player = {
    x: WIDTH / 2,
    y: HEIGHT - 75,
    radius: 15,
    speed: 280,
    cooldown: 0,
    invulnerable: 0,
    shield: 0,
    rapid: 0
  };

  startWave();
  createStars();
  updateHUD();
}

function updateHUD() {
  scoreDisplay.textContent = score;
  livesDisplay.textContent = lives;
  waveDisplay.textContent = bossActive ? "BOSS" : wave;
}

function startWave() {
  enemiesRemaining = 4 + wave * 2;
  spawnTimer = 0;
  updateHUD();
}


function spawnEnemy() {
  const availableTypes = ["scout"];

  if (wave >= 2) availableTypes.push("fighter");
  if (wave >= 3) availableTypes.push("heavy");
  if (wave >= 4) availableTypes.push("stealth");
  if (wave >= 5) availableTypes.push("drone");
  if (wave >= 7) availableTypes.push("support");

  const type = availableTypes[
    Math.floor(Math.random() * availableTypes.length)
  ];

  const settings = {
    scout:   { radius: 13, hp: 1, speed: 100, points: 10 },
    fighter: { radius: 17, hp: 2, speed: 65, points: 20 },
    heavy:   { radius: 23, hp: 4, speed: 38, points: 50 },
    stealth: { radius: 15, hp: 2, speed: 85, points: 35 },
    drone:   { radius: 11, hp: 1, speed: 125, points: 15 },
    support: { radius: 20, hp: 3, speed: 45, points: 60 }
  };

  const s = settings[type];

  enemies.push({
    type,
    x: 30 + Math.random() * (WIDTH - 60),
    y: -30,
    radius: s.radius,
    hp: s.hp,
    maxHp: s.hp,
    speed: s.speed + wave * 3,
    points: s.points,
    shootTimer: 1.5 + Math.random() * 1.5,
    phase: Math.random() * Math.PI * 2
  });
}


function spawnPowerUp(x, y) {
  const types = ["shield", "rapid", "bonus"];

  powerUps.push({
    x,
    y,
    type: types[Math.floor(Math.random() * types.length)],
    radius: 11,
    speed: 75
  });
}

function startBoss() {
  bossActive = true;

  boss = {
    x: WIDTH / 2,
    y: 100,
    radius: 48,
    hp: 35,
    maxHp: 35,
    speed: 100,
    direction: 1,
    shootTimer: 1
  };

  updateHUD();
}

function finishGame(won) {
  if (state !== "playing") return;

  state = won ? "win" : "gameover";

  overlay.style.display = "flex";
  message.textContent = won ? "VICTORY!" : "GAME OVER";

  instructions.innerHTML = won
    ? "You defeated the final boss and saved the galaxy!<br>Final Score: " + score
    : "Your spaceship has been defeated!<br>Final Score: " + score;

  startButton.textContent = "PLAY AGAIN";
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function damagePlayer() {
  if (state !== "playing" || player.invulnerable > 0) return;

  if (player.shield > 0) {
    player.shield = 0;
    player.invulnerable = 0.7;
    return;
  }

  lives--;
  player.invulnerable = 1.5;
  updateHUD();

  if (lives <= 0) {
    finishGame(false);
  }
}

function update(dt) {
  if (state !== "playing") return;

  survivalTimer += dt;

  if (survivalTimer >= 1) {
    score += 1;
    survivalTimer = 0;
    updateHUD();
  }

  // Move background stars
  for (const star of stars) {
    star.y += star.speed * dt;

    if (star.y > HEIGHT) {
      star.y = 0;
      star.x = Math.random() * WIDTH;
    }
  }

  // Player movement
  let dx = 0;
  let dy = 0;

  if (keys.ArrowLeft || keys.a) dx--;
  if (keys.ArrowRight || keys.d) dx++;
  if (keys.ArrowUp || keys.w) dy--;
  if (keys.ArrowDown || keys.s) dy++;

  const length = Math.hypot(dx, dy);

  if (length > 0) {
    player.x += (dx / length) * player.speed * dt;
    player.y += (dy / length) * player.speed * dt;
  }

  player.x = Math.max(18, Math.min(WIDTH - 18, player.x));
  player.y = Math.max(25, Math.min(HEIGHT - 20, player.y));

  player.cooldown -= dt;
  player.invulnerable = Math.max(0, player.invulnerable - dt);
  player.shield = Math.max(0, player.shield - dt);
  player.rapid = Math.max(0, player.rapid - dt);

  // Player shooting
  if (keys.Space && player.cooldown <= 0) {
    shoot();
  }

  // Spawn enemies
  if (!bossActive && enemiesRemaining > 0) {
    spawnTimer -= dt;

    if (spawnTimer <= 0) {
      spawnEnemy();
      enemiesRemaining--;
      spawnTimer = Math.max(0.4, 1.1 - wave * 0.12);
    }
  }

  // Enemy movement and attacks
  
  // Enemy movement and special abilities
  for (const enemy of enemies) {

    // Scout: follows the player's spaceship
    if (enemy.type === "scout") {
      const angle = Math.atan2(
        player.y - enemy.y,
        player.x - enemy.x
      );

      enemy.x += Math.cos(angle) * enemy.speed * dt;
      enemy.y += Math.sin(angle) * enemy.speed * dt;
    }

    // Drone: moves quickly and zigzags
    else if (enemy.type === "drone") {
      enemy.y += enemy.speed * 1.3 * dt;
      enemy.x += Math.sin(Date.now() / 180 + enemy.phase) * 90 * dt;
    }

    // Other enemies move downward
    else {
      enemy.y += enemy.speed * dt;
      enemy.x += Math.sin(Date.now() / 400 + enemy.phase) * 35 * dt;
    }

    // Fighter: shoots at the player
    if (enemy.type === "fighter") {
      enemy.shootTimer -= dt;

      if (enemy.shootTimer <= 0) {
        enemyShoot(enemy);
        enemy.shootTimer = 2.2;
      }
    }

    // Stealth: periodically becomes invisible
    if (enemy.type === "stealth") {
      enemy.cloakTimer = (enemy.cloakTimer || 0) - dt;

      if (enemy.cloakTimer <= 0) {
        enemy.cloaked = !enemy.cloaked;
        enemy.cloakTimer = enemy.cloaked ? 1.5 : 2.5;
      }
    }

    // Support: heals nearby damaged enemies
    if (enemy.type === "support") {
      enemy.healTimer = (enemy.healTimer || 0) - dt;

      if (enemy.healTimer <= 0) {
        for (const ally of enemies) {
          if (
            ally !== enemy &&
            distance(enemy, ally) < 110 &&
            ally.hp < ally.maxHp
          ) {
            ally.hp = Math.min(ally.maxHp, ally.hp + 1);
          }
        }

        enemy.healTimer = 2.5;
      }
    }

    // Check collision with player
    if (
      distance(player, enemy) <
      player.radius + enemy.radius
    ) {
      damagePlayer();
    }

    // Damage player if an enemy escapes
    if (enemy.y > HEIGHT + 30) {
      enemy.remove = true;
      damagePlayer();
    }
  }

  enemies = enemies.filter(e => !e.remove);


  // Player lasers
  for (const bullet of bullets) {
    bullet.y -= bullet.speed * dt;

    for (const enemy of enemies) {
      if (!enemy.remove &&
          distance(bullet, enemy) <
          bullet.radius + enemy.radius) {

        enemy.hp--;
        bullet.remove = true;

        if (enemy.hp <= 0) {
          enemy.remove = true;
          score += enemy.points;

          if (Math.random() < 0.18) {
            spawnPowerUp(enemy.x, enemy.y);
          }

          updateHUD();
        }

        break;
      }
    }

    // Damage the boss
    if (boss && !bullet.remove &&
        distance(bullet, boss) <
        bullet.radius + boss.radius) {

      boss.hp--;
      bullet.remove = true;

      if (boss.hp <= 0) {
        score += 500;
        updateHUD();
        finishGame(true);
      }
    }
  }

  bullets = bullets.filter(
    b => !b.remove && b.y > -10
  );

  // Enemy bullets
  for (const bullet of enemyBullets) {
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;

    if (distance(player, bullet) <
        player.radius + bullet.radius) {
      bullet.remove = true;
      damagePlayer();
    }
  }

  enemyBullets = enemyBullets.filter(
    b => !b.remove &&
    b.x > -20 && b.x < WIDTH + 20 &&
    b.y > -20 && b.y < HEIGHT + 20
  );

  // Power-ups
  for (const power of powerUps) {
    power.y += power.speed * dt;

    if (distance(player, power) <
        player.radius + power.radius) {

      if (power.type === "shield") {
        player.shield = 6;
      } else if (power.type === "rapid") {
        player.rapid = 6;
      } else {
        score += 25;
      }

      power.remove = true;
      updateHUD();
    }
  }

  powerUps = powerUps.filter(
    p => !p.remove && p.y < HEIGHT + 20
  );

  // Boss movement and shooting
  if (boss) {
    boss.x += boss.speed * boss.direction * dt;

    if (boss.x > WIDTH - 65 || boss.x < 65) {
      boss.direction *= -1;
    }

    boss.shootTimer -= dt;

    if (boss.shootTimer <= 0) {
      for (let i = -1; i <= 1; i++) {
        enemyBullets.push({
          x: boss.x,
          y: boss.y + 35,
          vx: i * 75,
          vy: 190,
          radius: 7
        });
      }

      boss.shootTimer = 0.9;
    }
  }

  // Wave progression
  if (!bossActive && enemiesRemaining === 0 &&
      enemies.length === 0) {

    transitionTimer += dt;

    if (transitionTimer >= 2) {
      transitionTimer = 0;

      if (wave < 3) {
        wave++;
        startWave();
      } else {
        startBoss();
      }
    }
  }
}

// Draw background stars
function drawStars() {
  ctx.fillStyle = "#ffffff";

  for (const star of stars) {
    ctx.globalAlpha = 0.4 + star.size / 4;
    ctx.fillRect(star.x, star.y, star.size, star.size);
  }

  ctx.globalAlpha = 1;
}

// Draw player spaceship
function drawPlayer() {
  if (player.invulnerable > 0 &&
      Math.floor(Date.now() / 100) % 2 === 0) {
    return;
  }

  ctx.save();
  ctx.translate(player.x, player.y);

  ctx.shadowBlur = 18;
  ctx.shadowColor = "#00f5ff";

  ctx.fillStyle = "#00f5ff";
  ctx.beginPath();
  ctx.moveTo(0, -20);
  ctx.lineTo(17, 16);
  ctx.lineTo(0, 10);
  ctx.lineTo(-17, 16);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(-3, -8, 6, 13);

  ctx.fillStyle = "#a855f7";
  ctx.fillRect(-5, 16, 10, 8);

  if (player.shield > 0) {
    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 27, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

// Draw detailed enemy spaceships
function drawEnemy(enemy) {
  ctx.save();if (enemy.cloaked) {
  ctx.globalAlpha = 0.2;
}
  ctx.translate(enemy.x, enemy.y);

  const colors = {
    scout: "#ff477e",
    fighter: "#f97316",
    heavy: "#a855f7"stealth: "#38bdf8",
  drone: "#facc15",
  support: "#22c55e"
  };

  const color = colors[enemy.type] || "#ff477e";
  const pulse = 0.75 + Math.sin(Date.now() / 110) * 0.2;

  // Glowing engine exhaust
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.shadowBlur = 12;
  ctx.shadowColor = color;
  ctx.fillStyle = enemy.type === "heavy" ? "#d8b4fe" : "#fff";
  ctx.beginPath();
  ctx.moveTo(-5, 10);
  ctx.lineTo(-2, 23 + Math.random() * 3);
  ctx.lineTo(0, 15);
  ctx.lineTo(2, 23 + Math.random() * 3);
  ctx.lineTo(5, 10);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.shadowBlur = 16;
  ctx.shadowColor = color;

  if (enemy.type === "scout") {
    // SCOUT: fast, narrow ship with swept wings
    ctx.fillStyle = "#9f1239";
    ctx.beginPath();
    ctx.moveTo(0, -19);
    ctx.lineTo(8, -5);
    ctx.lineTo(22, 5);
    ctx.lineTo(13, 8);
    ctx.lineTo(8, 4);
    ctx.lineTo(5, 15);
    ctx.lineTo(-5, 15);
    ctx.lineTo(-8, 4);
    ctx.lineTo(-13, 8);
    ctx.lineTo(-22, 5);
    ctx.lineTo(-8, -5);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -17);
    ctx.lineTo(5, -3);
    ctx.lineTo(8, 12);
    ctx.lineTo(-8, 12);
    ctx.lineTo(-5, -3);
    ctx.closePath();
    ctx.fill();

    // Wing panels
    ctx.fillStyle = "#fecdd3";
    ctx.beginPath();
    ctx.moveTo(-9, 0);
    ctx.lineTo(-19, 5);
    ctx.lineTo(-11, 5);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(9, 0);
    ctx.lineTo(19, 5);
    ctx.lineTo(11, 5);
    ctx.closePath();
    ctx.fill();

    // Cockpit and engine lights
    ctx.shadowBlur = 8;
    ctx.shadowColor = "#ffffff";
    ctx.fillStyle = "#fff1f2";
    ctx.beginPath();
    ctx.ellipse(0, -5, 3, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#7f1d1d";
    ctx.fillRect(-2, 10, 4, 3);

  } else if (enemy.type === "fighter") {
    // FIGHTER: medium ship with broad wings and twin cannons
    ctx.fillStyle = "#9a3412";
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.lineTo(10, -8);
    ctx.lineTo(27, 3);
    ctx.lineTo(24, 12);
    ctx.lineTo(11, 8);
    ctx.lineTo(8, 17);
    ctx.lineTo(-8, 17);
    ctx.lineTo(-11, 8);
    ctx.lineTo(-24, 12);
    ctx.lineTo(-27, 3);
    ctx.lineTo(-10, -8);
    ctx.closePath();
    ctx.fill();

    // Main armor body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -19);
    ctx.lineTo(8, -7);
    ctx.lineTo(10, 12);
    ctx.lineTo(0, 18);
    ctx.lineTo(-10, 12);
    ctx.lineTo(-8, -7);
    ctx.closePath();
    ctx.fill();

    // Wing armor plates
    ctx.fillStyle = "#fdba74";
    ctx.beginPath();
    ctx.moveTo(-12, -1);
    ctx.lineTo(-23, 5);
    ctx.lineTo(-14, 7);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(12, -1);
    ctx.lineTo(23, 5);
    ctx.lineTo(14, 7);
    ctx.closePath();
    ctx.fill();

    // Twin weapon pods
    ctx.fillStyle = "#7c2d12";
    ctx.fillRect(-21, 5, 5, 9);
    ctx.fillRect(16, 5, 5, 9);

    ctx.fillStyle = "#fff7ed";
    ctx.fillRect(-20, 11, 3, 3);
    ctx.fillRect(17, 11, 3, 3);

    // Cockpit
    ctx.shadowColor = "#fff";
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#ffedd5";
    ctx.beginPath();
    ctx.ellipse(0, -6, 5, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hull seam
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#7c2d12";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.lineTo(0, 13);
    ctx.stroke();

  } else {
    // HEAVY: large armored battleship with layered plating
    ctx.fillStyle = "#581c87";
    ctx.beginPath();
    ctx.moveTo(0, -24);
    ctx.lineTo(15, -15);
    ctx.lineTo(29, -5);
    ctx.lineTo(25, 13);
    ctx.lineTo(14, 18);
    ctx.lineTo(8, 13);
    ctx.lineTo(-8, 13);
    ctx.lineTo(-14, 18);
    ctx.lineTo(-25, 13);
    ctx.lineTo(-29, -5);
    ctx.lineTo(-15, -15);
    ctx.closePath();
    ctx.fill();

    // Main armored hull
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -25);
    ctx.lineTo(12, -14);
    ctx.lineTo(17, 5);
    ctx.lineTo(10, 19);
    ctx.lineTo(-10, 19);
    ctx.lineTo(-17, 5);
    ctx.lineTo(-12, -14);
    ctx.closePath();
    ctx.fill();

    // Shoulder armor
    ctx.fillStyle = "#6b21a8";
    ctx.beginPath();
    ctx.moveTo(-13, -12);
    ctx.lineTo(-27, -4);
    ctx.lineTo(-22, 10);
    ctx.lineTo(-13, 6);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(13, -12);
    ctx.lineTo(27, -4);
    ctx.lineTo(22, 10);
    ctx.lineTo(13, 6);
    ctx.closePath();
    ctx.fill();

    // Armor highlights
    ctx.strokeStyle = "#e9d5ff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-11, -10);
    ctx.lineTo(-20, -3);
    ctx.moveTo(11, -10);
    ctx.lineTo(20, -3);
    ctx.moveTo(-9, 12);
    ctx.lineTo(0, 16);
    ctx.lineTo(9, 12);
    ctx.stroke();

    // Central glowing core
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 14;
    ctx.fillStyle = "#f5d0fe";
    ctx.beginPath();
    ctx.arc(0, -3, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#581c87";
    ctx.beginPath();
    ctx.arc(0, -3, 3, 0, Math.PI * 2);
    ctx.fill();

    // Side energy lights
    ctx.fillStyle = "#f0abfc";
    ctx.fillRect(-22, 1, 4, 5);
    ctx.fillRect(18, 1, 4, 5);
  }
ctx.globalAlpha = 1;
  ctx.restore();

  // Enemy health bar
  if (enemy.hp < enemy.maxHp) {
    const barWidth = enemy.type === "heavy" ? 46 : 36;
    const barX = enemy.x - barWidth / 2;
    const barY = enemy.y - enemy.radius - 10;

    ctx.fillStyle = "#222";
    ctx.fillRect(barX, barY, barWidth, 5);

    ctx.fillStyle = color;
    ctx.fillRect(
      barX,
      barY,
      barWidth * Math.max(0, enemy.hp) / enemy.maxHp,
      5
    );

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 0.7;
    ctx.strokeRect(barX, barY, barWidth, 5);
  }
}

// Draw final boss
function drawBoss() {
  if (!boss) return;

  ctx.save();
  ctx.translate(boss.x, boss.y);

  ctx.shadowBlur = 25;
  ctx.shadowColor = "#ff00ff";
  ctx.fillStyle = "#a855f7";

  ctx.beginPath();
  ctx.moveTo(0, 55);
  ctx.lineTo(65, -15);
  ctx.lineTo(38, -30);
  ctx.lineTo(0, -45);
  ctx.lineTo(-38, -30);
  ctx.lineTo(-65, -15);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#00f5ff";
  ctx.fillRect(-15, -10, 30, 16);

  ctx.restore();

  ctx.fillStyle = "#333";
  ctx.fillRect(180, 25, 440, 13);

  ctx.fillStyle = "#ff00ff";
  ctx.fillRect(
    180, 25,
    440 * Math.max(0, boss.hp) / boss.maxHp,
    13
  );

  ctx.fillStyle = "white";
  ctx.font = "14px Courier New";
  ctx.textAlign = "center";
  ctx.fillText("BOSS HEALTH", WIDTH / 2, 18);
}

// Draw everything
function draw() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  drawStars();

  if (!player) return;

  // Player lasers
  ctx.shadowBlur = 12;
  ctx.shadowColor = "#00f5ff";
  ctx.fillStyle = "#00f5ff";

  for (const bullet of bullets) {
    ctx.fillRect(bullet.x - 2, bullet.y - 9, 4, 14);
  }

  // Enemy bullets
  ctx.shadowColor = "#ff477e";
  ctx.fillStyle = "#ff477e";

  for (const bullet of enemyBullets) {
    ctx.beginPath();
    ctx.arc(
      bullet.x,
      bullet.y,
      bullet.radius,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  ctx.shadowBlur = 0;

  for (const enemy of enemies) {
    drawEnemy(enemy);
  }

  // Power-ups
  for (const power of powerUps) {
    const colors = {
      shield: "#22c55e",
      rapid: "#00f5ff",
      bonus: "#facc15"
    };

    ctx.fillStyle = colors[power.type];
    ctx.shadowBlur = 15;
    ctx.shadowColor = colors[power.type];

    ctx.beginPath();
    ctx.arc(
      power.x,
      power.y,
      power.radius,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  ctx.shadowBlur = 0;

  drawBoss();
  drawPlayer();

  if (transitionTimer > 0 && !bossActive) {
    ctx.fillStyle = "#00f5ff";
    ctx.font = "bold 28px Courier New";
    ctx.textAlign = "center";

    ctx.fillText(
      "WAVE " + (wave + 1),
      WIDTH / 2,
      HEIGHT / 2
    );
  }
}

// Keyboard controls
window.addEventListener("keydown", event => {
  if ([
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    " "
  ].includes(event.key)) {
    event.preventDefault();
  }

  keys[event.key] = true;
  keys[event.key.toLowerCase()] = true;

  if (event.code === "Space") {
    keys.Space = true;
  }
});

window.addEventListener("keyup", event => {
  keys[event.key] = false;
  keys[event.key.toLowerCase()] = false;

  if (event.code === "Space") {
    keys.Space = false;
  }
});

// Start and restart
startButton.addEventListener("click", () => {
  resetGame();
  state = "playing";
  overlay.style.display = "none";
});

// Initialize game
createStars();
draw();

requestAnimationFrame(function loop(time) {
  const dt = Math.min((time - lastTime) / 1000, 0.04);
  lastTime = time;

  update(dt);
  draw();

  requestAnimationFrame(loop);
});
