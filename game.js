
// ==================================================
// GALACTIC DEFENDER
// Complete JavaScript Game
// ==================================================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreText = document.getElementById("score");
const livesText = document.getElementById("lives");
const waveText = document.getElementById("wave");
const modeText = document.getElementById("mode");

const overlay = document.getElementById("overlay");
const message = document.getElementById("message");
const instructions = document.getElementById("instructions");

const W = canvas.width;
const H = canvas.height;

// ==================================================
// GAME VARIABLES
// ==================================================

let score = 0;
let lives = 3;
let wave = 1;
let mode = "campaign";

let running = false;
let gameOver = false;
let waveTransition = false;

let enemies = [];
let bullets = [];
let enemyBullets = [];
let powerUps = [];
let particles = [];
let stars = [];

let enemyTimer = 0;
let waveTimer = 0;
let frame = 0;

let rapidFire = 0;
let shield = 0;
let bonus = 0;

let enemiesDefeated = 0;
let waveTarget = 8;

let boss = null;

const keys = {};

// ==================================================
// WEAPON SYSTEM
// ==================================================

const weaponOrder = [
  "pulse",
  "triple",
  "beam",
  "orb",
  "nova",
  "laser"
];

const weaponInfo = {
  pulse: {
    name: "Pulse Blaster",
    color: "#65f4ff",
    cooldown: 17,
    key: "1"
  },

  triple: {
    name: "Triple Shot",
    color: "#ffe66d",
    cooldown: 23,
    key: "2"
  },

  beam: {
    name: "Plasma Beam",
    color: "#c58bff",
    cooldown: 30,
    key: "3"
  },

  orb: {
    name: "Electric Orb",
    color: "#65ffcf",
    cooldown: 34,
    key: "4"
  },

  nova: {
    name: "Nova Burst",
    color: "#ff9b5e",
    cooldown: 38,
    key: "5"
  },

  laser: {
    name: "Rapid Laser",
    color: "#ff6bd6",
    cooldown: 8,
    key: "6"
  }
};

let unlockedWeapons = ["pulse"];
let currentWeapon = "pulse";

// Create weapon display automatically.

const weaponDisplay = document.createElement("div");

weaponDisplay.id = "weaponDisplay";

weaponDisplay.style.cssText = `
  margin: 10px auto;
  padding: 10px;
  max-width: 650px;
  text-align: center;
  color: #65f4ff;
  background: rgba(7,15,38,.95);
  border: 1px solid #247eaa;
  border-radius: 8px;
  font: bold 13px Arial;
  letter-spacing: 1px;
`;

weaponDisplay.textContent = "WEAPON: PULSE BLASTER | PRESS 1-6";

canvas.insertAdjacentElement("afterend", weaponDisplay);

function updateWeaponDisplay() {
  const info = weaponInfo[currentWeapon];

  const owned = unlockedWeapons
    .map(id => weaponInfo[id].key + ": " + weaponInfo[id].name)
    .join(" | ");

  weaponDisplay.style.color = info.color;
  weaponDisplay.style.borderColor = info.color;

  weaponDisplay.textContent =
    "WEAPON: " + info.name.toUpperCase() +
    " | PRESS 1-6 TO SWITCH | OWNED: " + owned;
}

function switchWeaponByNumber(number) {
  const weapon = weaponOrder[number - 1];

  if (!weapon) return;

  if (!unlockedWeapons.includes(weapon)) {
    return;
  }

  currentWeapon = weapon;

  updateWeaponDisplay();
}

// ==================================================
// PLAYER
// ==================================================

const player = {
  x: W / 2,
  y: H - 85,
  width: 52,
  height: 58,
  speed: 5,
  cooldown: 0
};

// ==================================================
// BACKGROUND STARS
// ==================================================

for (let i = 0; i < 120; i++) {
  stars.push({
    x: Math.random() * W,
    y: Math.random() * H,
    size: Math.random() * 2 + 0.5,
    speed: Math.random() * 1.5 + 0.3
  });
}

