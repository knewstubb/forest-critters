class Player {
  constructor(type, x, y) {
    this.type = type; // 'turtle' or 'sloth'
    this.x = x;
    this.y = y;
    this.w = 28;
    this.h = 32;
    this.speed = type === 'turtle' ? 2.5 : 2.0;
    this.facing = 'down'; // up, down, left, right
    this.angle = 0; // angle toward mouse in radians
    this.mouseX = 0; // mouse position in world coords
    this.mouseY = 0;

    // Stats
    this.health = 100;
    this.maxHealth = 100;
    this.hunger = 100;
    this.maxHunger = 100;
    this.fainted = false;
    this.faintTimer = 0;

    // Inventory: 7 slots, items stack by type
    // Each slot: { type, count, maxStack } or null
    this.inventory = new Array(20).fill(null);
    this.equippedSlot = -1; // index of equipped item

    // Combat
    this.attackCooldown = 0;
    this.attackAnim = 0;

    // Building
    this.totalWoodCollected = 0;
    this.houseBuilt = false;

    // Keys
    this.keys = {};

    // Outfit (worn clothing)
    this.outfit = { hat: null, top: null, bottom: null };
  }

  getEquipped() {
    if (this.equippedSlot >= 0 && this.inventory[this.equippedSlot]) {
      return this.inventory[this.equippedSlot];
    }
    return null;
  }

  addItem(type, count = 1) {
    let remaining = count;
    // Try to stack onto existing slots of same type
    for (let i = 0; i < this.inventory.length && remaining > 0; i++) {
      if (this.inventory[i] && this.inventory[i].type === type) {
        this.inventory[i].count += remaining;
        remaining = 0;
      }
    }
    // Try empty slots
    for (let i = 0; i < this.inventory.length && remaining > 0; i++) {
      if (!this.inventory[i]) {
        this.inventory[i] = { type, count: remaining };
        remaining = 0;
      }
    }
    return count - remaining;
  }

  removeItem(type, count = 1) {
    let remaining = count;
    // Remove from inventory first
    for (let i = this.inventory.length - 1; i >= 0 && remaining > 0; i--) {
      if (this.inventory[i] && this.inventory[i].type === type) {
        const remove = Math.min(this.inventory[i].count, remaining);
        this.inventory[i].count -= remove;
        remaining -= remove;
        if (this.inventory[i].count <= 0) {
          this.inventory[i] = null;
          if (this.equippedSlot === i) this.equippedSlot = -1;
        }
      }
    }
    // Then remove from table storage in all houses if needed
    if (remaining > 0 && typeof Game !== 'undefined' && Game.houses) {
      for (const house of Game.houses) {
        const slots = house.interior.table.slots;
        for (let i = slots.length - 1; i >= 0 && remaining > 0; i--) {
          if (slots[i] && slots[i].type === type) {
            const remove = Math.min(slots[i].count, remaining);
            slots[i].count -= remove;
            remaining -= remove;
            if (slots[i].count <= 0) slots[i] = null;
          }
        }
      }
    }
    return count - remaining;
  }

  countItem(type) {
    let total = 0;
    for (const slot of this.inventory) {
      if (slot && slot.type === type) total += slot.count;
    }
    // Also count from table storage in all houses
    if (typeof Game !== 'undefined' && Game.houses) {
      for (const house of Game.houses) {
        for (const slot of house.interior.table.slots) {
          if (slot && slot.type === type) total += slot.count;
        }
      }
    }
    return total;
  }

  hasItem(type) {
    return this.countItem(type) > 0;
  }

  inventoryFull() {
    return this.inventory.every(s => s !== null);
  }

  isDisguised() {
    return !!(this.outfit.hat && this.outfit.top && this.outfit.bottom);
  }

  takeDamage(amount) {
    // Hat or gold armor reduces damage
    if (this.outfit.hat || this.hasItem('hat')) {
      amount = Math.floor(amount * 0.5);
    }
    if (this.hasItem('gold_armor')) {
      amount = Math.floor(amount * 0.4);
    }
    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0) this.faint();
  }

  faint(duration) {
    this.fainted = true;
    this.faintTimer = duration || 3;
  }

  eat(type) {
    const energyValues = { apple: 20, sandwich: 35, fruit: 15, human_meat: 40, cooked_food: 100, cooked_human_meat: 100, cooked_apple: 60, cooked_fruit: 50 };
    const val = energyValues[type] || 0;
    if (val > 0 && this.hasItem(type)) {
      this.removeItem(type, 1);
      this.hunger = Math.min(this.maxHunger, this.hunger + val);
      this.health = Math.min(this.maxHealth, this.health + Math.floor(val / 2));
      return true;
    }
    return false;
  }

  update(dt) {
    if (this.fainted) {
      this.faintTimer -= dt;
      if (this.faintTimer <= 0) {
        this.fainted = false;
        this.health = Math.floor(this.maxHealth * 0.5);
        this.hunger = Math.floor(this.maxHunger * 0.3);
      }
      return;
    }

    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.attackAnim = Math.max(0, this.attackAnim - dt);

    // No hunger drain for now

    // Facing from mouse angle
    const a = this.angle;
    if (a > -Math.PI * 0.75 && a <= -Math.PI * 0.25) this.facing = 'up';
    else if (a > Math.PI * 0.25 && a <= Math.PI * 0.75) this.facing = 'down';
    else if (a > Math.PI * 0.75 || a <= -Math.PI * 0.75) this.facing = 'left';
    else this.facing = 'right';

    // Movement — W moves toward mouse cursor, touch joystick also moves
    const moving = this.keys['w'] || this.keys['arrowup'] ||
      (typeof Game !== 'undefined' && Game.touchMoving);
    const movingBack = this.keys['s'] || this.keys['arrowdown'];

    if (typeof Game !== 'undefined' && Game.touchMoving) {
      this.angle = Game.touchAngle;
    }

    if (moving) {
      this.x += Math.cos(this.angle) * this.speed * dt * 60;
      this.y += Math.sin(this.angle) * this.speed * dt * 60;
    }
    if (movingBack) {
      this.x -= Math.cos(this.angle) * this.speed * dt * 60;
      this.y -= Math.sin(this.angle) * this.speed * dt * 60;
    }
  }

  draw(ctx, cam) {
    const sx = this.x - cam.x, sy = this.y - cam.y;
    const headOffsets = { up: [14, 2], down: [14, 32], left: [0, 16], right: [28, 16] };
    const ho = headOffsets[this.facing];

    // Character body colors
    const charData = {
      turtle:   { body:'#2e7d32', belly:'#66bb6a', head:'#66bb6a', accent:'#1b5e20', eyePatch:null },
      sloth:    { body:'#8d6e63', belly:'#a1887f', head:'#8d6e63', accent:'#5d4037', eyePatch:'#5d4037' },
      llama:    { body:'#fff9c4', belly:'#fffde7', head:'#fff176', accent:'#f9a825', eyePatch:null },
      penguin:  { body:'#37474f', belly:'#eceff1', head:'#37474f', accent:'#263238', eyePatch:null },
      otter:    { body:'#5d4037', belly:'#8d6e63', head:'#795548', accent:'#3e2723', eyePatch:null },
      panda:    { body:'#fafafa', belly:'#e0e0e0', head:'#fafafa', accent:'#212121', eyePatch:'#212121' },
      tiger:    { body:'#ef6c00', belly:'#ffcc80', head:'#ef6c00', accent:'#e65100', eyePatch:null },
      bunny:    { body:'#f8bbd0', belly:'#fce4ec', head:'#f8bbd0', accent:'#ec407a', eyePatch:null },
      dragon:   { body:'#7b1fa2', belly:'#ce93d8', head:'#7b1fa2', accent:'#4a148c', eyePatch:null },
      unicorn:  { body:'#e8eaf6', belly:'#f3e5f5', head:'#e8eaf6', accent:'#7e57c2', eyePatch:null },
      giraffe:  { body:'#ffb300', belly:'#ffe082', head:'#ffb300', accent:'#e65100', eyePatch:null },
    };
    const cd = charData[this.type] || charData.turtle;

    // Body
    ctx.fillStyle = cd.body;
    if (this.type === 'turtle') {
      ctx.beginPath(); ctx.ellipse(sx+14, sy+18, 14, 16, 0, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = cd.accent; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(sx+14,sy+4); ctx.lineTo(sx+14,sy+32);
      ctx.moveTo(sx+2,sy+18); ctx.lineTo(sx+26,sy+18); ctx.stroke();
    } else if (this.type === 'penguin') {
      ctx.beginPath(); ctx.ellipse(sx+14, sy+18, 12, 15, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = cd.belly;
      ctx.beginPath(); ctx.ellipse(sx+14, sy+20, 7, 11, 0, 0, Math.PI*2); ctx.fill();
      // Flippers
      ctx.fillStyle = cd.body;
      ctx.fillRect(sx-1, sy+14, 5, 12); ctx.fillRect(sx+24, sy+14, 5, 12);
    } else if (this.type === 'bunny') {
      ctx.beginPath(); ctx.ellipse(sx+14, sy+20, 11, 13, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = cd.belly;
      ctx.beginPath(); ctx.ellipse(sx+14, sy+22, 7, 9, 0, 0, Math.PI*2); ctx.fill();
    } else if (this.type === 'giraffe') {
      ctx.beginPath(); ctx.ellipse(sx+14, sy+20, 10, 14, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = cd.belly;
      ctx.beginPath(); ctx.ellipse(sx+14, sy+22, 6, 10, 0, 0, Math.PI*2); ctx.fill();
      // Spots
      ctx.fillStyle = cd.accent;
      ctx.beginPath(); ctx.arc(sx+10,sy+16,2.5,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(sx+18,sy+20,2,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(sx+12,sy+24,2,0,Math.PI*2); ctx.fill();
    } else if (this.type === 'tiger') {
      ctx.beginPath(); ctx.ellipse(sx+14, sy+18, 12, 15, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = cd.belly;
      ctx.beginPath(); ctx.ellipse(sx+14, sy+20, 8, 10, 0, 0, Math.PI*2); ctx.fill();
      // Stripes
      ctx.strokeStyle = '#e65100'; ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.moveTo(sx+6, sy+12+i*6); ctx.lineTo(sx+10, sy+14+i*6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx+22, sy+12+i*6); ctx.lineTo(sx+18, sy+14+i*6); ctx.stroke();
      }
    } else if (this.type === 'dragon') {
      ctx.beginPath(); ctx.ellipse(sx+14, sy+18, 13, 15, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = cd.belly;
      ctx.beginPath(); ctx.ellipse(sx+14, sy+20, 8, 10, 0, 0, Math.PI*2); ctx.fill();
      // Wings
      ctx.fillStyle = cd.accent; ctx.globalAlpha = 0.6;
      ctx.beginPath(); ctx.moveTo(sx-2,sy+10); ctx.lineTo(sx-8,sy+4); ctx.lineTo(sx+2,sy+18); ctx.fill();
      ctx.beginPath(); ctx.moveTo(sx+30,sy+10); ctx.lineTo(sx+36,sy+4); ctx.lineTo(sx+26,sy+18); ctx.fill();
      ctx.globalAlpha = 1;
    } else if (this.type === 'unicorn') {
      ctx.beginPath(); ctx.ellipse(sx+14, sy+18, 12, 15, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = cd.belly;
      ctx.beginPath(); ctx.ellipse(sx+14, sy+20, 8, 10, 0, 0, Math.PI*2); ctx.fill();
    } else {
      // Default body (sloth, llama, otter, panda)
      ctx.beginPath(); ctx.ellipse(sx+14, sy+18, 12, 15, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = cd.belly;
      ctx.beginPath(); ctx.ellipse(sx+14, sy+20, 8, 10, 0, 0, Math.PI*2); ctx.fill();
    }

    // Head
    ctx.fillStyle = cd.head;
    ctx.beginPath(); ctx.arc(sx+ho[0], sy+ho[1], this.type === 'turtle' ? 7 : 8, 0, Math.PI*2); ctx.fill();

    // Ears for bunny
    if (this.type === 'bunny') {
      ctx.fillStyle = cd.head;
      ctx.fillRect(sx+ho[0]-6, sy+ho[1]-16, 5, 14);
      ctx.fillRect(sx+ho[0]+1, sy+ho[1]-16, 5, 14);
      ctx.fillStyle = cd.accent;
      ctx.fillRect(sx+ho[0]-5, sy+ho[1]-14, 3, 10);
      ctx.fillRect(sx+ho[0]+2, sy+ho[1]-14, 3, 10);
    }

    // Horn for unicorn
    if (this.type === 'unicorn') {
      ctx.fillStyle = '#FFD700';
      ctx.beginPath(); ctx.moveTo(sx+ho[0]-3, sy+ho[1]-7); ctx.lineTo(sx+ho[0], sy+ho[1]-18); ctx.lineTo(sx+ho[0]+3, sy+ho[1]-7); ctx.fill();
    }

    // Horns for dragon
    if (this.type === 'dragon') {
      ctx.fillStyle = '#FFD700';
      ctx.beginPath(); ctx.moveTo(sx+ho[0]-5, sy+ho[1]-5); ctx.lineTo(sx+ho[0]-7, sy+ho[1]-14); ctx.lineTo(sx+ho[0]-2, sy+ho[1]-5); ctx.fill();
      ctx.beginPath(); ctx.moveTo(sx+ho[0]+5, sy+ho[1]-5); ctx.lineTo(sx+ho[0]+7, sy+ho[1]-14); ctx.lineTo(sx+ho[0]+2, sy+ho[1]-5); ctx.fill();
    }

    // Neck for giraffe
    if (this.type === 'giraffe' && (this.facing === 'up' || this.facing === 'down')) {
      ctx.fillStyle = cd.head;
      ctx.fillRect(sx+11, sy+ho[1]-2, 6, 8);
    }

    // Llama ears
    if (this.type === 'llama') {
      ctx.fillStyle = cd.head;
      ctx.fillRect(sx+ho[0]-7, sy+ho[1]-10, 4, 8);
      ctx.fillRect(sx+ho[0]+3, sy+ho[1]-10, 4, 8);
    }

    // Panda ears
    if (this.type === 'panda') {
      ctx.fillStyle = '#212121';
      ctx.beginPath(); ctx.arc(sx+ho[0]-6, sy+ho[1]-5, 4, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(sx+ho[0]+6, sy+ho[1]-5, 4, 0, Math.PI*2); ctx.fill();
    }

    // Tiger ears
    if (this.type === 'tiger') {
      ctx.fillStyle = cd.body;
      ctx.beginPath(); ctx.arc(sx+ho[0]-6, sy+ho[1]-5, 4, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(sx+ho[0]+6, sy+ho[1]-5, 4, 0, Math.PI*2); ctx.fill();
    }

    // Eye patches (sloth, panda)
    if (cd.eyePatch) {
      ctx.fillStyle = cd.eyePatch;
      ctx.beginPath();
      ctx.ellipse(sx+ho[0]-3, sy+ho[1]-1, 3, 4, 0, 0, Math.PI*2);
      ctx.ellipse(sx+ho[0]+3, sy+ho[1]-1, 3, 4, 0, 0, Math.PI*2);
      ctx.fill();
    }

    // Eyes
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(sx+ho[0]-2, sy+ho[1]-1, 1.5, 0, Math.PI*2);
    ctx.arc(sx+ho[0]+2, sy+ho[1]-1, 1.5, 0, Math.PI*2);
    ctx.fill();

    // Penguin beak
    if (this.type === 'penguin') {
      ctx.fillStyle = '#ff8f00';
      ctx.beginPath(); ctx.moveTo(sx+ho[0]-2, sy+ho[1]+2); ctx.lineTo(sx+ho[0], sy+ho[1]+6); ctx.lineTo(sx+ho[0]+2, sy+ho[1]+2); ctx.fill();
    }

    // Otter nose
    if (this.type === 'otter') {
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(sx+ho[0], sy+ho[1]+3, 2, 0, Math.PI*2); ctx.fill();
    }

    // Hat if equipped
    if (this.outfit.hat || this.hasItem('hat')) {
      const hatColors = {
        top_hat:'#333', cowboy_hat:'#8B4513', crown:'#FFD700', beret:'#c62828', beanie:'#1565C0', hat:'#333'
      };
      const h = this.outfit.hat || 'hat';
      ctx.fillStyle = hatColors[h] || '#333';
      if (h === 'crown') {
        ctx.fillRect(sx+6,sy-6,16,4); ctx.fillRect(sx+6,sy-12,3,6); ctx.fillRect(sx+12,sy-14,4,8); ctx.fillRect(sx+19,sy-12,3,6);
      } else if (h === 'cowboy_hat') {
        ctx.fillRect(sx+2,sy-4,24,5); ctx.fillRect(sx+7,sy-10,14,6);
      } else if (h === 'beret') {
        ctx.beginPath(); ctx.ellipse(sx+14,sy-4,12,6,0,0,Math.PI*2); ctx.fill();
      } else if (h === 'beanie') {
        ctx.fillRect(sx+6,sy-10,16,10); ctx.fillRect(sx+12,sy-13,4,4);
      } else {
        ctx.fillRect(sx+4,sy-4,20,5); ctx.fillRect(sx+8,sy-12,12,8);
      }
    }

    // Draw worn top
    if (this.outfit.top) {
      const topColors = {
        tshirt:'#e53935', hoodie:'#5C6BC0', sweater:'#FF8F00', tank_top:'#26A69A', polo:'#1B5E20',
        red_dress:'#e53935', blue_dress:'#1976D2', green_dress:'#2E7D32', pink_dress:'#EC407A', yellow_dress:'#FDD835'
      };
      ctx.fillStyle = topColors[this.outfit.top] || '#e53935';
      ctx.globalAlpha = 0.6;
      ctx.beginPath(); ctx.ellipse(sx+14, sy+18, 11, 13, 0, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Draw worn bottom
    if (this.outfit.bottom) {
      const isDress = this.outfit.bottom.includes('dress');
      const isSkirt = this.outfit.bottom.includes('skirt') || isDress;
      const bottomColors = {
        jeans:'#1565C0', khakis:'#A1887F', shorts:'#6D4C41', black_pants:'#333', cargo_pants:'#556B2F',
        red_skirt:'#e53935', blue_skirt:'#1976D2', pink_skirt:'#EC407A', plaid_skirt:'#8D6E63', green_skirt:'#2E7D32',
        red_dress:'#e53935', blue_dress:'#1976D2', green_dress:'#2E7D32', pink_dress:'#EC407A', yellow_dress:'#FDD835'
      };
      ctx.fillStyle = bottomColors[this.outfit.bottom] || '#1565C0';
      ctx.globalAlpha = 0.6;
      if (isSkirt) {
        ctx.beginPath(); ctx.moveTo(sx+6,sy+26); ctx.lineTo(sx+22,sy+26); ctx.lineTo(sx+24,sy+34); ctx.lineTo(sx+4,sy+34); ctx.closePath(); ctx.fill();
      } else {
        ctx.fillRect(sx+7,sy+26,6,8); ctx.fillRect(sx+15,sy+26,6,8);
      }
      ctx.globalAlpha = 1;
    }

    // Show held item
    const eq = this.getEquipped();
    if (eq) {
      const icons = { axe:'🪓', sword:'⚔️', knife:'🔪', pickaxe:'⛏️', trowel:'🔧', gold_sword:'🗡️', gold_axe:'🪓', gold_pickaxe:'⛏️' };
      ctx.font = '16px serif';
      const swingOffset = this.attackAnim > 0 ? 6 : 0;
      const offsets = { up:[26+swingOffset,4], down:[26+swingOffset,30], left:[-6-swingOffset,18], right:[30+swingOffset,18] };
      const o = offsets[this.facing];
      ctx.fillText(icons[eq.type] || '', sx+o[0], sy+o[1]);
    }
  }

  getBounds() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }
}
