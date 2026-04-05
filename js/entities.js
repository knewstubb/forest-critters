// ---- ENTITY CLASSES ----

class Tree {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 40;
    this.h = 50;
    this.slabs = (typeof Game !== 'undefined' && Game.upgrades && Game.upgrades.axe) ? 5 : 3;
    this.alive = true;
    this.respawnTimer = 0;
  }

  draw(ctx, cam) {
    if (!this.alive) return;
    const sx = this.x - cam.x, sy = this.y - cam.y;
    // Trunk
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(sx + 14, sy + 25, 12, 25);
    // Canopy
    ctx.fillStyle = '#2e7d32';
    ctx.beginPath();
    ctx.arc(sx + 20, sy + 18, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#388e3c';
    ctx.beginPath();
    ctx.arc(sx + 20, sy + 12, 15, 0, Math.PI * 2);
    ctx.fill();
  }

  getBounds() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }
}

class Stone {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 30;
    this.h = 25;
    this.hits = 3;
    this.alive = true;
    this.hasGold = Math.random() < 0.15;
    this.respawnTimer = 0;
  }

  draw(ctx, cam) {
    if (!this.alive) return;
    const sx = this.x - cam.x, sy = this.y - cam.y;
    ctx.fillStyle = '#757575';
    ctx.beginPath();
    ctx.ellipse(sx + 15, sy + 15, 15, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#9e9e9e';
    ctx.beginPath();
    ctx.ellipse(sx + 12, sy + 12, 8, 6, -0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  getBounds() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }
}

class DirtPatch {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 28;
    this.h = 28;
    this.dug = false;
    this.hasGold = Math.random() < 0.25;
  }

  draw(ctx, cam) {
    const sx = this.x - cam.x, sy = this.y - cam.y;
    if (this.dug) {
      ctx.fillStyle = '#4e342e';
      ctx.fillRect(sx + 4, sy + 4, 20, 20);
    } else {
      ctx.fillStyle = '#795548';
      ctx.beginPath();
      ctx.ellipse(sx + 14, sy + 14, 14, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#6d4c41';
      ctx.fillRect(sx + 8, sy + 12, 12, 4);
    }
  }

  getBounds() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }
}

class GroundItem {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.w = 24;
    this.h = 24;
    this.type = type; // 'axe', 'sandwich', 'apple', 'hat', 'gold', 'fruit', 'human_meat'
    this.alive = true;
  }

  draw(ctx, cam) {
    if (!this.alive) return;
    const sx = this.x - cam.x, sy = this.y - cam.y;
    const icons = {
      axe: '🪓', sandwich: '🥪', apple: '🍎', hat: '🎩',
      gold: '✨', fruit: '🍐', human_meat: '🍖', wood: '🪵', stone: '🪨',
      cooked_human_meat: '🥩', cooked_apple: '🍏', cooked_fruit: '🍊', cooked_food: '🍳',
      gold_sword: '🗡️', gold_axe: '🪓', gold_pickaxe: '⛏️', gold_armor: '🛡️'
    };
    ctx.font = '20px serif';
    ctx.fillText(icons[this.type] || '❓', sx, sy + 20);
  }

  getBounds() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }
}