function drawStars() {
  ctx.fillStyle = "#050817";
  ctx.fillRect(0, 0, W, H);

  for (const star of stars) {
    ctx.fillStyle = "#b8dfff";

    ctx.globalAlpha = 0.4 + Math.random() * 0.5;

    ctx.fillRect(
      star.x,
      star.y,
      star.size,
      star.size
    );

    star.y += star.speed;

    if (star.y > H) {
      star.y = 0;
      star.x = Math.random() * W;
    }
  }

  ctx.globalAlpha = 1;
}

// ==================================================
// DRAWING HELPERS
// ==================================================

function metalGradient(x, y, w, h, colors) {
  const gradient = ctx.createLinearGradient(
    x, y, x, y + h
  );

  colors.forEach((color, i) => {
    gradient.addColorStop(
      i / (colors.length - 1),
      color
    );
  });

  return gradient;
}

function shipPolygon(points, color, stroke = "#bcecff") {
  ctx.beginPath();

  ctx.moveTo(points[0][0], points[0][1]);

  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i][0], points[i][1]);
  }

  ctx.closePath();

  ctx.fillStyle = color;
  ctx.fill();

  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function shipLight(x, y, radius, color) {
  ctx.save();

  ctx.shadowBlur = 15;
  ctx.shadowColor = color;

  ctx.fillStyle = color;

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function shipCockpit(x, y, rx, ry, color) {
  ctx.save();

  ctx.shadowBlur = 12;
  ctx.shadowColor = color;

  ctx.fillStyle = color;

  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#d9ffff";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();
}

function shipEngine(x, y, width, height, color) {
  ctx.save();

  ctx.shadowBlur = 18;
  ctx.shadowColor = color;

  ctx.fillStyle = "#10192e";

  ctx.fillRect(
    x - width / 2,
    y,
    width,
    height
  );

  ctx.fillStyle = color;

  ctx.fillRect(
    x - width / 3,
    y + height,
    width * 2 / 3,
    height * 0.6
  );

  ctx.restore();
}

// ==================================================
// PLAYER SHIP MODEL
// ==================================================

function drawPlayer() {
  const x = player.x;
  const y = player.y;

  ctx.save();
  ctx.translate(x, y);

  if (shield > 0) {
    ctx.beginPath();

    ctx.ellipse(
      0, 0, 42, 47, 0,
      0, Math.PI * 2
    );

    ctx.strokeStyle = "#48eaff";
    ctx.lineWidth = 3;

    ctx.shadowBlur = 20;
    ctx.shadowColor = "#00d9ff";

    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  shipEngine(-17, 17, 12, 12, "#ff8a32");
  shipEngine(17, 17, 12, 12, "#ff8a32");

  shipPolygon([
    [0, -34],
    [-13, -12],
    [-27, 13],
    [-23, 25],
    [-10, 18],
    [0, 28],
    [10, 18],
    [23, 25],
    [27, 13],
    [13, -12]
  ],
  metalGradient(-27, -34, 54, 65, [
    "#e6faff",
    "#5799d0",
    "#173b71",
    "#09172f"
  ]));

  shipPolygon([
    [0, -27],
    [-8, -5],
    [0, 14],
    [8, -5]
  ], "#a7eaff");

  shipCockpit(0, -7, 7, 12, "#29dfff");

  shipLight(-18, 9, 2, "#00eaff");
  shipLight(18, 9, 2, "#00eaff");

  ctx.restore();
}

// ==================================================
// ENEMY MODELS
// ==================================================

function drawScout() {
  shipPolygon([
    [0, 28],
    [-17, -8],
    [-12, -22],
    [0, -12],
    [12, -22],
    [17, -8]
  ],
  metalGradient(-17, -22, 34, 50, [
    "#ffb36a",
    "#d94b32",
    "#5e1725"
  ]));

  shipCockpit(0, -5, 5, 9, "#ffefaa");
  shipEngine(0, 22, 10, 5, "#ff702e");
}

function drawFighter() {
  shipPolygon([
    [0, 30],
    [-10, 5],
    [-29, -10],
    [-25, -18],
    [-8, -12],
    [0, -26],
    [8, -12],
    [25, -18],
    [29, -10],
    [10, 5]
  ],
  metalGradient(-29, -26, 58, 56, [
    "#ffb6a3",
    "#b52f57",
    "#4b153f"
  ]));

  shipCockpit(0, -8, 7, 10, "#ff8ed8");

  shipEngine(-18, 8, 9, 8, "#ff4c9a");
  shipEngine(18, 8, 9, 8, "#ff4c9a");
}

function drawHeavy() {
  shipPolygon([
    [-30, -18],
    [-20, -28],
    [20, -28],
    [30, -18],
    [34, 12],
    [20, 28],
    [-20, 28],
    [-34, 12]
  ],
  metalGradient(-34, -28, 68, 56, [
    "#d2b4ff",
    "#65449c",
    "#261e55"
  ]));

  shipCockpit(0, -7, 9, 10, "#ffb5ff");

  shipEngine(-23, 14, 10, 10, "#b66cff");
  shipEngine(23, 14, 10, 10, "#b66cff");
}

function drawStealth() {
  shipPolygon([
    [0, 30],
    [-12, 5],
    [-33, -23],
    [-8, -14],
    [0, -31],
    [8, -14],
    [33, -23],
    [12, 5]
  ],
  metalGradient(-33, -31, 66, 61, [
    "#9eeaff",
    "#285a8d",
    "#101c48"
  ]));

  shipCockpit(0, -10, 5, 8, "#00ffff");

  shipLight(-18, -4, 2, "#00ffff");
  shipLight(18, -4, 2, "#00ffff");
}

function drawDrone() {
  shipPolygon([
    [0, -23],
    [11, -10],
    [23, 0],
    [11, 10],
    [0, 23],
    [-11, 10],
    [-23, 0],
    [-11, -10]
  ],
  metalGradient(-23, -23, 46, 46, [
    "#fff1a8",
    "#a98528",
    "#44351c"
  ]));

  shipCockpit(0, 0, 8, 8, "#fff6c5");

  shipLight(0, -17, 3, "#ffe66d");
  shipLight(-17, 0, 3, "#ffe66d");
  shipLight(17, 0, 3, "#ffe66d");
}

function drawSupport() {
  shipPolygon([
    [0, 26],
    [-14, 7],
    [-27, -5],
    [-22, -20],
    [-7, -14],
    [0, -27],
    [7, -14],
    [22, -20],
    [27, -5],
    [14, 7]
  ],
  metalGradient(-27, -27, 54, 54, [
    "#a8ffc8",
    "#368f70",
    "#124a4c"
  ]));

  shipCockpit(0, -6, 7, 9, "#aaffc8");

  shipLight(-19, 2, 4, "#4dffb0");
  shipLight(19, 2, 4, "#4dffb0");

  shipEngine(0, 17, 12, 7, "#43ffb0");
}

// ==================================================
// ENEMY DRAWING
// ==================================================

function drawEnemies() {
  for (const enemy of enemies) {
    ctx.save();

    ctx.translate(enemy.x, enemy.y);

    ctx.scale(
      enemy.width / 70,
      enemy.height / 65
    );

    if (enemy.type === "scout") drawScout();
    if (enemy.type === "fighter") drawFighter();
    if (enemy.type === "heavy") drawHeavy();
    if (enemy.type === "stealth") drawStealth();
    if (enemy.type === "drone") drawDrone();
    if (enemy.type === "support") drawSupport();

    ctx.restore();

    if (enemy.hp > 1) {
      ctx.fillStyle = "#37101b";

      ctx.fillRect(
        enemy.x - enemy.width / 2,
        enemy.y - enemy.height / 2 - 9,
        enemy.width,
        4
      );

      ctx.fillStyle = "#ff4c75";

      ctx.fillRect(
        enemy.x - enemy.width / 2,
        enemy.y - enemy.height / 2 - 9,
        enemy.width * enemy.hp / enemy.maxHp,
        4
      );
    }
  }
}

// ==================================================
// BOSS
// ==================================================

function drawBoss() {
  if (!boss) return;

  ctx.save();

  ctx.translate(boss.x, boss.y);

  const pulse = Math.sin(frame * 0.08) * 3;

  shipEngine(-43, 22, 23, 15, "#ff3d7f");
  shipEngine(43, 22, 23, 15, "#ff3d7f");

  shipPolygon([
    [-65, -12],
    [-48, -37],
    [-20, -30],
    [0, -43],
    [20, -30],
    [48, -37],
    [65, -12],
    [56, 28],
    [30, 38],
    [0, 30],
    [-30, 38],
    [-56, 28]
  ],
  metalGradient(-65, -43, 130, 86, [
    "#ffb4c9",
    "#a32658",
    "#42113f"
  ]));

  shipCockpit(
    0, -7,
    17 + pulse,
    19 + pulse,
    "#ff47c8"
  );

  shipLight(-43, -4, 5, "#ff5a91");
  shipLight(43, -4, 5, "#ff5a91");

  ctx.restore();

  // Boss health bar

  ctx.fillStyle = "#45112c";

  ctx.fillRect(
    boss.x - 65,
    boss.y - 58,
    130,
    8
  );

  ctx.fillStyle = "#ff3f93";

  ctx.fillRect(
    boss.x - 65,
    boss.y - 58,
    130 * Math.max(0, boss.hp / boss.maxHp),
    8
  );

  ctx.fillStyle = "white";
  ctx.font = "bold 13px Arial";
  ctx.textAlign = "center";

  ctx.fillText(
    "GALACTIC OVERLORD",
    boss.x,
    boss.y - 65
  );
}

// ==================================================
// BULLETS
// ==================================================

function fireBullet(x, y, options = {}) {
  bullets.push({
    x,
    y,

    vx: options.vx ?? 0,
    vy: options.vy ?? -9,

    damage: options.damage ?? 1,

    type: options.type || "pulse",

    color: options.color || weaponInfo[currentWeapon].color,

    pierce: options.pierce || false
  });
}

function drawBullets() {
  for (const bullet of bullets) {
    ctx.save();

    ctx.shadowBlur = bullet.type === "beam" ? 22 : 13;
    ctx.shadowColor = bullet.color;
    ctx.fillStyle = bullet.color;

    if (bullet.type === "orb") {
      ctx.beginPath();

      ctx.arc(
        bullet.x,
        bullet.y,
        9,
        0,
        Math.PI * 2
      );

      ctx.fill();

      ctx.strokeStyle = "#ffffff";
      ctx.stroke();
    } else if (bullet.type === "beam") {
      ctx.fillRect(
        bullet.x - 6,
        bullet.y - 22,
        12,
        32
      );
    } else {
      ctx.fillRect(
        bullet.x - 3,
        bullet.y - 10,
        6,
        15
      );
    }

    ctx.restore();
  }

  for (const bullet of enemyBullets) {
    ctx.save();

    ctx.shadowBlur = 10;
    ctx.shadowColor = "#ff4d78";

    ctx.fillStyle = "#ff537b";

    ctx.beginPath();

    ctx.arc(
      bullet.x,
      bullet.y,
      5,
      0,
      Math.PI * 2
    );

    ctx.fill();

    ctx.restore();
  }
}

// ==================================================
// PLAYER SHOOTING
// ==================================================

function shoot() {
  if (player.cooldown > 0) {
    player.cooldown--;
    return;
  }

  if (!keys[" "] && !keys["Space"]) return;

  const weapon = currentWeapon;

  const cooldown = rapidFire > 0
    ? Math.max(4, Math.floor(weaponInfo[weapon].cooldown * 0.55))
    : weaponInfo[weapon].cooldown;

  if (weapon === "pulse") {
    fireBullet(
      player.x,
      player.y - 30,
      { type: "pulse" }
    );
  }

  else if (weapon === "triple") {
    fireBullet(
      player.x,
      player.y - 30,
      { type: "triple" }
    );

    fireBullet(
      player.x - 15,
      player.y - 20,
      { type: "triple", vx: -1.5, vy: -8.5 }
    );

    fireBullet(
      player.x + 15,
      player.y - 20,
      { type: "triple", vx: 1.5, vy: -8.5 }
    );
  }

  else if (weapon === "beam") {
    fireBullet(
      player.x,
      player.y - 38,
      {
        type: "beam",
        vy: -12,
        damage: 3,
        pierce: true,
        color: "#c58bff"
      }
    );
  }

  else if (weapon === "orb") {
    fireBullet(
      player.x,
      player.y - 30,
      {
        type: "orb",
        vy: -6,
        damage: 3,
        color: "#65ffcf"
      }
    );
  }

  else if (weapon === "nova") {
    for (let i = -2; i <= 2; i++) {
      fireBullet(
        player.x,
        player.y - 25,
        {
          type: "nova",
          vx: i * 1.8,
          vy: -8.5,
          damage: 2,
          color: "#ff9b5e"
        }
      );
    }
  }

  else if (weapon === "laser") {
    fireBullet(
      player.x - 10,
      player.y - 28,
      {
        type: "laser",
        vy: -12,
        color: "#ff6bd6"
      }
    );

    fireBullet(
      player.x + 10,
      player.y - 28,
      {
        type: "laser",
        vy: -12,
        color: "#ff6bd6"
      }
    );
  }

  player.cooldown = cooldown;
}

// ==================================================
// PLAYER MOVEMENT
// ==================================================

function movePlayer() {
  if (
    keys["ArrowLeft"] ||
    keys["a"] ||
    keys["A"]
  ) {
    player.x -= player.speed;
  }

  if (
    keys["ArrowRight"] ||
    keys["d"] ||
    keys["D"]
  ) {
    player.x += player.speed;
  }

  if (
    keys["ArrowUp"] ||
    keys["w"] ||
    keys["W"]
  ) {
    player.y -= player.speed;
  }

  if (
    keys["ArrowDown"] ||
    keys["s"] ||
    keys["S"]
  ) {
    player.y += player.speed;
  }

  player.x = Math.max(
    35,
    Math.min(W - 35, player.x)
  );

  player.y = Math.max(
    40,
    Math.min(H - 40, player.y)
  );
}

// ==================================================
// ENEMY TYPES AND WAVES
// ==================================================

const enemySizes = {
  scout: [44, 48],
  fighter: [58, 55],
  heavy: [68, 58],
  stealth: [60, 58],
  drone: [46, 46],
  support: [58, 55]
};

const enemyHealth = {
  scout: 1,
  fighter: 2,
  heavy: 5,
  stealth: 2,
  drone: 1,
  support: 3
};

function availableEnemies() {
  const types = ["scout"];

  if (wave >= 2) types.push("fighter");
  if (wave >= 3) types.push("heavy");
  if (wave >= 4) types.push("stealth");
  if (wave >= 5) types.push("drone");
  if (wave >= 7) types.push("support");

  return types;
}

function spawnEnemy() {
  const types = availableEnemies();

  const type = types[
    Math.floor(Math.random() * types.length)
  ];

  const size = enemySizes[type];

  const hp = enemyHealth[type] +
    Math.floor((wave - 1) / 4);

  enemies.push({
    type,

    x: Math.random() * (W - 100) + 50,
    y: -50,

    width: size[0],
    height: size[1],

    hp,
    maxHp: hp,

    speed: 1.2 + wave * 0.12 + Math.random(),

    shootTimer: Math.random() * 100 + 60,

    phase: Math.random() * 6
  });
}

function updateEnemies() {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];

    enemy.y += enemy.speed;
    enemy.phase += 0.03;

    if (enemy.type === "stealth") {
      enemy.x += Math.sin(enemy.phase) * 2;
    }

    else if (enemy.type === "drone") {
      enemy.x += Math.sin(enemy.phase * 2) * 1.5;
    }

    else if (enemy.type === "support") {
      enemy.x += Math.sin(enemy.phase) * 1.2;
    }

    enemy.shootTimer--;

    if (
      enemy.shootTimer <= 0 &&
      enemy.y > 0 &&
      enemy.y < H - 100
    ) {
      enemyBullets.push({
        x: enemy.x,
        y: enemy.y + 20,
        speed: 3 + wave * 0.08
      });

      enemy.shootTimer = Math.max(
        35,
        100 + Math.random() * 100 - wave * 2
      );
    }

    if (enemy.y > H + 50) {
      enemies.splice(i, 1);
      damagePlayer();
    }
  }
}

