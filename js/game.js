const Game = {
  canvas: null,
  ctx: null,
  player: null,
  camera: { x: 0, y: 0 },
  entities: { trees: [], stones: [], dirtPatches: [], groundItems: [], humans: [], fruitTrees: [], pavements: [], guests: [], decorations: [] },
  worldSize: 2000,
  grassTiles: [],
  flashes: [],
  house: null,
  insideHouse: false,
  houseInterior: {
    w: 300, h: 250,
    bed: { x: 10, y: 10, w: 70, h: 50 },
    table: { x: 210, y: 10, w: 70, h: 50, slots: [null,null,null,null,null,null,null,null,null,null] },
    fireplace: { x: 115, y: 5, w: 60, h: 40 },
    door: { x: 130, y: 210, w: 40, h: 40 },
    // Upgrade furniture (added when upgraded)
    wardrobe: null, // { x, y, w, h, slots: [] }
    fridge: null,    // { x, y, w, h, slots: [] }
    mirror: null,    // { x, y, w, h }
  },
  // Upgrades tracking
  upgrades: {
    house: false,     // 50 wood — adds wardrobe room
    wardrobe: false,  // 3 wood — wardrobe with clothing
    mirror: false,    // 3 gold — change character
    fireplace: false, // 30 stone — cook 3 at once
    fridge: false,    // 40 stone — 20 food slots
    bed: false,       // 50 wood — 15s sleep
    axe: false,       // 45 stone — 5 slabs per tree
  },
  bedTimer: 0,
  isSleeping: false,
  cookingItems: [],  // array of { type, timer } — up to 1 or 3
  hotel: null,       // { x, y } world position
  hotelGoldBox: 0,   // gold accumulated from guests
  guestSpawnTimer: 0,
  humanSpawnTimer: 0,
  placementMode: null, // { type } — when set, shows ghost preview for placing
  running: false,
  lastTime: 0,

  start(charType) {
    document.getElementById('character-select').style.display = 'none';
    this.canvas = document.getElementById('gameCanvas');
    this.resizeCanvas();
    this.canvas.style.display = 'block';
    this.ctx = this.canvas.getContext('2d');
    const cx = this.worldSize / 2, cy = this.worldSize / 2;
    this.player = new Player(charType, cx, cy);
    UI.init();
    UI.showHUD();
    this.generateWorld(cx, cy);
    this.setupInput();
    window.addEventListener('resize', () => this.resizeCanvas());
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame(t => this.loop(t));
  },

  resizeCanvas() {
    const container = document.getElementById('game-container');
    const isMobile = window.matchMedia('(pointer: coarse)').matches || window.innerWidth <= 1024;
    if (isMobile) {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    } else {
      this.canvas.width = 800;
      this.canvas.height = 600;
    }
  },

  generateWorld(spawnX, spawnY) {
    const ws = this.worldSize;
    for (let x = 0; x < ws; x += 40) {
      for (let y = 0; y < ws; y += 40) {
        const shade = 90 + Math.floor(Math.random() * 30);
        this.grassTiles.push({ x, y, color: `rgb(${shade-30},${shade+50},${shade-40})` });
      }
    }
    this.player.addItem('axe', 1);
    this.player.equippedSlot = 0;
    for (let i = 0; i < 120; i++) {
      let tx, ty;
      do { tx = 50+Math.random()*(ws-100); ty = 50+Math.random()*(ws-100); }
      while (Math.abs(tx-spawnX)<60 && Math.abs(ty-spawnY)<60);
      this.entities.trees.push(new Tree(tx, ty));
    }
    for (let i = 0; i < 25; i++) this.entities.fruitTrees.push(new FruitTree(50+Math.random()*(ws-100), 50+Math.random()*(ws-100)));
    for (let i = 0; i < 40; i++) this.entities.stones.push(new Stone(50+Math.random()*(ws-100), 50+Math.random()*(ws-100)));
    for (let i = 0; i < 30; i++) this.entities.dirtPatches.push(new DirtPatch(50+Math.random()*(ws-100), 50+Math.random()*(ws-100)));
    for (let i = 0; i < 4; i++) this.spawnHuman();
  },

  spawnHuman() {
    const ws = this.worldSize;
    this.entities.humans.push(new Human(100+Math.random()*(ws-200), 100+Math.random()*(ws-200)));
  },

  buildHouse() {
    this.house = { x: this.player.x + 40, y: this.player.y - 20 };
  },

  buildHotel() {
    this.hotel = { x: this.player.x + 120, y: this.player.y - 20 };
  },

  placePavement() {
    const p = this.player;
    const offsets = { up: [0,-40], down: [0,40], left: [-40,0], right: [40,0] };
    const o = offsets[p.facing] || [0, 40];
    this.entities.pavements.push(new Pavement(p.x + o[0], p.y + o[1]));
  },

  placeDecoration(type) {
    const p = this.player;
    const offsets = { up: [0,-40], down: [0,40], left: [-40,0], right: [40,0] };
    const o = offsets[p.facing] || [0, 40];
    this.entities.decorations.push(new Decoration(p.x + o[0], p.y + o[1], type));
  },

  addFlash(x, y) { this.flashes.push({ x, y, timer: 0.3 }); },

  getMaxCookSlots() { return this.upgrades.fireplace ? 3 : 1; },
  getSleepTime() { return this.upgrades.bed ? 15 : 20; },
  getSlabsPerTree() { return this.upgrades.axe ? 5 : 3; },

  applyUpgrade(type) {
    const p = this.player;
    const hi = this.houseInterior;
    if (type === 'house' && !this.upgrades.house) {
      if (p.countItem('wood') >= 50) {
        p.removeItem('wood', 50);
        this.upgrades.house = true;
        hi.w = 450;
        return true;
      }
    }
    if (type === 'wardrobe' && !this.upgrades.wardrobe) {
      if (p.countItem('wood') >= 3) {
        p.removeItem('wood', 3);
        this.upgrades.wardrobe = true;
        if (!hi.wardrobe) {
          hi.wardrobe = { x: 320, y: 10, w: 70, h: 60, slots: new Array(40).fill(null) };
          if (hi.w < 450) hi.w = 450;
        }
        // Pre-stock with clothing
        const clothing = [
          'top_hat','cowboy_hat','crown','beret','beanie',
          'red_dress','blue_dress','green_dress','pink_dress','yellow_dress',
          'jeans','khakis','shorts','black_pants','cargo_pants',
          'red_skirt','blue_skirt','pink_skirt','plaid_skirt','green_skirt',
          'tshirt','hoodie','sweater','tank_top','polo'
        ];
        for (let i = 0; i < clothing.length && i < 40; i++) {
          hi.wardrobe.slots[i] = clothing[i];
        }
        return true;
      }
    }
    if (type === 'mirror' && !this.upgrades.mirror) {
      if (p.countItem('stone') >= 3) {
        p.removeItem('stone', 3);
        this.upgrades.mirror = true;
        hi.mirror = { x: 10, y: 70, w: 40, h: 50 };
        return true;
      }
    }
    if (type === 'fireplace' && !this.upgrades.fireplace) {
      if (p.countItem('stone') >= 30) {
        p.removeItem('stone', 30);
        this.upgrades.fireplace = true;
        return true;
      }
    }
    if (type === 'fridge' && !this.upgrades.fridge) {
      if (p.countItem('stone') >= 40) {
        p.removeItem('stone', 40);
        this.upgrades.fridge = true;
        hi.fridge = { x: 10, y: 130, w: 60, h: 55, slots: new Array(20).fill(null) };
        return true;
      }
    }
    if (type === 'bed' && !this.upgrades.bed) {
      if (p.countItem('wood') >= 50) {
        p.removeItem('wood', 50);
        this.upgrades.bed = true;
        return true;
      }
    }
    if (type === 'axe' && !this.upgrades.axe) {
      if (p.countItem('stone') >= 45) {
        p.removeItem('stone', 45);
        this.upgrades.axe = true;
        return true;
      }
    }
    return false;
  },

  enterHouse() {
    this.insideHouse = true;
    this.isSleeping = false;
    this.bedTimer = 0;
    this.player.x = 380; this.player.y = 420;
  },

  exitHouse() {
    this.insideHouse = false;
    this.isSleeping = false;
    this.bedTimer = 0;
    this.player.x = this.house.x + 30;
    this.player.y = this.house.y + 65;
  },

  getInteriorOrigin() {
    return {
      x: (this.canvas.width - this.houseInterior.w) / 2,
      y: (this.canvas.height - this.houseInterior.h) / 2
    };
  },

  playerInZone(zone) {
    if (!zone) return false;
    const o = this.getInteriorOrigin();
    const px = this.player.x, py = this.player.y;
    return px > o.x+zone.x && px < o.x+zone.x+zone.w &&
           py > o.y+zone.y && py < o.y+zone.y+zone.h;
  },

  setupInput() {
    window.addEventListener('keydown', e => {
      const key = e.key.toLowerCase();
      this.player.keys[key] = true;
      if (key === 'i') {
        if (this.insideHouse) UI.toggleTableUI(this);
        else UI.toggleInventory(this.player);
      }
      if (key === 'c') UI.toggleCraft(this.player, this);
      if (key === 'escape') UI.closeAll();
      if (key === 'q') this.tryEat();
      if (key === 'f') this.attack();
    });
    window.addEventListener('keyup', e => { this.player.keys[e.key.toLowerCase()] = false; });

    this.canvas.addEventListener('mousemove', e => {
      const rect = this.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      if (this.insideHouse) {
        this.player.mouseX = mx; this.player.mouseY = my;
        this.player.angle = Math.atan2(my - (this.player.y+this.player.h/2), mx - (this.player.x+this.player.w/2));
      } else {
        this.player.mouseX = mx + this.camera.x;
        this.player.mouseY = my + this.camera.y;
        this.player.angle = Math.atan2(this.player.mouseY-(this.player.y+this.player.h/2), this.player.mouseX-(this.player.x+this.player.w/2));
      }
    });

    this.canvas.addEventListener('mousedown', e => {
      if (e.button === 0) {
        if (UI.invOpen || UI.craftOpen || UI.tableOpen || UI.fridgeOpen || UI.wardrobeOpen || UI.mirrorOpen) return;
        // Placement mode — place item at mouse position
        if (!this.insideHouse && this.placementMode) {
          const px = this.player.mouseX - 20;
          const py = this.player.mouseY - 20;
          const type = this.placementMode.type;
          if (type === 'house') {
            this.house = { x: px, y: py };
          } else if (type === 'hotel') {
            this.hotel = { x: px, y: py };
          } else if (type === 'pavement') {
            // Snap to grid
            const gx = Math.round(px / 40) * 40;
            const gy = Math.round(py / 40) * 40;
            this.entities.pavements.push(new Pavement(gx, gy));
          } else if (type === 'fountain' || type === 'statue' || type === 'garden' || type === 'market') {
            this.entities.decorations.push(new Decoration(px, py, type));
          }
          this.placementMode = null;
          return;
        }
        if (this.insideHouse) this.interactHouse();
        else { this.interact(); this.attack(); }
      }
      if (e.button === 2 && this.placementMode) {
        // Right click cancels placement (item already consumed, so just cancel)
        this.placementMode = null;
      }
    });
    this.canvas.addEventListener('contextmenu', e => e.preventDefault());

    // ---- TOUCH CONTROLS ----
    this.touchMoving = false;
    this.touchAngle = 0;

    const joystickZone = document.getElementById('joystick-zone');
    const joystickThumb = document.getElementById('joystick-thumb');
    const joystickBase = document.getElementById('joystick-base');

    if (joystickZone) {
      const getJoystickInput = (touch) => {
        const rect = joystickBase.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = touch.clientX - cx;
        const dy = touch.clientY - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = 45;
        const clampDist = Math.min(dist, maxDist);
        const angle = Math.atan2(dy, dx);
        joystickThumb.style.left = (35 + Math.cos(angle) * clampDist) + 'px';
        joystickThumb.style.top = (35 + Math.sin(angle) * clampDist) + 'px';
        if (dist > 10) {
          this.touchMoving = true;
          this.touchAngle = angle;
          this.player.angle = angle;
        } else {
          this.touchMoving = false;
        }
      };

      let joystickTouchId = null;

      joystickZone.addEventListener('touchstart', e => {
        e.preventDefault();
        const touch = e.changedTouches[0];
        joystickTouchId = touch.identifier;
        getJoystickInput(touch);
      });

      joystickZone.addEventListener('touchmove', e => {
        e.preventDefault();
        for (const touch of e.changedTouches) {
          if (touch.identifier === joystickTouchId) {
            getJoystickInput(touch);
          }
        }
      });

      const resetJoystick = (e) => {
        for (const touch of e.changedTouches) {
          if (touch.identifier === joystickTouchId) {
            joystickTouchId = null;
            this.touchMoving = false;
            joystickThumb.style.left = '35px';
            joystickThumb.style.top = '35px';
          }
        }
      };
      joystickZone.addEventListener('touchend', resetJoystick);
      joystickZone.addEventListener('touchcancel', resetJoystick);
    }

    // Touch buttons
    const btnInteract = document.getElementById('btn-interact');
    const btnEat = document.getElementById('btn-eat');
    const btnInventory = document.getElementById('btn-inventory');
    const btnCraft = document.getElementById('btn-craft');

    if (btnInteract) btnInteract.addEventListener('touchstart', e => {
      e.preventDefault();
      if (this.insideHouse) this.interactHouse();
      else { this.interact(); this.attack(); }
    });
    if (btnEat) btnEat.addEventListener('touchstart', e => { e.preventDefault(); this.tryEat(); });
    if (btnInventory) btnInventory.addEventListener('touchstart', e => {
      e.preventDefault();
      if (this.insideHouse) UI.toggleTableUI(this);
      else UI.toggleInventory(this.player);
    });
    if (btnCraft) btnCraft.addEventListener('touchstart', e => {
      e.preventDefault();
      UI.toggleCraft(this.player, this);
    });

    // Touch on canvas for placement mode and interaction
    this.canvas.addEventListener('touchstart', e => {
      if (UI.invOpen || UI.craftOpen || UI.tableOpen || UI.fridgeOpen || UI.wardrobeOpen || UI.mirrorOpen) return;
      const touch = e.changedTouches[0];
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const mx = (touch.clientX - rect.left) * scaleX;
      const my = (touch.clientY - rect.top) * scaleY;

      if (this.insideHouse) {
        this.player.mouseX = mx;
        this.player.mouseY = my;
        this.player.angle = Math.atan2(my - (this.player.y + this.player.h/2), mx - (this.player.x + this.player.w/2));
      } else {
        this.player.mouseX = mx + this.camera.x;
        this.player.mouseY = my + this.camera.y;
        this.player.angle = Math.atan2(this.player.mouseY - (this.player.y + this.player.h/2), this.player.mouseX - (this.player.x + this.player.w/2));

        if (this.placementMode) {
          const px = this.player.mouseX - 20;
          const py = this.player.mouseY - 20;
          const type = this.placementMode.type;
          if (type === 'house') { this.house = { x: px, y: py }; }
          else if (type === 'hotel') { this.hotel = { x: px, y: py }; }
          else if (type === 'pavement') {
            const gx = Math.round(px / 40) * 40;
            const gy = Math.round(py / 40) * 40;
            this.entities.pavements.push(new Pavement(gx, gy));
          } else if (type === 'fountain' || type === 'statue' || type === 'garden' || type === 'market') {
            this.entities.decorations.push(new Decoration(px, py, type));
          }
          this.placementMode = null;
        }
      }
    });
  },

  getNearby(entityList, range) {
    const p = this.player;
    return entityList.filter(e => {
      if (e.alive === false && e.alive !== undefined) return false;
      const dx = (e.x+(e.w||0)/2)-(p.x+p.w/2), dy = (e.y+(e.h||0)/2)-(p.y+p.h/2);
      return Math.sqrt(dx*dx+dy*dy) < range;
    });
  },

  interactHouse() {
    const hi = this.houseInterior;
    if (this.playerInZone(hi.door)) { this.exitHouse(); return; }
    if (this.playerInZone(hi.bed)) { this.isSleeping = true; this.bedTimer = 0; return; }
    if (this.playerInZone(hi.table)) { UI.toggleTableUI(this); return; }
    if (this.playerInZone(hi.fireplace)) { this.tryCook(); return; }
    if (hi.wardrobe && this.playerInZone(hi.wardrobe)) { UI.toggleWardrobeUI(this); return; }
    if (hi.mirror && this.playerInZone(hi.mirror)) { UI.toggleMirrorUI(this); return; }
    if (hi.fridge && this.playerInZone(hi.fridge)) { UI.toggleFridgeUI(this); return; }
  },

  tryCook() {
    const maxSlots = this.getMaxCookSlots();
    if (this.cookingItems.length >= maxSlots) return;
    const p = this.player;
    const cookable = ['fruit', 'apple', 'sandwich', 'human_meat'];
    for (const type of cookable) {
      if (p.hasItem(type)) {
        p.removeItem(type, 1);
        const cookedMap = { fruit:'cooked_fruit', apple:'cooked_apple', human_meat:'cooked_human_meat', sandwich:'cooked_food' };
        this.cookingItems.push({ type, cookedType: cookedMap[type] || 'cooked_food', timer: 3 });
        return;
      }
    }
  },

  interact() {
    if (this.player.fainted) return;
    const p = this.player, eq = p.getEquipped();

    if (this.house) {
      const dx = (p.x+p.w/2)-(this.house.x+30), dy = (p.y+p.h/2)-(this.house.y+50);
      if (Math.sqrt(dx*dx+dy*dy) < 40) { this.enterHouse(); return; }
    }

    // Collect gold from hotel box
    if (this.hotel && this.hotelGoldBox > 0) {
      const dx = (p.x+p.w/2)-(this.hotel.x+40), dy = (p.y+p.h/2)-(this.hotel.y+40);
      if (Math.sqrt(dx*dx+dy*dy) < 50) {
        const amount = this.hotelGoldBox;
        p.addItem('gold', amount);
        this.hotelGoldBox = 0;
        return;
      }
    }

    const items = this.getNearby(this.entities.groundItems, 40);
    for (const item of items) {
      if (!item.alive) continue;
      if (p.addItem(item.type, 1) > 0) { item.alive = false; return; }
    }

    if (eq && (eq.type === 'axe' || eq.type === 'gold_axe')) {
      const trees = this.getNearby(this.entities.trees, 50);
      for (const tree of trees) {
        if (!tree.alive) continue;
        tree.slabs -= eq.type === 'gold_axe' ? 2 : 1;
        p.attackAnim = 0.3;
        this.addFlash(tree.x+20, tree.y+20);
        if (tree.slabs <= 0) tree.alive = false;
        if (p.addItem('wood', 1) > 0) p.totalWoodCollected++;
        return;
      }
    }

    if (eq && (eq.type === 'pickaxe' || eq.type === 'gold_pickaxe')) {
      const stones = this.getNearby(this.entities.stones, 45);
      for (const stone of stones) {
        if (!stone.alive) continue;
        stone.hits -= eq.type === 'gold_pickaxe' ? 2 : 1;
        p.attackAnim = 0.3;
        this.addFlash(stone.x+15, stone.y+12);
        if (stone.hits <= 0) {
          stone.alive = false;
          if (stone.hasGold) this.entities.groundItems.push(new GroundItem(stone.x, stone.y, 'gold'));
        }
        p.addItem('stone', 1);
        return;
      }
    }

    if (eq && eq.type === 'trowel') {
      const dirts = this.getNearby(this.entities.dirtPatches, 40);
      for (const dirt of dirts) {
        if (dirt.dug) continue;
        dirt.dug = true; p.attackAnim = 0.3;
        if (dirt.hasGold) this.entities.groundItems.push(new GroundItem(dirt.x, dirt.y, 'gold'));
        return;
      }
    }

    const fTrees = this.getNearby(this.entities.fruitTrees, 50);
    for (const ft of fTrees) { if (ft.pickFruit()) { p.addItem('fruit', 1); return; } }
  },

  attack() {
    if (this.player.fainted || this.insideHouse) return;
    const p = this.player, eq = p.getEquipped();
    if (p.attackCooldown > 0) return;
    let damage = 5;
    if (eq) {
      if (eq.type === 'gold_sword') damage = 35;
      else if (eq.type === 'sword') damage = 20;
      else if (eq.type === 'knife') damage = 12;
      else if (eq.type === 'gold_axe') damage = 15;
      else if (eq.type === 'axe') damage = 8;
    }
    p.attackAnim = 0.3; p.attackCooldown = 0.5;
    const humans = this.getNearby(this.entities.humans, 45);
    for (const h of humans) {
      if (!h.alive) continue;
      h.takeDamage(damage);
      if (!h.alive) {
        for (const loot of h.loot) this.entities.groundItems.push(new GroundItem(h.x+Math.random()*20, h.y+Math.random()*20, loot));
        this.entities.groundItems.push(new GroundItem(h.x, h.y+10, 'human_meat'));
      }
      return;
    }
  },

  tryEat() {
    const p = this.player;
    if (p.eat('cooked_human_meat')) return;
    if (p.eat('cooked_apple')) return;
    if (p.eat('cooked_fruit')) return;
    if (p.eat('cooked_food')) return;
    if (p.eat('sandwich')) return;
    if (p.eat('apple')) return;
    if (p.eat('fruit')) return;
    if (p.eat('human_meat')) return;
  },

  loop(time) {
    if (!this.running) return;
    const dt = Math.min((time - this.lastTime) / 1000, 0.05);
    this.lastTime = time;
    this.update(dt); this.render();
    requestAnimationFrame(t => this.loop(t));
  },

  update(dt) {
    const p = this.player;
    if (this.insideHouse) { this.updateHouseInterior(dt); return; }

    p.update(dt);
    p.x = Math.max(0, Math.min(this.worldSize-p.w, p.x));
    p.y = Math.max(0, Math.min(this.worldSize-p.h, p.y));

    this.camera.x = p.x+p.w/2-this.canvas.width/2;
    this.camera.y = p.y+p.h/2-this.canvas.height/2;
    this.camera.x = Math.max(0, Math.min(this.worldSize-this.canvas.width, this.camera.x));
    this.camera.y = Math.max(0, Math.min(this.worldSize-this.canvas.height, this.camera.y));

    for (const h of this.entities.humans) {
      h.update(dt, p);
      if (this.house && h.alive) {
        const hx = this.house.x, hy = this.house.y;
        if (h.x > hx-10 && h.x < hx+70 && h.y > hy-10 && h.y < hy+70) {
          const cx = hx+30, cy = hy+30, ang = Math.atan2(h.y-cy, h.x-cx);
          h.x = cx+Math.cos(ang)*50; h.y = cy+Math.sin(ang)*50; h.aggro = false;
        }
      }
    }
    for (const ft of this.entities.fruitTrees) ft.update(dt);

    // Respawn dead trees after 30s
    for (const t of this.entities.trees) {
      if (!t.alive) {
        t.respawnTimer += dt;
        if (t.respawnTimer >= 30) {
          t.alive = true;
          t.slabs = this.getSlabsPerTree();
          t.respawnTimer = 0;
        }
      }
    }
    // Respawn dead stones after 30s
    for (const s of this.entities.stones) {
      if (!s.alive) {
        s.respawnTimer += dt;
        if (s.respawnTimer >= 30) {
          s.alive = true;
          s.hits = 3;
          s.hasGold = Math.random() < 0.15;
          s.respawnTimer = 0;
        }
      }
    }

    // Update guests
    for (const g of this.entities.guests) {
      g.update(dt);
      if (g.paid && g.alive) {
        this.hotelGoldBox += 6;
        g.paid = false; // only pay once
      }
    }
    // Remove dead guests
    this.entities.guests = this.entities.guests.filter(g => g.alive);

    // Spawn guests if hotel exists
    if (this.hotel) {
      this.guestSpawnTimer -= dt;
      if (this.guestSpawnTimer <= 0) {
        if (this.entities.guests.length < 3) {
          const side = Math.random() > 0.5 ? 1 : -1;
          const gx = this.hotel.x + side * (150 + Math.random() * 100);
          const gy = this.hotel.y + (Math.random() - 0.5) * 100;
          this.entities.guests.push(new Guest(gx, gy, this.hotel.x, this.hotel.y));
        }
        this.guestSpawnTimer = 20 + Math.random() * 25;
      }
    }

    this.humanSpawnTimer -= dt;
    if (this.humanSpawnTimer <= 0) {
      if (this.entities.humans.filter(h => h.alive).length < 4) this.spawnHuman();
      this.humanSpawnTimer = 10+Math.random()*15;
    }

    if (p.fainted) UI.showFaint(); else UI.hideFaint();
    for (let i = this.flashes.length-1; i >= 0; i--) {
      this.flashes[i].timer -= dt;
      if (this.flashes[i].timer <= 0) this.flashes.splice(i, 1);
    }
    this.updatePrompts();
    UI.updateHUD(p);
  },

  updateHouseInterior(dt) {
    const p = this.player, hi = this.houseInterior, o = this.getInteriorOrigin();
    const sleepTime = this.getSleepTime();

    if (!this.isSleeping) {
      p.update(dt);
      p.x = Math.max(o.x+5, Math.min(o.x+hi.w-p.w-5, p.x));
      p.y = Math.max(o.y+5, Math.min(o.y+hi.h-p.h-5, p.y));
    }

    if (this.isSleeping) {
      this.bedTimer += dt;
      if (this.bedTimer >= sleepTime) {
        p.health = p.maxHealth;
        this.isSleeping = false; this.bedTimer = 0;
      }
    } else if (!this.playerInZone(hi.bed)) { this.bedTimer = 0; }

    // Cooking — multiple items
    for (let i = this.cookingItems.length-1; i >= 0; i--) {
      this.cookingItems[i].timer -= dt;
      if (this.cookingItems[i].timer <= 0) {
        p.addItem(this.cookingItems[i].cookedType || 'cooked_food', 1);
        this.cookingItems.splice(i, 1);
      }
    }

    // Prompts
    if (this.playerInZone(hi.door)) UI.showPrompt('Click to exit house');
    else if (this.playerInZone(hi.bed)) {
      if (this.isSleeping) UI.showPrompt(`Sleeping... ${Math.ceil(sleepTime-this.bedTimer)}s left`);
      else UI.showPrompt(`Click to sleep (${sleepTime}s to full health)`);
    }
    else if (this.playerInZone(hi.table)) UI.showPrompt('Click to open table storage');
    else if (this.playerInZone(hi.fireplace)) {
      const max = this.getMaxCookSlots();
      if (this.cookingItems.length > 0) UI.showPrompt(`Cooking ${this.cookingItems.length}/${max}... Click to add more`);
      else UI.showPrompt(`Click to cook (${max} slot${max>1?'s':''})`);
    }
    else if (hi.wardrobe && this.playerInZone(hi.wardrobe)) UI.showPrompt('Click to open wardrobe');
    else if (hi.mirror && this.playerInZone(hi.mirror)) UI.showPrompt('Click to change character');
    else if (hi.fridge && this.playerInZone(hi.fridge)) UI.showPrompt('Click to open fridge');
    else UI.hidePrompt();

    UI.updateHUD(p);
  },

  updatePrompts() {
    const p = this.player, eq = p.getEquipped();
    if (this.placementMode) {
      UI.showPrompt(`Placing ${this.placementMode.type} — click to place, right-click to cancel`);
      return;
    }
    if (this.house) {
      const dx = (p.x+p.w/2)-(this.house.x+30), dy = (p.y+p.h/2)-(this.house.y+50);
      if (Math.sqrt(dx*dx+dy*dy) < 40) { UI.showPrompt('Click to enter house'); return; }
    }
    if (this.hotel) {
      const dx = (p.x+p.w/2)-(this.hotel.x+40), dy = (p.y+p.h/2)-(this.hotel.y+40);
      if (Math.sqrt(dx*dx+dy*dy) < 50) {
        if (this.hotelGoldBox > 0) UI.showPrompt(`Click to collect ${this.hotelGoldBox} gold from hotel`);
        else UI.showPrompt('Hotel — no gold to collect');
        return;
      }
    }
    const nearItems = this.getNearby(this.entities.groundItems, 40);
    if (nearItems.length > 0) { UI.showPrompt(`Click to pick up ${nearItems[0].type}`); return; }
    if (eq && eq.type === 'axe') {
      const t = this.getNearby(this.entities.trees, 50);
      if (t.length > 0) { UI.showPrompt(`Click to chop tree (${t[0].slabs} slabs left)`); return; }
    }
    if (eq && eq.type === 'pickaxe') {
      const s = this.getNearby(this.entities.stones, 45);
      if (s.length > 0) { UI.showPrompt('Click to mine stone'); return; }
    }
    if (eq && eq.type === 'trowel') {
      const d = this.getNearby(this.entities.dirtPatches, 40).filter(d => !d.dug);
      if (d.length > 0) { UI.showPrompt('Click to dig dirt'); return; }
    }
    const nf = this.getNearby(this.entities.fruitTrees, 50).filter(ft => ft.hasFruit);
    if (nf.length > 0) { UI.showPrompt('Click to pick fruit'); return; }
    const nh = this.getNearby(this.entities.humans, 50);
    if (nh.length > 0) { UI.showPrompt('Click to attack human'); return; }
    UI.hidePrompt();
  },

  render() {
    if (this.insideHouse) { this.renderHouseInterior(); return; }
    const ctx = this.ctx, cam = this.camera, cw = this.canvas.width, ch = this.canvas.height;
    ctx.fillStyle = '#5a8f3c'; ctx.fillRect(0, 0, cw, ch);
    for (const tile of this.grassTiles) {
      const sx = tile.x-cam.x, sy = tile.y-cam.y;
      if (sx > -40 && sx < cw && sy > -40 && sy < ch) { ctx.fillStyle = tile.color; ctx.fillRect(sx, sy, 40, 40); }
    }
    ctx.strokeStyle = '#3e6b27'; ctx.lineWidth = 4;
    ctx.strokeRect(-cam.x, -cam.y, this.worldSize, this.worldSize);
    for (const d of this.entities.dirtPatches) d.draw(ctx, cam);

    const drawList = [];
    for (const t of this.entities.trees) if (t.alive) drawList.push(t);
    for (const ft of this.entities.fruitTrees) drawList.push(ft);
    for (const s of this.entities.stones) if (s.alive) drawList.push(s);
    for (const gi of this.entities.groundItems) if (gi.alive) drawList.push(gi);
    for (const h of this.entities.humans) if (h.alive) drawList.push(h);
    for (const g of this.entities.guests) if (g.alive) drawList.push(g);
    drawList.push(this.player);

    // Draw pavements (below entities)
    for (const pv of this.entities.pavements) pv.draw(ctx, cam);
    // Draw decorations
    for (const dec of this.entities.decorations) drawList.push(dec);

    if (this.house) {
      drawList.push({ y: this.house.y, h: 60, draw: (ctx, cam) => {
        const sx = this.house.x-cam.x, sy = this.house.y-cam.y;
        const w = this.upgrades.house ? 90 : 60;
        ctx.fillStyle = '#8d6e63'; ctx.fillRect(sx, sy+15, w, 45);
        ctx.fillStyle = '#d32f2f';
        ctx.beginPath(); ctx.moveTo(sx-5, sy+15); ctx.lineTo(sx+w/2, sy-10); ctx.lineTo(sx+w+5, sy+15); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#5d4037'; ctx.fillRect(sx+w/2-8, sy+35, 16, 25);
        ctx.fillStyle = '#bbdefb'; ctx.fillRect(sx+8, sy+22, 12, 10); ctx.fillRect(sx+w-20, sy+22, 12, 10);
      }});
    }

    if (this.hotel) {
      drawList.push({ y: this.hotel.y, h: 70, draw: (ctx, cam) => {
        const sx = this.hotel.x-cam.x, sy = this.hotel.y-cam.y;
        // Hotel building — bigger than house
        ctx.fillStyle = '#78909c'; ctx.fillRect(sx, sy+10, 80, 55);
        // Second floor
        ctx.fillStyle = '#607d8b'; ctx.fillRect(sx+5, sy-15, 70, 28);
        // Roof
        ctx.fillStyle = '#455a64';
        ctx.beginPath(); ctx.moveTo(sx, sy-15); ctx.lineTo(sx+40, sy-35); ctx.lineTo(sx+80, sy-15); ctx.closePath(); ctx.fill();
        // Door
        ctx.fillStyle = '#5d4037'; ctx.fillRect(sx+32, sy+40, 16, 25);
        // Windows
        ctx.fillStyle = '#fff9c4';
        ctx.fillRect(sx+8, sy+18, 14, 12); ctx.fillRect(sx+58, sy+18, 14, 12);
        ctx.fillRect(sx+15, sy-8, 12, 10); ctx.fillRect(sx+53, sy-8, 12, 10);
        // Sign
        ctx.fillStyle = '#fff'; ctx.font = '10px sans-serif';
        ctx.fillText('HOTEL', sx+22, sy+8);
        // Gold indicator
        if (this.hotelGoldBox > 0) {
          ctx.fillStyle = '#ffeb3b'; ctx.font = '11px sans-serif';
          ctx.fillText('✨' + this.hotelGoldBox, sx+28, sy+70);
        }
      }});
    }

    drawList.sort((a, b) => (a.y+(a.h||0))-(b.y+(b.h||0)));
    for (const e of drawList) e.draw(ctx, cam);

    for (const f of this.flashes) {
      const sx = f.x-cam.x, sy = f.y-cam.y, alpha = f.timer/0.3, radius = 12+(1-alpha)*10;
      ctx.globalAlpha = alpha*0.8;
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(sx, sy, radius, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#ffeb3b'; ctx.beginPath(); ctx.arc(sx, sy, radius*0.6, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Placement ghost preview
    if (this.placementMode) {
      const mx = this.player.mouseX - this.camera.x;
      const my = this.player.mouseY - this.camera.y;
      ctx.globalAlpha = 0.5;
      const t = this.placementMode.type;
      if (t === 'house') {
        ctx.fillStyle = '#8d6e63'; ctx.fillRect(mx-30, my-10, 60, 45);
        ctx.fillStyle = '#d32f2f';
        ctx.beginPath(); ctx.moveTo(mx-35, my-10); ctx.lineTo(mx, my-30); ctx.lineTo(mx+35, my-10); ctx.closePath(); ctx.fill();
      } else if (t === 'hotel') {
        ctx.fillStyle = '#78909c'; ctx.fillRect(mx-40, my-10, 80, 55);
        ctx.fillStyle = '#455a64';
        ctx.beginPath(); ctx.moveTo(mx-40, my-10); ctx.lineTo(mx, my-30); ctx.lineTo(mx+40, my-10); ctx.closePath(); ctx.fill();
      } else if (t === 'pavement') {
        const gx = Math.round((this.player.mouseX - 20) / 40) * 40 - this.camera.x;
        const gy = Math.round((this.player.mouseY - 20) / 40) * 40 - this.camera.y;
        ctx.fillStyle = '#9e9e9e'; ctx.fillRect(gx, gy, 40, 40);
        ctx.strokeStyle = '#757575'; ctx.lineWidth = 1;
        ctx.strokeRect(gx, gy, 20, 20); ctx.strokeRect(gx+20, gy, 20, 20);
        ctx.strokeRect(gx, gy+20, 20, 20); ctx.strokeRect(gx+20, gy+20, 20, 20);
      } else if (t === 'fountain') {
        ctx.fillStyle = '#90a4ae'; ctx.fillRect(mx-12, my, 24, 16);
        ctx.fillStyle = '#42a5f5'; ctx.beginPath(); ctx.arc(mx, my-2, 6, 0, Math.PI*2); ctx.fill();
      } else if (t === 'statue') {
        ctx.fillStyle = '#9e9e9e'; ctx.fillRect(mx-8, my+8, 16, 8);
        ctx.fillStyle = '#bdbdbd'; ctx.fillRect(mx-5, my-10, 10, 18);
        ctx.fillStyle = '#e0e0e0'; ctx.beginPath(); ctx.arc(mx, my-12, 6, 0, Math.PI*2); ctx.fill();
      } else if (t === 'garden') {
        ctx.fillStyle = '#4caf50'; ctx.beginPath(); ctx.arc(mx, my, 10, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#f44336'; ctx.beginPath(); ctx.arc(mx-5, my-4, 3, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#ffeb3b'; ctx.beginPath(); ctx.arc(mx+5, my-4, 3, 0, Math.PI*2); ctx.fill();
      } else if (t === 'market') {
        ctx.fillStyle = '#8d6e63'; ctx.fillRect(mx-18, my-2, 36, 20);
        ctx.fillStyle = '#e53935';
        ctx.beginPath(); ctx.moveTo(mx-20, my-2); ctx.lineTo(mx, my-14); ctx.lineTo(mx+20, my-2); ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = 1;
      // Placement hint
      ctx.fillStyle = '#fff'; ctx.font = '12px sans-serif';
      ctx.fillText('Click to place • Right-click to cancel', mx - 90, my + 40);
    }
  },

  renderHouseInterior() {
    const ctx = this.ctx, cw = this.canvas.width, ch = this.canvas.height;
    const hi = this.houseInterior, o = this.getInteriorOrigin();
    const icons = { axe:'🪓',wood:'🪵',knife:'🔪',sword:'⚔️',pickaxe:'⛏️',trowel:'🔧',sandwich:'🥪',apple:'🍎',hat:'🎩',gold:'✨',fruit:'🍐',human_meat:'🍖',cooked_food:'🍳',cooked_human_meat:'🥩',cooked_apple:'🍏',cooked_fruit:'🍊',stone:'🪨',gold_sword:'🗡️',gold_axe:'🪓',gold_pickaxe:'⛏️',gold_armor:'🛡️' };

    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(0, 0, cw, ch);
    ctx.fillStyle = '#a1887f'; ctx.fillRect(o.x, o.y, hi.w, hi.h);
    ctx.strokeStyle = '#8d6e63'; ctx.lineWidth = 1;
    for (let y = o.y; y < o.y+hi.h; y += 20) { ctx.beginPath(); ctx.moveTo(o.x, y); ctx.lineTo(o.x+hi.w, y); ctx.stroke(); }
    ctx.fillStyle = '#6d4c41';
    ctx.fillRect(o.x, o.y-10, hi.w, 12);
    ctx.fillRect(o.x-10, o.y, 12, hi.h);
    ctx.fillRect(o.x+hi.w-2, o.y, 12, hi.h);

    // Bed
    const bx = o.x+hi.bed.x, by = o.y+hi.bed.y;
    ctx.fillStyle = '#5d4037'; ctx.fillRect(bx, by, hi.bed.w, hi.bed.h);
    ctx.fillStyle = this.upgrades.bed ? '#bbdefb' : '#e8f5e9';
    ctx.fillRect(bx+3, by+3, hi.bed.w-6, hi.bed.h-6);
    ctx.fillStyle = '#c8e6c9'; ctx.fillRect(bx+3, by+3, 20, hi.bed.h-6);
    ctx.font = '11px sans-serif'; ctx.fillStyle = '#555';
    ctx.fillText(this.upgrades.bed ? '🛏️ Bed ★' : '🛏️ Bed', bx+10, by+hi.bed.h+13);
    if (this.isSleeping) {
      ctx.fillStyle = 'rgba(0,0,100,0.3)'; ctx.fillRect(bx, by, hi.bed.w, hi.bed.h);
      ctx.fillStyle = '#fff'; ctx.font = '16px sans-serif'; ctx.fillText('💤', bx+30, by+20);
      const st = this.getSleepTime();
      ctx.fillStyle = '#333'; ctx.fillRect(bx, by+hi.bed.h+2, hi.bed.w, 6);
      ctx.fillStyle = '#4caf50'; ctx.fillRect(bx, by+hi.bed.h+2, hi.bed.w*(this.bedTimer/st), 6);
    }

    // Table
    const tx = o.x+hi.table.x, ty = o.y+hi.table.y;
    ctx.fillStyle = '#795548'; ctx.fillRect(tx, ty, hi.table.w, hi.table.h);
    ctx.fillStyle = '#8d6e63'; ctx.fillRect(tx+2, ty+2, hi.table.w-4, hi.table.h-4);
    for (let i = 0; i < 10; i++) {
      const item = hi.table.slots[i];
      if (item) { ctx.font = '10px serif'; ctx.fillText(icons[item.type]||'?', tx+5+(i%5)*13, ty+14+Math.floor(i/5)*18); }
    }
    ctx.font = '11px sans-serif'; ctx.fillStyle = '#555'; ctx.fillText('📦 Table', tx+10, ty+hi.table.h+13);

    // Fireplace
    const fx = o.x+hi.fireplace.x, fy = o.y+hi.fireplace.y;
    ctx.fillStyle = '#424242'; ctx.fillRect(fx, fy, hi.fireplace.w, hi.fireplace.h);
    ctx.fillStyle = '#616161'; ctx.fillRect(fx+4, fy+4, hi.fireplace.w-8, hi.fireplace.h-8);
    ctx.fillStyle = '#ff6f00';
    ctx.beginPath(); ctx.moveTo(fx+15, fy+hi.fireplace.h-5); ctx.lineTo(fx+30, fy+8); ctx.lineTo(fx+45, fy+hi.fireplace.h-5); ctx.fill();
    ctx.fillStyle = '#ffca28';
    ctx.beginPath(); ctx.moveTo(fx+22, fy+hi.fireplace.h-5); ctx.lineTo(fx+30, fy+15); ctx.lineTo(fx+38, fy+hi.fireplace.h-5); ctx.fill();
    if (this.cookingItems.length > 0) {
      for (let i = 0; i < this.cookingItems.length; i++) {
        ctx.font = '12px serif'; ctx.fillText('🍳', fx+10+i*18, fy+hi.fireplace.h+16);
      }
      const worst = Math.max(...this.cookingItems.map(c => c.timer));
      ctx.fillStyle = '#333'; ctx.fillRect(fx, fy+hi.fireplace.h+20, hi.fireplace.w, 5);
      ctx.fillStyle = '#ff9800'; ctx.fillRect(fx, fy+hi.fireplace.h+20, hi.fireplace.w*(1-worst/3), 5);
    }
    ctx.font = '11px sans-serif'; ctx.fillStyle = '#555';
    ctx.fillText(this.upgrades.fireplace ? '🔥 Fire ★' : '🔥 Fire', fx+8, fy+hi.fireplace.h+34);

    // Fridge (if built)
    if (hi.fridge) {
      const rx = o.x+hi.fridge.x, ry = o.y+hi.fridge.y;
      ctx.fillStyle = '#cfd8dc'; ctx.fillRect(rx, ry, hi.fridge.w, hi.fridge.h);
      ctx.fillStyle = '#eceff1'; ctx.fillRect(rx+3, ry+3, hi.fridge.w-6, hi.fridge.h-6);
      ctx.fillStyle = '#90a4ae'; ctx.fillRect(rx+hi.fridge.w-8, ry+15, 4, 20);
      ctx.font = '11px sans-serif'; ctx.fillStyle = '#555'; ctx.fillText('🧊 Fridge', rx+5, ry+hi.fridge.h+13);
    }

    // Wardrobe (if built)
    if (hi.wardrobe) {
      const wx = o.x+hi.wardrobe.x, wy = o.y+hi.wardrobe.y;
      ctx.fillStyle = '#5d4037'; ctx.fillRect(wx, wy, hi.wardrobe.w, hi.wardrobe.h);
      ctx.fillStyle = '#795548'; ctx.fillRect(wx+3, wy+3, hi.wardrobe.w/2-5, hi.wardrobe.h-6);
      ctx.fillRect(wx+hi.wardrobe.w/2+2, wy+3, hi.wardrobe.w/2-5, hi.wardrobe.h-6);
      ctx.fillStyle = '#ffeb3b';
      ctx.beginPath(); ctx.arc(wx+hi.wardrobe.w/2-3, wy+hi.wardrobe.h/2, 2, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(wx+hi.wardrobe.w/2+3, wy+hi.wardrobe.h/2, 2, 0, Math.PI*2); ctx.fill();
      ctx.font = '11px sans-serif'; ctx.fillStyle = '#555'; ctx.fillText('👔 Wardrobe', wx+5, wy+hi.wardrobe.h+13);
    }

    // Mirror (if built)
    if (hi.mirror) {
      const mx = o.x+hi.mirror.x, my = o.y+hi.mirror.y;
      ctx.fillStyle = '#8d6e63'; ctx.fillRect(mx+2, my, hi.mirror.w-4, hi.mirror.h);
      ctx.fillStyle = '#b3e5fc';
      ctx.fillRect(mx+5, my+3, hi.mirror.w-10, hi.mirror.h-6);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.globalAlpha = 0.4;
      ctx.beginPath(); ctx.moveTo(mx+8, my+6); ctx.lineTo(mx+12, my+hi.mirror.h-8); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.font = '11px sans-serif'; ctx.fillStyle = '#555'; ctx.fillText('🪞 Mirror', mx+2, my+hi.mirror.h+13);
    }

    // Door
    const dx = o.x+hi.door.x, dy = o.y+hi.door.y;
    ctx.fillStyle = '#5d4037'; ctx.fillRect(dx, dy, hi.door.w, hi.door.h);
    ctx.fillStyle = '#8d6e63'; ctx.fillRect(dx+4, dy+4, hi.door.w-8, hi.door.h-8);
    ctx.fillStyle = '#ffeb3b'; ctx.beginPath(); ctx.arc(dx+hi.door.w-10, dy+hi.door.h/2, 3, 0, Math.PI*2); ctx.fill();
    ctx.font = '11px sans-serif'; ctx.fillStyle = '#aaa'; ctx.fillText('🚪 Exit', dx+4, dy+hi.door.h+13);

    this.player.draw(ctx, { x: 0, y: 0 });
  }
};

// ---- SAVE / LOAD SYSTEM ----
const SaveSystem = {
  SAVE_KEY: 'forest_critters_save',

  hasSave() {
    return localStorage.getItem(this.SAVE_KEY) !== null;
  },

  save(game) {
    const p = game.player;
    const data = {
      charType: p.type,
      px: p.x, py: p.y,
      health: p.health, hunger: p.hunger,
      inventory: p.inventory,
      equippedSlot: p.equippedSlot,
      totalWoodCollected: p.totalWoodCollected,
      houseBuilt: p.houseBuilt,
      house: game.house,
      upgrades: game.upgrades,
      insideHouse: game.insideHouse,
      tableSlots: game.houseInterior.table.slots,
      fridgeSlots: game.houseInterior.fridge ? game.houseInterior.fridge.slots : null,
      wardrobeSlots: game.houseInterior.wardrobe ? game.houseInterior.wardrobe.slots : null,
      outfit: p.outfit,
      houseW: game.houseInterior.w,
      trees: game.entities.trees.map(t => ({ x:t.x, y:t.y, slabs:t.slabs, alive:t.alive })),
      stones: game.entities.stones.map(s => ({ x:s.x, y:s.y, hits:s.hits, alive:s.alive, hasGold:s.hasGold })),
      dirtPatches: game.entities.dirtPatches.map(d => ({ x:d.x, y:d.y, dug:d.dug, hasGold:d.hasGold })),
      fruitTrees: game.entities.fruitTrees.map(ft => ({ x:ft.x, y:ft.y, hasFruit:ft.hasFruit })),
      groundItems: game.entities.groundItems.filter(gi => gi.alive).map(gi => ({ x:gi.x, y:gi.y, type:gi.type })),
      pavements: game.entities.pavements.map(pv => ({ x:pv.x, y:pv.y })),
      decorations: game.entities.decorations.map(d => ({ x:d.x, y:d.y, type:d.type })),
      hotel: game.hotel,
      hotelGoldBox: game.hotelGoldBox,
    };
    localStorage.setItem(this.SAVE_KEY, JSON.stringify(data));
  },

  load() {
    const raw = localStorage.getItem(this.SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  },

  deleteSave() {
    localStorage.removeItem(this.SAVE_KEY);
  }
};

// Auto-save every 30 seconds
setInterval(() => {
  if (Game.running && Game.player) SaveSystem.save(Game);
}, 30000);

// Extend Game with load capability
Game.loadFromSave = function(data) {
  document.getElementById('character-select').style.display = 'none';
  this.canvas = document.getElementById('gameCanvas');
  this.resizeCanvas();
  this.canvas.style.display = 'block';
  document.getElementById('new-game-btn').style.display = 'block';
  this.ctx = this.canvas.getContext('2d');

  this.player = new Player(data.charType, data.px, data.py);
  this.player.health = data.health;
  this.player.hunger = data.hunger;
  this.player.inventory = data.inventory;
  this.player.equippedSlot = data.equippedSlot;
  this.player.totalWoodCollected = data.totalWoodCollected;
  this.player.houseBuilt = data.houseBuilt;

  this.house = data.house;
  this.upgrades = data.upgrades;
  this.insideHouse = data.insideHouse || false;
  this.houseInterior.table.slots = data.tableSlots;
  this.houseInterior.w = data.houseW || 300;

  if (data.upgrades.fridge && data.fridgeSlots) {
    this.houseInterior.fridge = { x:10, y:130, w:60, h:55, slots: data.fridgeSlots };
  }
  if (data.upgrades.house && data.wardrobeSlots !== undefined) {
    this.houseInterior.wardrobe = { x:320, y:10, w:70, h:60, slots: data.wardrobeSlots || new Array(40).fill(null) };
  }
  if (data.upgrades.wardrobe && !this.houseInterior.wardrobe) {
    this.houseInterior.wardrobe = { x:320, y:10, w:70, h:60, slots: data.wardrobeSlots || new Array(40).fill(null) };
  }
  if (data.upgrades.mirror) {
    this.houseInterior.mirror = { x:10, y:70, w:40, h:50 };
  }
  if (data.outfit) this.player.outfit = data.outfit;

  // Rebuild world from save
  const ws = this.worldSize;
  for (let x = 0; x < ws; x += 40) {
    for (let y = 0; y < ws; y += 40) {
      const shade = 90 + Math.floor(Math.random() * 30);
      this.grassTiles.push({ x, y, color: `rgb(${shade-30},${shade+50},${shade-40})` });
    }
  }

  this.entities.trees = data.trees.map(t => { const tr = new Tree(t.x, t.y); tr.slabs = t.slabs; tr.alive = t.alive; return tr; });
  this.entities.stones = data.stones.map(s => { const st = new Stone(s.x, s.y); st.hits = s.hits; st.alive = s.alive; st.hasGold = s.hasGold; return st; });
  this.entities.dirtPatches = data.dirtPatches.map(d => { const dp = new DirtPatch(d.x, d.y); dp.dug = d.dug; dp.hasGold = d.hasGold; return dp; });
  this.entities.fruitTrees = data.fruitTrees.map(ft => { const f = new FruitTree(ft.x, ft.y); f.hasFruit = ft.hasFruit; return f; });
  this.entities.groundItems = data.groundItems.map(gi => new GroundItem(gi.x, gi.y, gi.type));
  this.entities.pavements = (data.pavements || []).map(pv => new Pavement(pv.x, pv.y));
  this.entities.decorations = (data.decorations || []).map(d => new Decoration(d.x, d.y, d.type));
  this.hotel = data.hotel || null;
  this.hotelGoldBox = data.hotelGoldBox || 0;
  for (let i = 0; i < 4; i++) this.spawnHuman();

  UI.init(); UI.showHUD();
  this.setupInput();
  this.running = true;
  this.lastTime = performance.now();
  requestAnimationFrame(t => this.loop(t));
};

// Wrap original start to also show new game button and handle dev mode
const _origStart = Game.start.bind(Game);
Game.start = function(charType) {
  const devMode = document.getElementById('dev-mode').checked;
  _origStart(charType);
  document.getElementById('new-game-btn').style.display = 'block';
  if (devMode) {
    this.player.addItem('wood', 50);
  }
};

// ---- CHARACTER SELECT & SAVE UI ----
function refreshStartScreen() {
  const saveDiv = document.getElementById('save-buttons');
  const data = SaveSystem.load();
  if (data) {
    saveDiv.innerHTML = `
      <button class="save-btn continue" id="continue-btn">▶️ Continue (${data.charType})</button>
      <button class="save-btn delete" id="delete-save-btn">🗑️ Delete Save</button>
    `;
    document.getElementById('continue-btn').addEventListener('click', () => {
      Game.loadFromSave(data);
    });
    document.getElementById('delete-save-btn').addEventListener('click', () => {
      SaveSystem.deleteSave();
      refreshStartScreen();
    });
  } else {
    saveDiv.innerHTML = '<p style="font-size:13px;opacity:0.6">No saved game</p>';
  }
}

document.querySelectorAll('.char-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    SaveSystem.deleteSave(); // New game clears old save
    Game.start(btn.dataset.char);
  });
});

document.getElementById('new-game-btn').addEventListener('click', () => {
  if (confirm('Start a new game? Current progress will be saved first.')) {
    if (Game.running && Game.player) SaveSystem.save(Game);
    location.reload();
  }
});

// Save on page unload
window.addEventListener('beforeunload', () => {
  if (Game.running && Game.player) SaveSystem.save(Game);
});

refreshStartScreen();