class Human {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 28;
    this.h = 36;
    this.health = 50;
    this.maxHealth = 50;
    this.alive = true;
    this.speed = 0.8 + Math.random() * 0.5;
    this.dir = Math.random() * Math.PI * 2;
    this.dirTimer = 0;
    this.aggro = false;
    this.aggroTarget = null;
    this.attackCooldown = 0;
    // Loot
    const lootTable = ['sandwich', 'apple', 'hat'];
    this.loot = [lootTable[Math.floor(Math.random() * lootTable.length)]];
    if (Math.random() < 0.4) this.loot.push(lootTable[Math.floor(Math.random() * lootTable.length)]);
  }

  update(dt, player) {
    if (!this.alive) return;
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.dirTimer -= dt;

    const dx = player.x - this.x, dy = player.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (this.aggro && dist < 200) {
      // Chase player
      const ang = Math.atan2(dy, dx);
      this.x += Math.cos(ang) * this.speed * 1.3 * dt * 60;
      this.y += Math.sin(ang) * this.speed * 1.3 * dt * 60;
      // Attack if close
      if (dist < 30 && this.attackCooldown <= 0) {
        player.takeDamage(8);
        this.attackCooldown = 1.5;
      }
    } else {
      // Wander
      if (this.dirTimer <= 0) {
        this.dir = Math.random() * Math.PI * 2;
        this.dirTimer = 2 + Math.random() * 3;
      }
      this.x += Math.cos(this.dir) * this.speed * dt * 60;
      this.y += Math.sin(this.dir) * this.speed * dt * 60;
    }
  }

  takeDamage(amount) {
    this.health -= amount;
    this.aggro = true;
    if (this.health <= 0) {
      this.alive = false;
    }
  }

  draw(ctx, cam) {
    if (!this.alive) return;
    const sx = this.x - cam.x, sy = this.y - cam.y;
    // Body
    ctx.fillStyle = '#ffcc80';
    ctx.fillRect(sx + 6, sy + 12, 16, 20);
    // Head
    ctx.fillStyle = '#ffe0b2';
    ctx.beginPath();
    ctx.arc(sx + 14, sy + 10, 10, 0, Math.PI * 2);
    ctx.fill();
    // Eyes
    ctx.fillStyle = '#333';
    ctx.fillRect(sx + 10, sy + 8, 3, 3);
    ctx.fillRect(sx + 16, sy + 8, 3, 3);
    // Health bar
    if (this.health < this.maxHealth) {
      ctx.fillStyle = '#333';
      ctx.fillRect(sx + 2, sy - 4, 24, 4);
      ctx.fillStyle = '#e53935';
      ctx.fillRect(sx + 2, sy - 4, 24 * (this.health / this.maxHealth), 4);
    }
    // Aggro indicator
    if (this.aggro) {
      ctx.fillStyle = '#f44336';
      ctx.font = '12px sans-serif';
      ctx.fillText('!', sx + 12, sy - 8);
    }
  }

  getBounds() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }
}

class FruitTree {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 36;
    this.h = 45;
    this.hasFruit = true;
    this.regrowTimer = 0;
  }

  update(dt) {
    if (!this.hasFruit) {
      this.regrowTimer -= dt;
      if (this.regrowTimer <= 0) this.hasFruit = true;
    }
  }

  draw(ctx, cam) {
    const sx = this.x - cam.x, sy = this.y - cam.y;
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(sx + 12, sy + 22, 12, 23);
    ctx.fillStyle = '#66bb6a';
    ctx.beginPath();
    ctx.arc(sx + 18, sy + 16, 18, 0, Math.PI * 2);
    ctx.fill();
    if (this.hasFruit) {
      ctx.fillStyle = '#f44336';
      ctx.beginPath();
      ctx.arc(sx + 8, sy + 14, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(sx + 26, sy + 18, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  pickFruit() {
    if (this.hasFruit) {
      this.hasFruit = false;
      this.regrowTimer = 15;
      return true;
    }
    return false;
  }

  getBounds() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }
}

class Pavement {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 40;
    this.h = 40;
  }

  draw(ctx, cam) {
    const sx = this.x - cam.x, sy = this.y - cam.y;
    ctx.fillStyle = '#9e9e9e';
    ctx.fillRect(sx, sy, 40, 40);
    ctx.strokeStyle = '#757575';
    ctx.lineWidth = 1;
    ctx.strokeRect(sx, sy, 20, 20);
    ctx.strokeRect(sx + 20, sy, 20, 20);
    ctx.strokeRect(sx, sy + 20, 20, 20);
    ctx.strokeRect(sx + 20, sy + 20, 20, 20);
  }

  getBounds() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
}

class Guest {
  constructor(x, y, hotelX, hotelY) {
    this.x = x;
    this.y = y;
    this.w = 24;
    this.h = 30;
    this.alive = true;
    this.speed = 0.6 + Math.random() * 0.4;
    this.type = ['turtle', 'sloth', 'llama', 'otter'][Math.floor(Math.random() * 4)];
    this.state = 'arriving'; // arriving, staying, leaving
    this.stayTimer = 30 + Math.random() * 30; // 30-60 seconds stay
    this.paid = false;
    this.hotelX = hotelX;
    this.hotelY = hotelY;
    this.targetX = hotelX + 20 + Math.random() * 30;
    this.targetY = hotelY + 30;
  }

  update(dt) {
    if (!this.alive) return;

    if (this.state === 'arriving') {
      const dx = this.targetX - this.x, dy = this.targetY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 5) {
        this.state = 'staying';
      } else {
        this.x += (dx / dist) * this.speed * dt * 60;
        this.y += (dy / dist) * this.speed * dt * 60;
      }
    } else if (this.state === 'staying') {
      this.stayTimer -= dt;
      if (this.stayTimer <= 0) {
        this.state = 'leaving';
        this.paid = true;
        this.targetX = this.x + (Math.random() > 0.5 ? 300 : -300);
        this.targetY = this.y + (Math.random() - 0.5) * 200;
      }
    } else if (this.state === 'leaving') {
      const dx = this.targetX - this.x, dy = this.targetY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 5) {
        this.alive = false;
      } else {
        this.x += (dx / dist) * this.speed * dt * 60;
        this.y += (dy / dist) * this.speed * dt * 60;
      }
    }
  }

  draw(ctx, cam) {
    if (!this.alive) return;
    const sx = this.x - cam.x, sy = this.y - cam.y;
    const colors = {
      turtle: { body: '#2e7d32', head: '#66bb6a' },
      sloth: { body: '#8d6e63', head: '#a1887f' },
      llama: { body: '#fff9c4', head: '#fff176' },
      otter: { body: '#5d4037', head: '#795548' }
    };
    const c = colors[this.type];
    // Body
    ctx.fillStyle = c.body;
    ctx.beginPath();
    ctx.ellipse(sx + 12, sy + 18, 10, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    // Head
    ctx.fillStyle = c.head;
    ctx.beginPath();
    ctx.arc(sx + 12, sy + 6, 7, 0, Math.PI * 2);
    ctx.fill();
    // Eyes
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(sx + 10, sy + 5, 1.5, 0, Math.PI * 2);
    ctx.arc(sx + 14, sy + 5, 1.5, 0, Math.PI * 2);
    ctx.fill();
    // Label
    ctx.font = '9px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText(this.type, sx - 2, sy - 4);
    // Staying indicator
    if (this.state === 'staying') {
      ctx.fillStyle = '#4caf50';
      ctx.font = '10px sans-serif';
      ctx.fillText('💤', sx + 16, sy + 2);
    }
  }

  getBounds() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
}