// ==================================================
// BOSS SYSTEM
// ==================================================

function spawnBoss() {
  boss = {
    x: W / 2,
    y: 100,

    width: 130,
    height: 85,

    hp: 120,
    maxHp: 120,

    direction: 1,

    shootTimer: 60
  };
}

function updateBoss() {
  if (!boss) return;

  boss.x += boss.direction * 2.2;

  if (
    boss.x > W - 100 ||
    boss.x < 100
  ) {
    boss.direction *= -1;
  }

  boss.shootTimer--;

  if (boss.shootTimer <= 0) {
    for (let i = -2; i <= 2; i++) {
      enemyBullets.push({
        x: boss.x + i * 22,
        y: boss.y + 35,
        speed: 4 + wave * 0.1
      });
    }

    boss.shootTimer = 55;
  }

  if (boss.hp <= 0) {
    createExplosion(
      boss.x,
      boss.y,
      "#ff5cb8"
    );

    score += 1000;

    boss = null;

    if (mode === "campaign") {
      winGame();
    } else {
      nextWave();
    }
  }
}

// ==================================================
// POWER-UP DROPS
// ==================================================

function maybeDropPowerUp(x, y) {
  if (Math.random() > 0.28) return;

  const missingWeapons = weaponOrder.filter(
    id => !unlockedWeapons.includes(id)
  );

  let type;

  if (
    missingWeapons.length > 0 &&
    Math.random() < 0.62
  ) {
    const found = missingWeapons[
      Math.floor(Math.random() * missingWeapons.length)
    ];

    type = "weapon_" + found;
  }

  else {
    const types = [
      "shield",
      "rapid",
      "bonus",
      "life"
    ];

    type = types[
      Math.floor(Math.random() * types.length)
    ];
  }

  powerUps.push({
    x,
    y,
    type,
    speed: 2.2
  });
}

