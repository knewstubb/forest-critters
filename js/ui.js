const ICONS = {
  axe:'🪓',wood:'🪵',knife:'🔪',sword:'⚔️',pickaxe:'⛏️',trowel:'🔧',
  sandwich:'🥪',apple:'🍎',hat:'🎩',gold:'✨',fruit:'🍐',
  human_meat:'🍖',cooked_food:'🍳',cooked_human_meat:'🥩',cooked_apple:'🍏',cooked_fruit:'🍊',stone:'🪨',
  gold_sword:'🗡️',gold_axe:'🪓',gold_pickaxe:'⛏️',gold_armor:'🛡️'
};

const UI = {
  hudEl: null, invEl: null, craftEl: null, faintEl: null, promptEl: null,
  invOpen: false, craftOpen: false, tableOpen: false, fridgeOpen: false, wardrobeOpen: false, mirrorOpen: false,

  init() {
    this.hudEl = document.getElementById('hud');
    this.invEl = document.getElementById('inventory-screen');
    this.craftEl = document.getElementById('craft-menu');
    this.faintEl = document.getElementById('faint-overlay');
  },

  showHUD() {
    this.hudEl.style.display = 'block';
    const hintBar = document.getElementById('hud-hint-bar');
    if (hintBar) hintBar.style.display = 'block';
  },

  updateHUD(player) {
    const hp = Math.max(0,(player.health/player.maxHealth)*100);
    const hg = Math.max(0,(player.hunger/player.maxHunger)*100);
    const eq = player.getEquipped();
    this.hudEl.innerHTML = `
      <div class="hud-bar">
        <div class="hud-stat">❤️ <div class="stat-bar"><div class="stat-fill health-fill" style="width:${hp}%"></div></div></div>
        <div class="hud-stat">🍗 <div class="stat-bar"><div class="stat-fill hunger-fill" style="width:${hg}%"></div></div></div>
        <div class="hud-stat">🪵 ${player.countItem('wood')} 🪨 ${player.countItem('stone')}</div>
        <div class="hud-stat">🎒 ${player.inventory.filter(s=>s).length}/7</div>
        <div class="hud-stat">🔧 ${eq ? eq.type : 'none'}</div>
      </div>`;
  },

  showPrompt(text) {
    if (!this.promptEl) {
      this.promptEl = document.createElement('div');
      this.promptEl.className = 'interact-prompt';
      document.getElementById('game-container').appendChild(this.promptEl);
    }
    this.promptEl.textContent = text;
    this.promptEl.style.display = 'block';
  },
  hidePrompt() { if (this.promptEl) this.promptEl.style.display = 'none'; },

  toggleInventory(player) {
    this.invOpen = !this.invOpen;
    if (this.invOpen) {
      this._closeOthers('inv');
      this.renderInventory(player);
      this.invEl.classList.remove('hidden');
    } else this.invEl.classList.add('hidden');
  },

  renderInventory(player) {
    let html = '<h2>� Backpack</h2><div class="inv-slots">';
    for (let i = 0; i < 7; i++) {
      const s = player.inventory[i];
      const eq = player.equippedSlot === i ? ' style="border-color:#ffeb3b"' : '';
      if (s) {
        html += `<div class="inv-slot" data-slot="${i}"${eq}>${ICONS[s.type]||'?'}${s.count>1?`<span class="count">x${s.count}</span>`:''}
          <span class="item-name">${s.type}</span></div>`;
      } else html += `<div class="inv-slot" data-slot="${i}">-</div>`;
    }
    html += '</div><p style="text-align:center;margin-top:10px;font-size:12px;color:#888">Click to equip/unequip • [I] close</p>';
    this.invEl.innerHTML = html;
    this.invEl.querySelectorAll('.inv-slot').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.slot);
        if (player.inventory[idx]) {
          const equipable = ['axe','knife','sword','pickaxe','trowel','gold_sword','gold_axe','gold_pickaxe'];
          if (equipable.includes(player.inventory[idx].type)) {
            player.equippedSlot = player.equippedSlot === idx ? -1 : idx;
            this.invOpen = false; this.invEl.classList.add('hidden');
          }
        }
      });
    });
  },

  toggleCraft(player, game) {
    this.craftOpen = !this.craftOpen;
    if (this.craftOpen) {
      this._closeOthers('craft');
      this.renderCraft(player, game);
      this.craftEl.classList.remove('hidden');
    } else this.craftEl.classList.add('hidden');
  },

  renderCraft(player, game) {
    const woodCount = player.countItem('wood');
    const stoneCount = player.countItem('stone');
    const goldCount = player.countItem('gold');
    const recipes = [
      { name:'Knife', type:'knife', res:'wood', cost:10, icon:'🔪' },
      { name:'Sword', type:'sword', res:'wood', cost:10, icon:'⚔️' },
      { name:'Pickaxe', type:'pickaxe', res:'wood', cost:10, icon:'⛏️' },
      { name:'Trowel', type:'trowel', res:'wood', cost:10, icon:'🔧' },
      { name:'Gold Sword', type:'gold_sword', res:'gold', cost:8, icon:'🗡️' },
      { name:'Gold Axe', type:'gold_axe', res:'gold', cost:8, icon:'🪓' },
      { name:'Gold Pickaxe', type:'gold_pickaxe', res:'gold', cost:8, icon:'⛏️' },
      { name:'Gold Armor', type:'gold_armor', res:'gold', cost:12, icon:'🛡️' },
      { name:'House', type:'house', res:'wood', cost:40, icon:'🏠' },
      { name:'Pavement', type:'pavement', res:'stone', cost:3, icon:'🧱' },
      { name:'Hotel', type:'hotel', res:'wood', cost:9, icon:'🏨' },
      { name:'Fountain', type:'fountain', res:'gold', cost:10, icon:'⛲' },
      { name:'Statue', type:'statue', res:'gold', cost:15, icon:'🗿' },
      { name:'Garden', type:'garden', res:'gold', cost:6, icon:'🌷' },
      { name:'Market', type:'market', res:'gold', cost:20, icon:'🏪' },
    ];

    const upgrades = game && player.houseBuilt ? [
      { name:'House+ (bigger room)', type:'up_house', res:'wood', cost:50, icon:'🏠★', done: game.upgrades.house },
      { name:'Wardrobe (clothing)', type:'up_wardrobe', res:'wood', cost:3, icon:'👔', done: game.upgrades.wardrobe },
      { name:'Mirror (change character)', type:'up_mirror', res:'stone', cost:3, icon:'🪞', done: game.upgrades.mirror },
      { name:'Fireplace+ (3 slots)', type:'up_fireplace', res:'stone', cost:30, icon:'🔥★', done: game.upgrades.fireplace },
      { name:'Fridge (20 food slots)', type:'up_fridge', res:'stone', cost:40, icon:'🧊', done: game.upgrades.fridge },
      { name:'Bed+ (15s sleep)', type:'up_bed', res:'wood', cost:50, icon:'🛏️★', done: game.upgrades.bed },
      { name:'Axe+ (5 slabs/tree)', type:'up_axe', res:'stone', cost:45, icon:'🪓★', done: game.upgrades.axe },
    ] : [];

    // Sell prices
    const sellPrices = [
      { type:'human_meat', name:'Human Meat', price:10, icon:'🍖' },
      { type:'apple', name:'Apple', price:2, icon:'🍎' },
      { type:'fruit', name:'Fruit', price:3, icon:'🍐' },
      { type:'cooked_human_meat', name:'Cooked Human Meat', price:15, icon:'🥩' },
      { type:'cooked_apple', name:'Cooked Apple', price:7, icon:'🍏' },
      { type:'cooked_fruit', name:'Cooked Fruit', price:8, icon:'�' },
    ];

    let html = '<h2>🔨 Craft</h2>';
    for (const r of recipes) {
      if (r.type === 'house' && player.houseBuilt) {
        html += `<div class="craft-item"><span>${r.icon} ${r.name}</span><span style="color:#4caf50">Built!</span></div>`;
        continue;
      }
      if (r.type === 'hotel' && game && game.hotel) {
        html += `<div class="craft-item"><span>${r.icon} ${r.name}</span><span style="color:#4caf50">Built!</span></div>`;
        continue;
      }
      const have = r.res === 'wood' ? woodCount : r.res === 'gold' ? goldCount : stoneCount;
      const canCraft = have >= r.cost;
      html += `<div class="craft-item"><span>${r.icon} ${r.name} (${r.cost} ${r.res})</span>
        <button data-craft="${r.type}" ${canCraft?'':'disabled'}>Craft</button></div>`;
    }

    if (upgrades.length > 0) {
      html += '<h2 style="margin-top:12px">⬆️ Upgrades</h2>';
      for (const u of upgrades) {
        if (u.done) {
          html += `<div class="craft-item"><span>${u.icon} ${u.name}</span><span style="color:#4caf50">Done!</span></div>`;
        } else {
          const have = u.res === 'wood' ? woodCount : u.res === 'gold' ? goldCount : stoneCount;
          html += `<div class="craft-item"><span>${u.icon} ${u.name} (${u.cost} ${u.res})</span>
            <button data-upgrade="${u.type}" ${have>=u.cost?'':'disabled'}>Build</button></div>`;
        }
      }
    }

    // Sell section
    html += '<h2 style="margin-top:12px">💰 Sell (gold: ' + goldCount + ')</h2>';
    for (const s of sellPrices) {
      const has = player.hasItem(s.type);
      html += `<div class="craft-item"><span>${s.icon} ${s.name} → ${s.price} gold</span>
        <button data-sell="${s.type}" data-price="${s.price}" ${has?'':'disabled'}>Sell</button></div>`;
    }

    html += '<p style="text-align:center;margin-top:10px;font-size:12px;color:#888">[C] to close</p>';
    this.craftEl.innerHTML = html;

    this.craftEl.querySelectorAll('button[data-craft]').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.craft;
        const recipe = recipes.find(r => r.type === type);
        if (!recipe) return;
        const have = recipe.res === 'wood' ? player.countItem('wood') : recipe.res === 'gold' ? player.countItem('gold') : player.countItem('stone');
        if (have >= recipe.cost) {
          if (type === 'house') {
            player.removeItem('wood', 40); player.houseBuilt = true;
            if (game) { game.placementMode = { type: 'house' }; UI.closeAll(); }
          } else if (type === 'hotel') {
            player.removeItem('wood', 9);
            if (game) { game.placementMode = { type: 'hotel' }; UI.closeAll(); }
          } else if (type === 'pavement') {
            player.removeItem('stone', 3);
            if (game) { game.placementMode = { type: 'pavement' }; UI.closeAll(); }
          } else if (type === 'fountain' || type === 'statue' || type === 'garden' || type === 'market') {
            player.removeItem(recipe.res, recipe.cost);
            if (game) { game.placementMode = { type: type }; UI.closeAll(); }
          } else {
            player.removeItem(recipe.res, recipe.cost);
            player.addItem(type, 1);
          }
          this.renderCraft(player, game);
        }
      });
    });

    this.craftEl.querySelectorAll('button[data-upgrade]').forEach(btn => {
      btn.addEventListener('click', () => {
        const utype = btn.dataset.upgrade;
        const map = { up_house:'house', up_wardrobe:'wardrobe', up_mirror:'mirror', up_fireplace:'fireplace', up_fridge:'fridge', up_bed:'bed', up_axe:'axe' };
        if (game && game.applyUpgrade(map[utype])) {
          this.renderCraft(player, game);
        }
      });
    });

    this.craftEl.querySelectorAll('button[data-sell]').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.sell;
        const price = parseInt(btn.dataset.price);
        if (player.hasItem(type)) {
          player.removeItem(type, 1);
          player.addItem('gold', price);
          this.renderCraft(player, game);
        }
      });
    });
  },

  showFaint() { this.faintEl.classList.remove('hidden'); },
  hideFaint() { this.faintEl.classList.add('hidden'); },

  // ---- TABLE UI (100 stack per slot) ----
  toggleTableUI(game) {
    this.tableOpen = !this.tableOpen;
    if (this.tableOpen) {
      this._closeOthers('table');
      this.renderTableUI(game);
      this.invEl.classList.remove('hidden');
    } else this.invEl.classList.add('hidden');
  },

  renderTableUI(game) {
    const player = game.player, slots = game.houseInterior.table.slots;
    let html = '<h2>📦 Table Storage (100 per slot)</h2>';
    html += '<p style="font-size:12px;color:#aaa;margin-bottom:6px">Backpack → Table:</p><div class="inv-slots">';
    for (let i = 0; i < 7; i++) {
      const s = player.inventory[i];
      html += s ? `<div class="inv-slot" data-action="to-table" data-slot="${i}">${ICONS[s.type]||'?'}${s.count>1?`<span class="count">x${s.count}</span>`:''}
        <span class="item-name">${s.type}</span></div>` : '<div class="inv-slot">-</div>';
    }
    html += '</div><p style="font-size:12px;color:#aaa;margin:8px 0 4px">Table → Backpack:</p><div class="inv-slots" style="grid-template-columns:repeat(5,1fr)">';
    for (let i = 0; i < 10; i++) {
      const s = slots[i];
      html += s ? `<div class="inv-slot" data-action="from-table" data-slot="${i}">${ICONS[s.type]||'?'}${s.count>1?`<span class="count">x${s.count}</span>`:''}
        <span class="item-name">${s.type}</span></div>` : `<div class="inv-slot" data-action="from-table" data-slot="${i}">-</div>`;
    }
    html += '</div><p style="text-align:center;margin-top:8px;font-size:12px;color:#888">[I] to close</p>';
    this.invEl.innerHTML = html;

    this.invEl.querySelectorAll('[data-action="to-table"]').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.slot), item = player.inventory[idx];
        if (!item) return;
        // Find matching slot with space, or empty slot
        let target = slots.findIndex(s => s && s.type === item.type && s.count < 100);
        if (target === -1) target = slots.findIndex(s => s === null);
        if (target === -1) return;
        if (slots[target]) { slots[target].count++; } else { slots[target] = { type: item.type, count: 1 }; }
        item.count--;
        if (item.count <= 0) { player.inventory[idx] = null; if (player.equippedSlot === idx) player.equippedSlot = -1; }
        this.renderTableUI(game);
      });
    });

    this.invEl.querySelectorAll('[data-action="from-table"]').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.slot), item = slots[idx];
        if (!item) return;
        if (player.addItem(item.type, 1) > 0) {
          item.count--;
          if (item.count <= 0) slots[idx] = null;
          this.renderTableUI(game);
        }
      });
    });
  },

  // ---- FRIDGE UI (20 slots, 1 food item per slot) ----
  toggleFridgeUI(game) {
    this.fridgeOpen = !this.fridgeOpen;
    if (this.fridgeOpen) {
      this._closeOthers('fridge');
      this.renderFridgeUI(game);
      this.invEl.classList.remove('hidden');
    } else this.invEl.classList.add('hidden');
  },

  renderFridgeUI(game) {
    const player = game.player, slots = game.houseInterior.fridge.slots;
    const foodTypes = ['fruit','apple','sandwich','human_meat','cooked_food','cooked_human_meat','cooked_apple','cooked_fruit'];
    let html = '<h2>🧊 Fridge (1 food per slot)</h2>';
    html += '<p style="font-size:12px;color:#aaa;margin-bottom:6px">Backpack food → Fridge:</p><div class="inv-slots">';
    for (let i = 0; i < 7; i++) {
      const s = player.inventory[i];
      if (s && foodTypes.includes(s.type)) {
        html += `<div class="inv-slot" data-action="to-fridge" data-slot="${i}">${ICONS[s.type]||'?'}${s.count>1?`<span class="count">x${s.count}</span>`:''}
          <span class="item-name">${s.type}</span></div>`;
      } else html += '<div class="inv-slot">-</div>';
    }
    html += '</div><p style="font-size:12px;color:#aaa;margin:8px 0 4px">Fridge → Backpack:</p><div class="inv-slots" style="grid-template-columns:repeat(5,1fr)">';
    for (let i = 0; i < 20; i++) {
      const s = slots[i];
      html += s ? `<div class="inv-slot" data-action="from-fridge" data-slot="${i}">${ICONS[s]||'?'}
        <span class="item-name">${s}</span></div>` : `<div class="inv-slot" data-action="from-fridge" data-slot="${i}">-</div>`;
    }
    html += '</div><p style="text-align:center;margin-top:8px;font-size:12px;color:#888">Click to close</p>';
    this.invEl.innerHTML = html;

    this.invEl.querySelectorAll('[data-action="to-fridge"]').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.slot), item = player.inventory[idx];
        if (!item || !foodTypes.includes(item.type)) return;
        const empty = slots.findIndex(s => s === null);
        if (empty === -1) return;
        slots[empty] = item.type;
        item.count--;
        if (item.count <= 0) { player.inventory[idx] = null; if (player.equippedSlot === idx) player.equippedSlot = -1; }
        this.renderFridgeUI(game);
      });
    });

    this.invEl.querySelectorAll('[data-action="from-fridge"]').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.slot), type = slots[idx];
        if (!type) return;
        if (player.addItem(type, 1) > 0) { slots[idx] = null; this.renderFridgeUI(game); }
      });
    });
  },

  // ---- WARDROBE UI (clothing customization) ----
  toggleWardrobeUI(game) {
    this.wardrobeOpen = !this.wardrobeOpen;
    if (this.wardrobeOpen) {
      this._closeOthers('wardrobe');
      this.renderWardrobeUI(game);
      this.invEl.classList.remove('hidden');
    } else this.invEl.classList.add('hidden');
  },

  _clothingIcon(name) {
    if (!name) return '❓';
    if (name.includes('hat') || name === 'crown' || name === 'beret' || name === 'beanie') return '🎩';
    if (name.includes('dress')) return '👗';
    if (name.includes('skirt')) return '👗';
    if (name.includes('pants') || name === 'jeans' || name === 'khakis' || name === 'shorts') return '👖';
    if (name === 'tshirt' || name === 'hoodie' || name === 'sweater' || name === 'tank_top' || name === 'polo') return '👕';
    return '👔';
  },

  _clothingSlot(name) {
    if (!name) return null;
    if (name.includes('hat') || name === 'crown' || name === 'beret' || name === 'beanie') return 'hat';
    if (name.includes('dress')) return 'dress';
    if (name.includes('skirt') || name.includes('pants') || name === 'jeans' || name === 'khakis' || name === 'shorts') return 'bottom';
    if (name === 'tshirt' || name === 'hoodie' || name === 'sweater' || name === 'tank_top' || name === 'polo') return 'top';
    return null;
  },

  _prettyName(name) {
    return name ? name.replace(/_/g, ' ') : '';
  },

  renderWardrobeUI(game) {
    const player = game.player, wardrobe = game.houseInterior.wardrobe;
    const outfit = player.outfit;
    let html = '<h2>👔 Wardrobe</h2>';

    // Currently wearing
    html += '<p style="font-size:12px;color:#aaa;margin-bottom:4px">Currently wearing (click to remove):</p>';
    html += '<div class="inv-slots" style="grid-template-columns:repeat(3,1fr);margin-bottom:8px">';
    const slots = [
      { key:'hat', label:'Hat', val: outfit.hat },
      { key:'top', label:'Top', val: outfit.top },
      { key:'bottom', label:'Bottom', val: outfit.bottom },
    ];
    for (const s of slots) {
      if (s.val) {
        html += `<div class="inv-slot" data-action="unequip" data-slot="${s.key}" style="border-color:#ffeb3b">${this._clothingIcon(s.val)}<span class="item-name">${this._prettyName(s.val)}</span></div>`;
      } else {
        html += `<div class="inv-slot"><span class="item-name">${s.label}</span></div>`;
      }
    }
    html += '</div>';

    // Wardrobe contents
    html += '<p style="font-size:12px;color:#aaa;margin-bottom:4px">Wardrobe (click to wear):</p>';
    html += '<div class="inv-slots" style="grid-template-columns:repeat(8,1fr)">';
    for (let i = 0; i < 40; i++) {
      const item = wardrobe.slots[i];
      if (item) {
        html += `<div class="inv-slot" data-action="wear" data-slot="${i}">${this._clothingIcon(item)}<span class="item-name">${this._prettyName(item)}</span></div>`;
      } else {
        html += `<div class="inv-slot">-</div>`;
      }
    }
    html += '</div>';
    html += '<p style="text-align:center;margin-top:8px;font-size:12px;color:#888">Click item to wear • Click worn item to put back</p>';
    this.invEl.innerHTML = html;

    // Wear from wardrobe
    this.invEl.querySelectorAll('[data-action="wear"]').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.slot);
        const item = wardrobe.slots[idx];
        if (!item) return;
        const slotType = this._clothingSlot(item);
        if (!slotType) return;
        // If dress, it takes both top and bottom
        if (slotType === 'dress') {
          // Put back current top and bottom if worn
          if (outfit.top) {
            const empty = wardrobe.slots.indexOf(null);
            if (empty !== -1) wardrobe.slots[empty] = outfit.top;
            outfit.top = null;
          }
          if (outfit.bottom) {
            const empty = wardrobe.slots.indexOf(null);
            if (empty !== -1) wardrobe.slots[empty] = outfit.bottom;
            outfit.bottom = null;
          }
          outfit.top = item;
          outfit.bottom = item;
        } else {
          // Put back current item in that slot
          const outfitKey = slotType;
          if (outfit[outfitKey]) {
            const empty = wardrobe.slots.indexOf(null);
            if (empty !== -1) wardrobe.slots[empty] = outfit[outfitKey];
          }
          outfit[outfitKey] = item;
        }
        wardrobe.slots[idx] = null;
        this.renderWardrobeUI(game);
      });
    });

    // Unequip worn item
    this.invEl.querySelectorAll('[data-action="unequip"]').forEach(el => {
      el.addEventListener('click', () => {
        const key = el.dataset.slot;
        if (!outfit[key]) return;
        const isDress = this._clothingSlot(outfit[key]) === 'dress';
        if (isDress) {
          const empty = wardrobe.slots.indexOf(null);
          if (empty !== -1) wardrobe.slots[empty] = outfit[key];
          outfit.top = null;
          outfit.bottom = null;
        } else {
          const empty = wardrobe.slots.indexOf(null);
          if (empty !== -1) wardrobe.slots[empty] = outfit[key];
          outfit[key] = null;
        }
        this.renderWardrobeUI(game);
      });
    });
  },

  // ---- MIRROR UI (change character) ----
  toggleMirrorUI(game) {
    this.mirrorOpen = !this.mirrorOpen;
    if (this.mirrorOpen) {
      this._closeOthers('mirror');
      this.renderMirrorUI(game);
      this.invEl.classList.remove('hidden');
    } else this.invEl.classList.add('hidden');
  },

  renderMirrorUI(game) {
    const player = game.player;
    const types = ['turtle','sloth','llama','penguin','otter','panda','tiger','bunny','dragon','unicorn','giraffe'];
    const emojis = {
      turtle:'🐢', sloth:'🦥', llama:'🦙', penguin:'🐧', otter:'🦦',
      panda:'🐼', tiger:'🐯', bunny:'🐰', dragon:'🐉', unicorn:'🦄', giraffe:'🦒'
    };
    let html = '<h2>🪞 Mirror</h2>';
    html += '<p style="font-size:12px;color:#aaa;margin-bottom:8px;text-align:center">Choose your new look:</p>';
    html += '<div class="inv-slots" style="grid-template-columns:repeat(4,1fr)">';
    for (const t of types) {
      const current = player.type === t ? ' style="border-color:#ffeb3b;background:rgba(255,235,59,0.15)"' : '';
      html += `<div class="inv-slot" data-action="change-char" data-type="${t}"${current}>
        <span style="font-size:28px">${emojis[t]}</span>
        <span class="item-name">${t}</span></div>`;
    }
    html += '</div>';
    html += '<p style="text-align:center;margin-top:8px;font-size:12px;color:#888">Click to transform</p>';
    this.invEl.innerHTML = html;

    this.invEl.querySelectorAll('[data-action="change-char"]').forEach(el => {
      el.addEventListener('click', () => {
        const newType = el.dataset.type;
        if (player.type === newType) return;
        player.type = newType;
        if (newType === 'turtle') player.speed = 2.5;
        else if (newType === 'sloth') player.speed = 2.0;
        else if (newType === 'bunny') player.speed = 3.2;
        else if (newType === 'dragon') player.speed = 2.8;
        else if (newType === 'giraffe') player.speed = 2.6;
        else player.speed = 2.3;
        this.renderMirrorUI(game);
      });
    });
  },

  _closeOthers(except) {
    if (except !== 'inv') { this.invOpen = false; }
    if (except !== 'craft') { this.craftOpen = false; this.craftEl.classList.add('hidden'); }
    if (except !== 'table') { this.tableOpen = false; }
    if (except !== 'fridge') { this.fridgeOpen = false; }
    if (except !== 'wardrobe') { this.wardrobeOpen = false; }
    if (except !== 'mirror') { this.mirrorOpen = false; }
    if (except !== 'inv' && except !== 'table' && except !== 'fridge' && except !== 'wardrobe' && except !== 'mirror') {
      this.invEl.classList.add('hidden');
    }
  },

  closeAll() {
    this.invOpen = false; this.craftOpen = false; this.tableOpen = false;
    this.fridgeOpen = false; this.wardrobeOpen = false; this.mirrorOpen = false;
    this.invEl.classList.add('hidden'); this.craftEl.classList.add('hidden');
  }
};