class Decoration {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.w = 40;
    this.h = 40;
    this.type = type; // fountain, statue, garden, market
  }

  draw(ctx, cam) {
    const sx = this.x - cam.x, sy = this.y - cam.y;
    if (this.type === 'fountain') {
      ctx.fillStyle = '#90a4ae'; ctx.fillRect(sx+8, sy+20, 24, 16);
      ctx.fillStyle = '#b0bec5'; ctx.fillRect(sx+12, sy+24, 16, 8);
      ctx.fillStyle = '#42a5f5';
      ctx.beginPath(); ctx.arc(sx+20, sy+18, 6, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#90caf9';
      ctx.beginPath(); ctx.arc(sx+20, sy+14, 3, 0, Math.PI*2); ctx.fill();
      // Water drops
      ctx.fillStyle = '#64b5f6';
      ctx.beginPath(); ctx.arc(sx+15, sy+12, 1.5, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(sx+25, sy+13, 1.5, 0, Math.PI*2); ctx.fill();
    } else if (this.type === 'statue') {
      ctx.fillStyle = '#9e9e9e'; ctx.fillRect(sx+12, sy+28, 16, 8);
      ctx.fillStyle = '#bdbdbd'; ctx.fillRect(sx+15, sy+10, 10, 18);
      ctx.fillStyle = '#e0e0e0';
      ctx.beginPath(); ctx.arc(sx+20, sy+8, 6, 0, Math.PI*2); ctx.fill();
      // Crown on statue
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(sx+16, sy+1, 8, 3);
      ctx.fillRect(sx+16, sy-1, 2, 3);
      ctx.fillRect(sx+22, sy-1, 2, 3);
      ctx.fillRect(sx+19, sy-2, 2, 3);
    } else if (this.type === 'garden') {
      ctx.fillStyle = '#5d4037'; ctx.fillRect(sx+4, sy+28, 32, 8);
      ctx.fillStyle = '#4caf50';
      ctx.beginPath(); ctx.arc(sx+12, sy+24, 6, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(sx+28, sy+24, 6, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#66bb6a';
      ctx.beginPath(); ctx.arc(sx+20, sy+20, 7, 0, Math.PI*2); ctx.fill();
      // Flowers
      ctx.fillStyle = '#f44336';
      ctx.beginPath(); ctx.arc(sx+10, sy+20, 3, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#ffeb3b';
      ctx.beginPath(); ctx.arc(sx+20, sy+16, 3, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#e91e63';
      ctx.beginPath(); ctx.arc(sx+30, sy+20, 3, 0, Math.PI*2); ctx.fill();
    } else if (this.type === 'market') {
      ctx.fillStyle = '#8d6e63'; ctx.fillRect(sx+2, sy+18, 36, 20);
      ctx.fillStyle = '#a1887f'; ctx.fillRect(sx+4, sy+20, 32, 16);
      // Awning
      ctx.fillStyle = '#e53935';
      ctx.beginPath(); ctx.moveTo(sx, sy+18); ctx.lineTo(sx+20, sy+6); ctx.lineTo(sx+40, sy+18); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffeb3b';
      ctx.beginPath(); ctx.moveTo(sx+4, sy+18); ctx.lineTo(sx+20, sy+9); ctx.lineTo(sx+36, sy+18); ctx.closePath(); ctx.fill();
      // Door
      ctx.fillStyle = '#5d4037'; ctx.fillRect(sx+15, sy+28, 10, 10);
      // Sign
      ctx.fillStyle = '#fff'; ctx.font = '8px sans-serif';
      ctx.fillText('SHOP', sx+11, sy+16);
    }
  }

  getBounds() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
}

class Villager {
  constructor(x, y, type, houseIndex) {
    this.x = x;
    this.y = y;
    this.w = 26;
    this.h = 30;
    this.type = type; // unicorn, otter, tiger, sloth, turtle, cheetah
    this.houseIndex = houseIndex;
    this.homeX = x;
    this.homeY = y;
    this.speed = type === 'cheetah' ? 1.4 : type === 'turtle' ? 0.5 : 0.7 + Math.random() * 0.4;
    this.dir = Math.random() * Math.PI * 2;
    this.dirTimer = 0;
    this.alive = true;
  }

  update(dt) {
    if (!this.alive) return;
    this.dirTimer -= dt;
    if (this.dirTimer <= 0) {
      // Wander near home — pick a direction back toward home if too far
      const dx = this.homeX - this.x, dy = this.homeY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 120) {
        this.dir = Math.atan2(dy, dx) + (Math.random() - 0.5) * 1;
      } else {
        this.dir = Math.random() * Math.PI * 2;
      }
      this.dirTimer = 2 + Math.random() * 4;
    }
    this.x += Math.cos(this.dir) * this.speed * dt * 60;
    this.y += Math.sin(this.dir) * this.speed * dt * 60;
  }

  draw(ctx, cam) {
    if (!this.alive) return;
    const sx = this.x - cam.x, sy = this.y - cam.y;
    const colors = {
      turtle:  { body: '#2e7d32', head: '#66bb6a' },
      sloth:   { body: '#8d6e63', head: '#a1887f' },
      otter:   { body: '#5d4037', head: '#795548' },
      tiger:   { body: '#ef6c00', head: '#ef6c00' },
      unicorn: { body: '#e8eaf6', head: '#e8eaf6' },
      cheetah: { body: '#ffb300', head: '#ffb300' },
    };
    const c = colors[this.type] || colors.turtle;

    // Body
    ctx.fillStyle = c.body;
    ctx.beginPath();
    ctx.ellipse(sx + 13, sy + 18, 11, 13, 0, 0, Math.PI * 2);
    ctx.fill();

    // Belly
    ctx.fillStyle = this.type === 'cheetah' ? '#ffe082' : this.type === 'tiger' ? '#ffcc80' : this.type === 'unicorn' ? '#f3e5f5' : c.head;
    ctx.beginPath();
    ctx.ellipse(sx + 13, sy + 20, 7, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tiger stripes
    if (this.type === 'tiger') {
      ctx.strokeStyle = '#e65100'; ctx.lineWidth = 1.2;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.moveTo(sx + 4, sy + 12 + i * 5); ctx.lineTo(sx + 8, sy + 14 + i * 5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx + 22, sy + 12 + i * 5); ctx.lineTo(sx + 18, sy + 14 + i * 5); ctx.stroke();
      }
    }

    // Cheetah spots
    if (this.type === 'cheetah') {
      ctx.fillStyle = '#5d4037';
      ctx.beginPath(); ctx.arc(sx + 8, sy + 15, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(sx + 17, sy + 18, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(sx + 11, sy + 23, 1.5, 0, Math.PI * 2); ctx.fill();
    }

    // Head
    ctx.fillStyle = c.head;
    ctx.beginPath();
    ctx.arc(sx + 13, sy + 5, 7, 0, Math.PI * 2);
    ctx.fill();

    // Unicorn horn
    if (this.type === 'unicorn') {
      ctx.fillStyle = '#FFD700';
      ctx.beginPath(); ctx.moveTo(sx + 10, sy - 2); ctx.lineTo(sx + 13, sy - 12); ctx.lineTo(sx + 16, sy - 2); ctx.fill();
    }

    // Eyes
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(sx + 11, sy + 4, 1.3, 0, Math.PI * 2);
    ctx.arc(sx + 15, sy + 4, 1.3, 0, Math.PI * 2);
    ctx.fill();

    // Name label
    ctx.font = '9px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText(this.type, sx - 2, sy - 6);
  }

  getBounds() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
}

class TownHuman {
  constructor(x, y, homeX, homeY) {
    this.x = x;
    this.y = y;
    this.w = 28;
    this.h = 36;
    this.homeX = homeX;
    this.homeY = homeY;
    this.alive = true;
    this.speed = 0.6 + Math.random() * 0.3;
    this.dir = Math.random() * Math.PI * 2;
    this.dirTimer = 0;
    this.seesPlayer = false;
    this.attackCooldown = 0;
    this.justAttacked = false; // set true on the frame they land a hit
  }

  update(dt, player) {
    if (!this.alive) return;
    this.dirTimer -= dt;
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.justAttacked = false;

    const dx = player.x - this.x, dy = player.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    this.seesPlayer = dist < 180 && !player.isDisguised() && !player.fainted;

    if (this.seesPlayer) {
      // Chase player
      const ang = Math.atan2(dy, dx);
      this.x += Math.cos(ang) * this.speed * 1.5 * dt * 60;
      this.y += Math.sin(ang) * this.speed * 1.5 * dt * 60;
      // Attack if close
      if (dist < 30 && this.attackCooldown <= 0) {
        this.justAttacked = true;
        this.attackCooldown = 1.2;
      }
    } else {
      // Wander near home
      if (this.dirTimer <= 0) {
        const hdx = this.homeX - this.x, hdy = this.homeY - this.y;
        const hdist = Math.sqrt(hdx * hdx + hdy * hdy);
        if (hdist > 100) {
          this.dir = Math.atan2(hdy, hdx) + (Math.random() - 0.5) * 0.8;
        } else {
          this.dir = Math.random() * Math.PI * 2;
        }
        this.dirTimer = 2 + Math.random() * 3;
      }
      this.x += Math.cos(this.dir) * this.speed * dt * 60;
      this.y += Math.sin(this.dir) * this.speed * dt * 60;
    }
  }

  draw(ctx, cam) {
    if (!this.alive) return;
    const sx = this.x - cam.x, sy = this.y - cam.y;
    // Body
    ctx.fillStyle = '#ffcc80';
    ctx.fillRect(sx + 6, sy + 12, 16, 20);
    // Shirt
    ctx.fillStyle = '#1565C0';
    ctx.fillRect(sx + 6, sy + 12, 16, 12);
    // Pants
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(sx + 6, sy + 24, 7, 8);
    ctx.fillRect(sx + 15, sy + 24, 7, 8);
    // Head
    ctx.fillStyle = '#ffe0b2';
    ctx.beginPath();
    ctx.arc(sx + 14, sy + 10, 10, 0, Math.PI * 2);
    ctx.fill();
    // Hair
    ctx.fillStyle = '#5d4037';
    ctx.beginPath();
    ctx.arc(sx + 14, sy + 6, 10, Math.PI, Math.PI * 2);
    ctx.fill();
    // Eyes
    ctx.fillStyle = '#333';
    ctx.fillRect(sx + 10, sy + 8, 3, 3);
    ctx.fillRect(sx + 16, sy + 8, 3, 3);
    // Alert/chase indicator
    if (this.seesPlayer) {
      ctx.fillStyle = '#f44336';
      ctx.font = '14px sans-serif';
      ctx.fillText('⚠️', sx + 6, sy - 6);
    }
  }

  getBounds() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }
}