function collectPowerUp(type) {
  if (type === "shield") {
    shield = 500;
  }

  if (type === "rapid") {
    rapidFire = 500;
  }

  if (type === "bonus") {
    bonus += 100;
  }

  if (type === "life") {
    lives = Math.min(5, lives + 1);
  }

  if (type.startsWith("weapon_")) {
    const weapon = type.replace("weapon_", "");

    if (
      weaponInfo[weapon] &&
      !unlockedWeapons.includes(weapon)
    ) {
      unlockedWeapons.push(weapon);

      currentWeapon = weapon;

      createExplosion(
        player.x,
        player.y,
        weaponInfo[weapon].color
      );
    }
  }

  updateHUD();
}

function updatePowerUps() {
  for (let i = powerUps.length - 1; i >= 0; i--) {
    const p = powerUps[i];

    p.y += p.speed;

    if (p.y > H + 20) {
      powerUps.splice(i, 1);
    }
  }

  if (shield > 0) shield--;
  if (rapidFire > 0) rapidFire--;
}

// ==================================================
// DRAW POWER-UPS
// ==================================================

function drawPowerUps() {
  const colors = {
    shield: "#39dfff",
    rapid: "#ffe66d",
    bonus: "#b98aff",
    life: "#59ff91",

    weapon_triple: "#ffe66d",
    weapon_beam: "#c58bff",
    weapon_orb: "#65ffcf",
    weapon_nova: "#ff9b5e",
    weapon_laser: "#ff6bd6"
  };

  const symbols = {
    shield: "S",
    rapid: "R",
    bonus: "$",
    life: "+",

    weapon_triple: "3",
    weapon_beam: "B",
    weapon_orb: "O",
    weapon_nova: "N",
    weapon_laser: "L"
  };

  for (const p of powerUps) {
    ctx.save();

    ctx.shadowBlur = 15;
    ctx.shadowColor = colors[p.type];

    ctx.fillStyle = colors[p.type];

    ctx.beginPath();

    ctx.arc(
      p.x,
      p.y,
      13,
      0,
      Math.PI * 2
    );

    ctx.fill();

    ctx.fillStyle = "#091327";
    ctx.font = "bold 16px Arial";

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillText(
      symbols[p.type],
      p.x,
      p.y
    );

    ctx.restore();
  }
}

