/**
 * src/lib/bazi/interactions.js
 *
 * BaZi Branch and Stem interactions:
 *   - Six Combinations (六合 Liùhé)
 *   - Three Harmonies / Element Frames (三合 Sānhé)
 *   - Six Clashes (六冲 Liùchōng)
 *   - Three Penalties (三刑 Sānxíng)
 *   - Six Harms (六害 Liùhài)
 *   - Six Destructions (六破 Liùpò)
 *   - Stem Combinations (天干合 Tiāngān hé)
 *
 * Each function accepts branch/stem names (strings) and returns interaction objects.
 */

// ── Six Combinations (produce a new element) ──────────────────────────────────
const SIX_COMBINATIONS = [
  { pair: ['Zi','Chou'],  produces: 'Earth',  name: 'Rat-Ox Combination'     },
  { pair: ['Yin','Hai'],  produces: 'Wood',   name: 'Tiger-Pig Combination'  },
  { pair: ['Mao','Xu'],   produces: 'Fire',   name: 'Rabbit-Dog Combination' },
  { pair: ['Chen','You'], produces: 'Metal',  name: 'Dragon-Rooster Combination' },
  { pair: ['Si','Shen'],  produces: 'Water',  name: 'Snake-Monkey Combination' },
  { pair: ['Wu','Wei'],   produces: 'Fire',   name: 'Horse-Goat Combination' },
];

// ── Three Harmonies (form element frames) ────────────────────────────────────
const THREE_HARMONIES = [
  { trio: ['Shen','Zi','Chen'], produces: 'Water', name: 'Water Frame' },
  { trio: ['Yin','Wu','Xu'],   produces: 'Fire',  name: 'Fire Frame'  },
  { trio: ['Hai','Mao','Wei'], produces: 'Wood',  name: 'Wood Frame'  },
  { trio: ['Si','You','Chou'], produces: 'Metal', name: 'Metal Frame' },
];

// ── Six Clashes ───────────────────────────────────────────────────────────────
const SIX_CLASHES = [
  { pair: ['Zi','Wu'],   name: 'Rat-Horse Clash'    },
  { pair: ['Chou','Wei'], name: 'Ox-Goat Clash'      },
  { pair: ['Yin','Shen'], name: 'Tiger-Monkey Clash' },
  { pair: ['Mao','You'],  name: 'Rabbit-Rooster Clash' },
  { pair: ['Chen','Xu'],  name: 'Dragon-Dog Clash'   },
  { pair: ['Si','Hai'],   name: 'Snake-Pig Clash'    },
];

// ── Penalties (三刑) ──────────────────────────────────────────────────────────
const PENALTIES = [
  { set: ['Yin','Si','Shen'],     type: 'Ungrateful', name: 'Tiger-Snake-Monkey Penalty' },
  { set: ['Chou','Xu','Wei'],     type: 'Bullying',   name: 'Ox-Dog-Goat Penalty'        },
  { set: ['Zi','Mao'],            type: 'Uncivilized', name: 'Rat-Rabbit Penalty'        },
  { set: ['Chen'],                type: 'Self',        name: 'Dragon Self-Penalty'       },
  { set: ['Wu'],                  type: 'Self',        name: 'Horse Self-Penalty'        },
  { set: ['You'],                 type: 'Self',        name: 'Rooster Self-Penalty'      },
  { set: ['Hai'],                 type: 'Self',        name: 'Pig Self-Penalty'          },
];

// ── Six Harms (六害) ──────────────────────────────────────────────────────────
const SIX_HARMS = [
  { pair: ['Zi','Wei'],   name: 'Rat-Goat Harm'      },
  { pair: ['Chou','Wu'],  name: 'Ox-Horse Harm'      },
  { pair: ['Yin','Si'],   name: 'Tiger-Snake Harm'   },
  { pair: ['Mao','Chen'], name: 'Rabbit-Dragon Harm' },
  { pair: ['Shen','Hai'], name: 'Monkey-Pig Harm'    },
  { pair: ['You','Xu'],   name: 'Rooster-Dog Harm'   },
];

// ── Six Destructions (六破) ───────────────────────────────────────────────────
const SIX_DESTRUCTIONS = [
  { pair: ['Zi','You'],   name: 'Rat-Rooster Destruction'  },
  { pair: ['Chou','Chen'], name: 'Ox-Dragon Destruction'   },
  { pair: ['Yin','Hai'],  name: 'Tiger-Pig Destruction'    },
  { pair: ['Mao','Wu'],   name: 'Rabbit-Horse Destruction' },
  { pair: ['Si','Shen'],  name: 'Snake-Monkey Destruction' },
  { pair: ['Wei','Xu'],   name: 'Goat-Dog Destruction'     },
];

