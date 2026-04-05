// ---- GAME CONFIGURATION ----
// All prices, quantities, and yields in one place
const CONFIG = {
  // Crafting costs
  costs: {
    knife: 10,
    sword: 10,
    pickaxe: 10,
    trowel: 10,
    gold_sword: 8,
    gold_axe: 8,
    gold_pickaxe: 8,
    gold_armor: 12,
    house: 40,
    pavement: 1,
    hotel: 9,
    fountain: 10,
    statue: 15,
    garden: 6,
    market: 20,
  },
  // Upgrade costs
  upgradeCosts: {
    house: 50,
    wardrobe: 3,
    mirror: 3,
    fireplace: 30,
    fridge: 40,
    bed: 50,
    axe: 45,
  },
  // Sell prices
  sellPrices: {
    human_meat: 10,
    apple: 2,
    fruit: 3,
    cooked_human_meat: 15,
    cooked_apple: 7,
    cooked_fruit: 8,
  },
  // Yields & quantities
  yields: {
    woodPerChop: 1,
    stonePerMine: 1,
    treeSabs: 3,
    treeSabsUpgraded: 5,
    stoneHits: 3,
    goldChanceStone: 0.15,
    goldChanceDirt: 0.25,
    fruitRegrowTime: 15,
    treeRespawnTime: 30,
    stoneRespawnTime: 30,
  },
  // Building limits
  limits: {
    maxHouses: 5,
    maxHotels: 5,
  },
  // Hotel & guests
  hotel: {
    guestPayment: 6,
    maxGuests: 3,
    guestStayMin: 30,
    guestStayMax: 60,
    guestSpawnMin: 20,
    guestSpawnMax: 25,
  },
  // Combat damage
  damage: {
    fist: 5,
    axe: 8,
    knife: 12,
    sword: 20,
    gold_sword: 35,
    gold_axe: 15,
  },
  // Food energy
  foodEnergy: {
    apple: 20,
    sandwich: 35,
    fruit: 15,
    human_meat: 40,
    cooked_food: 100,
    cooked_human_meat: 100,
    cooked_apple: 60,
    cooked_fruit: 50,
  },
  // Cooking
  cooking: {
    cookTime: 3,
  },
  // Sleep
  sleep: {
    normalTime: 20,
    upgradedTime: 15,
  },
  // Human spawning
  humans: {
    maxAlive: 4,
    spawnMin: 10,
    spawnMax: 15,
    health: 50,
  },

  // Save/load to localStorage
  save() {
    localStorage.setItem('forest_critters_config', JSON.stringify(this, (k, v) => typeof v === 'function' ? undefined : v));
  },
  load() {
    const raw = localStorage.getItem('forest_critters_config');
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      for (const section of ['costs','upgradeCosts','sellPrices','yields','limits','hotel','damage','foodEnergy','cooking','sleep','humans']) {
        if (data[section]) {
          for (const key in data[section]) {
            if (this[section] && this[section].hasOwnProperty(key)) {
              this[section][key] = data[section][key];
            }
          }
        }
      }
    } catch(e) {}
  }
};

// Load saved config on startup
CONFIG.load();