// ==================================================
// PARTICLES AND EXPLOSIONS
// ==================================================

function createExplosion(x, y, color = "#ff9d4d") {
  for (let i = 0; i < 18; i++) {
    const angle = Math.random() * Math.PI * 2;

    const speed = Math.random() * 4 + 1;

    particles.push({
      x,
      y,

      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,

      life: 35,

      color
    });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];

    p.x += p.vx;
    p.y += p.vy;

    p.life--;

    ctx.globalAlpha = Math.max(
      0,
      p.life / 35
    );

    ctx.fillStyle = p.color;

    ctx.fillRect(
      p.x,
      p.y,
      4,
      4
    );

    ctx.globalAlpha = 1;

    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

// ==================================================
// BULLET MOVEMENT
// ==================================================

function updateBullets() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];

    bullet.x += bullet.vx;
    bullet.y += bullet.vy;

    if (
      bullet.y < -30 ||
      bullet.x < -30 ||
      bullet.x > W + 30
    ) {
      bullets.splice(i, 1);
    }
  }

  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const bullet = enemyBullets[i];

    bullet.y += bullet.speed;

    if (bullet.y > H + 20) {
      enemyBullets.splice(i, 1);
    }
  }
}

// ==================================================
// COLLISION DETECTION
// ==================================================

