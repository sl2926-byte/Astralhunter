
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
  const roll = Math.random();

  let type;

  if (roll < 0.45) {
    type = "scout";
  } else if (roll < 0.8) {
    type = "fighter";
  } else {
    type = "heavy";
  }

  const settings = {
    scout: { radius: 13, hp: 1, speed: 100, points: 10 },
    fighter: { radius: 17, hp: 2, speed: 65, points: 20 },
    heavy: { radius: 23, hp: 4, speed: 38, points: 50 }
  };

  const s = settings[type];

  enemies.push({
    type,
    x: 30 + Math.random() * (WIDTH - 60),
    y: -30,
    radius: s.radius,
    hp: s.hp,
    maxHp: s.hp,
    speed: s.speed + wave * 5,
    points: s.points,
    shootTimer: 1.5 + Math.random() * 1.5,
    phase: Math.random() * Math.PI * 2
  });
}

function shoot() {
  bullets.push({
    x: player.x,
    y: player.y - 18,
    radius: 4,
    speed: 460
  });

  player.cooldown = player.rapid > 0 ? 0.12 : 0.28;
}

function enemyShoot(enemy) {
  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const length = Math.hypot(dx, dy) || 1;

  enemyBullets.push({
    x: enemy.x,
    y: enemy.y + enemy.radius,
    vx: (dx / length) * 175,
    vy: (dy / length) * 175,
    radius: 5
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
  if (player.invulnerable > 0) return;

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

  // Background stars
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

  // Update enemies
  for (const enemy of enemies) {
    if (enemy.type === "scout") {
      const angle = Math.atan2(
        player.y - enemy.y,
        player.x - enemy.x
      );

      enemy.x += Math.cos(angle) * enemy.speed * dt;
      enemy.y += Math.sin(angle) * enemy.speed * dt;

    } else {
      enemy.y += enemy.speed * dt;
      enemy.x += Math.sin(Date.now() / 400 + enemy.phase) * 35 * dt;

      if (enemy.type === "fighter") {
        enemy.shootTimer -= dt;

        if (enemy.shootTimer <= 0) {
          enemyShoot(enemy);
          enemy.shootTimer = 2.2;
        }
      }
    }

    if (distance(player, enemy) < player.radius + enemy.radius) {
      damagePlayer();
    }

    if (enemy.y > HEIGHT + 30) {
      enemy.remove = true;
      damagePlayer();
    }
  }

  enemies = enemies.filter(e => !e.remove);

  // Player bullets
  for (const bullet of bullets) {
    bullet.y -= bullet.speed * dt;

    for (const enemy of enemies) {
      if (!enemy.remove && distance(bullet, enemy) <
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

    if (boss && !bullet.remove &&
        distance(bullet, boss) < bullet.radius + boss.radius) {
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

  // Boss movement and attacks
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

// Drawing functions

function drawStars() {
  ctx.fillStyle = "#ffffff";

  for (const star of stars) {
    ctx.globalAlpha = 0.4 + star.size / 4;
    ctx.fillRect(star.x, star.y, star.size, star.size);
  }

  ctx.globalAlpha = 1;
}

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

function drawEnemy(enemy) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);

  const colors = {
    scout: "#ff477e",
    fighter: "#f97316",
    heavy: "#a855f7"
  };

  ctx.shadowBlur = 15;
  ctx.shadowColor = colors[enemy.type];
  ctx.fillStyle = colors[enemy.type];

  ctx.beginPath();
  ctx.moveTo(0, 18);
  ctx.lineTo(22, -10);
  ctx.lineTo(10, -6);
  ctx.lineTo(0, -18);
  ctx.lineTo(-10, -6);
  ctx.lineTo(-22, -10);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(-4, -3, 8, 6);

  ctx.restore();

  if (enemy.hp < enemy.maxHp) {
    ctx.fillStyle = "#333";
    ctx.fillRect(enemy.x - 18, enemy.y - 27, 36, 4);

    ctx.fillStyle = "#22c55e";
    ctx.fillRect(
      enemy.x - 18, enemy.y - 27,
      36 * enemy.hp / enemy.maxHp, 4
    );
  }
}

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

  // Boss health bar
  ctx.fillStyle = "#333";
  ctx.fillRect(180, 25, 440, 13);

  ctx.fillStyle = "#ff00ff";
  ctx.fillRect(
    180, 25,
    440 * Math.max(0, boss.hp) / boss.maxHp, 13
  );

  ctx.fillStyle = "white";
  ctx.font = "14px Courier New";
  ctx.textAlign = "center";
  ctx.fillText("BOSS HEALTH", WIDTH / 2, 18);
}

function draw() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  drawStars();

  if (!player) return;

  // Player bullets
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
    ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.shadowBlur = 0;

  for (const enemy of enemies) {
    drawEnemy(enemy);
  }

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
    ctx.arc(power.x, power.y, power.radius, 0, Math.PI * 2);
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

function gameLoop(time) {
  const dt = Math.min((time - lastTime) / 1000, 0.04);
  lastTime = time;

  update(dt);
  draw();

  requestAnimationFrame(gameLoop);
}

// Keyboard controls


window.addEventListener("keydown", event => {
  if ([
    "ArrowUp", "ArrowDown",
    "ArrowLeft", "ArrowRight", " "
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