// ── Stem Combinations (天干合) ────────────────────────────────────────────────
const STEM_COMBINATIONS = [
  { pair: ['Jia','Ji'],   produces: 'Earth', name: 'Jia-Ji Earth Combination'  },
  { pair: ['Yi','Geng'],  produces: 'Metal', name: 'Yi-Geng Metal Combination' },
  { pair: ['Bing','Xin'], produces: 'Water', name: 'Bing-Xin Water Combination'},
  { pair: ['Ding','Ren'], produces: 'Wood',  name: 'Ding-Ren Wood Combination' },
  { pair: ['Wu','Gui'],   produces: 'Fire',  name: 'Wu-Gui Fire Combination'   },
];

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Find all interactions between a set of branches.
 * Typically called with the four natal branches + current year/month branches.
 *
 * @param {string[]} branches - Array of branch names (e.g. ['Zi','Wu','Yin','Hai'])
 * @returns {object} { combinations, harmonies, clashes, penalties, harms, destructions }
 */
export function analyzeBranchInteractions(branches) {
  const result = {
    combinations:  [],
    harmonies:     [],
    clashes:       [],
    penalties:     [],
    harms:         [],
    destructions:  []
  };

  const set = new Set(branches);

  // Six Combinations
  for (const c of SIX_COMBINATIONS) {
    if (set.has(c.pair[0]) && set.has(c.pair[1])) {
      result.combinations.push(c);
    }
  }

  // Three Harmonies (full frame or partial)
  for (const h of THREE_HARMONIES) {
    const present = h.trio.filter(b => set.has(b));
    if (present.length >= 2) {
      result.harmonies.push({ ...h, presentBranches: present, isFull: present.length === 3 });
    }
  }

  // Six Clashes
  for (const c of SIX_CLASHES) {
    if (set.has(c.pair[0]) && set.has(c.pair[1])) {
      result.clashes.push(c);
    }
  }

  // Penalties
  for (const p of PENALTIES) {
    const present = p.set.filter(b => set.has(b));
    if (present.length >= (p.set.length === 1 ? 2 : 2)) { // self-penalty needs double
      if (p.set.length === 1) {
        const count = branches.filter(b => b === p.set[0]).length;
        if (count >= 2) result.penalties.push({ ...p, presentBranches: present });
      } else if (present.length >= 2) {
        result.penalties.push({ ...p, presentBranches: present, isFull: present.length === p.set.length });
      }
    }
  }

  // Six Harms
  for (const h of SIX_HARMS) {
    if (set.has(h.pair[0]) && set.has(h.pair[1])) {
      result.harms.push(h);
    }
  }

  // Six Destructions
  for (const d of SIX_DESTRUCTIONS) {
    if (set.has(d.pair[0]) && set.has(d.pair[1])) {
      result.destructions.push(d);
    }
  }

  return result;
}

/**
 * Find Stem Combinations in a set of stems.
 */
export function analyzeStemCombinations(stems) {
  const set = new Set(stems);
  return STEM_COMBINATIONS.filter(c => set.has(c.pair[0]) && set.has(c.pair[1]));
}

/**
 * Full chart interaction analysis: natal vs. a period pillar (annual/monthly).
 * Returns interactions plus a brief narrative for each.
 */
export function analyzeChartVsPeriod(natalBranches, periodBranches) {
  const allBranches = [...natalBranches, ...periodBranches];
  const interactions = analyzeBranchInteractions(allBranches);

  const narratives = [];

  for (const c of interactions.clashes) {
    narratives.push({
      type: 'clash',
      severity: 'high',
      branches: c.pair,
      text: `${c.name}: tension, disruption, and forced change. ` +
        `This is a high-energy conflict that demands attention and adaptation.`
    });
  }

  for (const c of interactions.combinations) {
    narratives.push({
      type: 'combination',
      severity: 'positive',
      branches: c.pair,
      text: `${c.name}: these two branches merge, producing ${c.produces} energy. ` +
        `This strengthens ${c.produces}-related matters and creates cooperation.`
    });
  }

  for (const h of interactions.harmonies) {
    const strength = h.isFull ? 'a full, potent' : 'a partial';
    narratives.push({
      type: 'harmony',
      severity: 'positive',
      branches: h.presentBranches,
      text: `${h.name} (${h.presentBranches.join('-')}): ${strength} element frame forms, ` +
        `powerfully activating ${h.produces} energy across all areas it governs.`
    });
  }

  for (const p of interactions.penalties) {
    narratives.push({
      type: 'penalty',
      severity: 'moderate',
      branches: p.presentBranches,
      text: `${p.name} (${p.type} Penalty): hidden friction, legal complications, ` +
        `or health concerns related to the organs associated with these branches.`
    });
  }

  return { interactions, narratives };
}

/**
 * Get the element associated with a Branch's main hidden stem.
 */
export function getBranchMainElement(branch) {
  const { HIDDEN_STEMS, STEM_ELEMENTS } = await import('../bazi.js');
  const mainStem = HIDDEN_STEMS[branch]?.[0];
  return mainStem ? STEM_ELEMENTS[mainStem] : null;
}