function collision(a, b, range = 25) {
  return (
    Math.abs(a.x - b.x) < range &&
    Math.abs(a.y - b.y) < range
  );
}

function checkCollisions() {

  // Player bullets hitting boss and enemies

  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];

    if (boss && collision(bullet, boss, 65)) {
      boss.hp -= bullet.damage || 1;

      if (!bullet.pierce) {
        bullets.splice(i, 1);
      } else {
        bullet.y = -100;
      }

      continue;
    }

    for (let j = enemies.length - 1; j >= 0; j--) {
      const enemy = enemies[j];

      if (
        collision(
          bullet,
          enemy,
          Math.max(enemy.width, enemy.height) * 0.45
        )
      ) {
        enemy.hp -= bullet.damage || 1;

        if (!bullet.pierce) {
          bullets.splice(i, 1);
        } else {
          bullet.y = -100;
        }

        if (enemy.hp <= 0) {
          score += enemy.type === "heavy" ? 40 : 20;

          enemiesDefeated++;

          createExplosion(
            enemy.x,
            enemy.y
          );

          maybeDropPowerUp(
            enemy.x,
            enemy.y
          );

          enemies.splice(j, 1);
        }

        break;
      }
    }
  }

  // Enemy bullets hitting player

  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const bullet = enemyBullets[i];

    if (collision(bullet, player, 28)) {
      enemyBullets.splice(i, 1);
      damagePlayer();
    }
  }

  // Enemy ships hitting player

  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];

    if (collision(enemy, player, 34)) {
      createExplosion(
        enemy.x,
        enemy.y
      );

      enemies.splice(i, 1);

      damagePlayer();
    }
  }

  // Collect power-ups and weapon drops

  for (let i = powerUps.length - 1; i >= 0; i--) {
    const p = powerUps[i];

    if (collision(p, player, 30)) {
      collectPowerUp(p.type);

      powerUps.splice(i, 1);
    }
  }
}

// ==================================================
// DAMAGE AND PLAYER LIVES
// ==================================================

function damagePlayer() {
  if (shield > 0) return;

  lives--;

  createExplosion(
    player.x,
    player.y,
    "#ff6b6b"
  );

  updateHUD();

  if (lives <= 0) {
    endGame();
  }
}

// ==================================================
// HUD
// ==================================================

function updateHUD() {
  scoreText.textContent = score + bonus;

  livesText.textContent = lives;

  waveText.textContent = wave;

  modeText.textContent =
    mode === "campaign" ? "Campaign" : "Infinite";

  updateWeaponDisplay();
}

// ==================================================
// WAVE SYSTEM
// ==================================================

function nextWave() {
  wave++;

  const maximum = mode === "campaign" ? 10 : 100;

  if (wave > maximum) {
    winGame();
    return;
  }

  enemies = [];
  enemyBullets = [];
  bullets = [];
  powerUps = [];

  enemiesDefeated = 0;

  waveTarget = 8 + wave * 2;

  waveTransition = true;

  waveTimer = 120;

  enemyTimer = 60;

  updateHUD();
}

function updateWave() {

  if (waveTransition) {
    waveTimer--;

    if (waveTimer <= 0) {
      waveTransition = false;
    }

    return;
  }

  // Final campaign boss

  if (mode === "campaign" && wave === 10) {
    if (!boss) {
      spawnBoss();
    }

    return;
  }

  const maxEnemies = Math.min(
    4 + wave,
    16
  );

  // Spawn enemies

  if (
    enemyTimer <= 0 &&
    enemies.length < maxEnemies &&
    enemiesDefeated < waveTarget
  ) {
    spawnEnemy();

    enemyTimer = Math.max(
      25,
      95 - wave * 5
    );
  }

  enemyTimer--;

  // Move to next wave after defeating the target

  if (
    enemiesDefeated >= waveTarget &&
    enemies.length === 0
  ) {
    nextWave();
  }
}

// ==================================================
// GAME START
// ==================================================

function resetGame(selectedMode) {
  score = 0;

  lives = 3;

  wave = 1;

  mode = selectedMode;

  enemies = [];
  bullets = [];
  enemyBullets = [];
  powerUps = [];
  particles = [];

  boss = null;

  player.x = W / 2;
  player.y = H - 85;

  player.cooldown = 0;

  enemyTimer = 60;

  waveTimer = 0;

  frame = 0;

  enemiesDefeated = 0;

  waveTarget = 10;

  rapidFire = 0;
  shield = 0;
  bonus = 0;

  unlockedWeapons = ["pulse"];

  currentWeapon = "pulse";

  gameOver = false;

  waveTransition = false;

  running = true;

  Object.keys(keys).forEach(key => {
    keys[key] = false;
  });

  overlay.style.display = "none";

  updateHUD();

  requestAnimationFrame(gameLoop);
}

// ==================================================
// GAME OVER
// ==================================================

function endGame() {
  running = false;

  gameOver = true;

  overlay.style.display = "flex";

  message.textContent = "GAME OVER!";

  instructions.innerHTML =
    "Your final score: " + (score + bonus) +
    "<br>You reached wave " + wave + ".";

  document.getElementById("startButton").textContent =
    "TRY AGAIN";

  document.getElementById("infiniteButton").textContent =
    "INFINITE MODE";
}

// ==================================================
// WIN GAME
// ==================================================

function winGame() {
  running = false;

  overlay.style.display = "flex";

  message.textContent = "GALAXY SAVED!";

  instructions.innerHTML =
    "Congratulations! You defeated the Galactic Overlord!" +
    "<br>Final score: " + (score + bonus);

  document.getElementById("startButton").textContent =
    "PLAY AGAIN";

  document.getElementById("infiniteButton").textContent =
    "INFINITE MODE";
}

// ==================================================
// MAIN GAME LOOP
// ==================================================

function gameLoop() {
  if (!running) return;

  frame++;

  drawStars();

  movePlayer();

  shoot();

  if (!waveTransition) {
    updateEnemies();

    updateBullets();

    updatePowerUps();

    updateBoss();

    checkCollisions();
  }

  // Always update the wave timer!

  updateWave();

  drawEnemies();

  drawBullets();

  drawPowerUps();

  drawPlayer();

  if (boss) {
    drawBoss();
  }

  updateParticles();

  if (waveTransition) {
    ctx.fillStyle = "#ffffff";

    ctx.textAlign = "center";

    ctx.font = "bold 38px Arial";

    ctx.fillText(
      "WAVE " + wave,
      W / 2,
      H / 2
    );
  }

  updateHUD();

  requestAnimationFrame(gameLoop);
}

// ==================================================
// KEYBOARD CONTROLS
// ==================================================

document.addEventListener("keydown", event => {
  keys[event.key] = true;

  if (/^[1-6]$/.test(event.key)) {
    switchWeaponByNumber(
      Number(event.key)
    );
  }

  if (
    [
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      " "
    ].includes(event.key)
  ) {
    event.preventDefault();
  }
});

document.addEventListener("keyup", event => {
  keys[event.key] = false;
});

// ==================================================
// BUTTON CONTROLS
// ==================================================

document.getElementById("startButton")
  .addEventListener("click", () => {
    resetGame("campaign");
  });

document.getElementById("infiniteButton")
  .addEventListener("click", () => {
    resetGame("infinite");
  });

// ==================================================
// INITIAL SCREEN
// ==================================================

drawStars();

drawPlayer();

updateWeaponDisplay();

updateHUD();
