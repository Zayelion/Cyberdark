const fs = require('fs').promises;
const path = require('path');
const { program } = require('commander');

const {
  POWER_BOND,
  CYBER_DRAGON_CORE,
  CYBER_EMERGENCY,
  CYBERNETIC_HORIZON,
  CYBERDARK_REALM,
  CYBERDARK_CLAW,
  CYBERDARK_CANNON,
  CYBER_ARCHETYPE,
  CYBERDARK_ARCHETYPE,
  MACHINE,
  DRAGON,
} = require('./keyCards.json');

const loadedDatabase = require('./database.json');

function reduceCardDB(hash, item) {
  item.links = item.links || [];
  if (item.type === 16401) {
    // no token packs
    return hash;
  }
  if (item.ocg && item.ocg.pack) {
    item.ocg.pack = item.ocg.pack.trim();
    hash[item.ocg.pack] = 0;
  }
  if (item.tcg && item.tcg.pack) {
    item.tcg.pack = item.tcg.pack.trim();
    hash[item.tcg.pack] = 0;
  }
  return hash;
}

// get deck

async function readDeckFromFile(file) {
  return await fs.readFile(file, 'utf8');
}

function findcard(card) {
  return loadedDatabase.find(item => card.id === item.id);
}

function makeDeckfromydk(ydkFileContents) {
  var lineSplit = ydkFileContents.split('\n'),
    originalValues = {
      main: [],
      side: [],
      extra: [],
    },
    current = '';
  lineSplit = lineSplit.map(function(item) {
    return item.trim();
  });
  try {
    lineSplit.forEach(function(value) {
      if (value === '') {
        return;
      }
      if (!(value[0] === '#' || value[0] === '!')) {
        originalValues[current].push(value);
        return;
      }

      if (originalValues.hasOwnProperty(value.substr(1))) {
        current = value.substr(1);
      }
      return;
    });
  } catch (er) {
    console.log(er);
  }
  return originalValues;
}

function importDeck(file) {
  var deck = makeDeckfromydk(file);

  deck.main = deck.main
    .map(cardid => {
      return findcard({
        id: parseInt(cardid, 10),
      });
    })
    .filter(card => card);
  deck.side = deck.side
    .map(cardid => {
      return findcard({
        id: parseInt(cardid, 10),
      });
    })
    .filter(card => card);
  deck.extra = deck.extra
    .map(cardid => {
      return findcard({
        id: parseInt(cardid, 10),
      });
    })
    .filter(card => card);

  return deck;
}

// shuffle deck

/**
 * Shuffles an array in place, multiple times.
 * @param {Array} array to shuffle
 * @returns {void}
 */
function deepShuffle(array) {
  let currentIndex = array.length,
    randomIndex;

  // While there remain elements to shuffle...
  while (currentIndex) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }

  return array;
}

// draw 5

function drawFive(deck) {
  deepShuffle(deck);
  deepShuffle(deck);

  const hand = deck.slice(0, 5);
  return {
    hand,
    deck,
  };
}

function drawSix(deck) {
  const hand = deck.slice(0, 6);
  return {
    hand,
    deck,
  };
}

// test if it combos into CDED

function cardIs(cat, card) {
  'use strict';
  if (
    cat === 'monster' &&
    (card.race !== 0 || card.level !== 0 || card.attribute !== 0)
  ) {
    return true;
  }
  if (cat === 'monster') {
    return (card.type & 1) === 1;
  }
  if (cat === 'spell') {
    return (card.type & 2) === 2;
  }
  if (cat === 'trap') {
    return (card.type & 4) === 4;
  }
  if (cat === 'fusion') {
    return (card.type & 64) === 64;
  }
  if (cat === 'ritual') {
    return (card.type & 128) === 128;
  }
  if (cat === 'synchro') {
    return (card.type & 8192) === 8192;
  }
  if (cat === 'token') {
    return (card.type & 16400) === 16400;
  }
  if (cat === 'xyz') {
    return (card.type & 8388608) === 8388608;
  }
  if (cat === 'link') {
    if (card.links && card.links.length) {
      return true;
    }
    return (card.type & 0x4000000) === 0x4000000;
  }
}

//SC is setcode in decimal. This handles all possible combinations.
function filterSetcode(card, setcode) {
  var val = card.setcode,
    hexA = val.toString(16),
    hexB = setcode.toString(16);
  if (
    val === setcode ||
    parseInt(hexA.substr(hexA.length - 4), 16) === parseInt(hexB, 16) ||
    parseInt(hexA.substr(hexA.length - 2), 16) === parseInt(hexB, 16) ||
    (val >> 16).toString(16) === hexB
  ) {
    return true;
  } else {
    return false;
  }
}

function isType(card, type) {
  const val = card.type;
  return (val & type) > 0;
}

function identifyStarter(hand) {
  const index = hand.findIndex(
    card =>
      card.id === CYBER_DRAGON_CORE ||
      card.id === CYBER_EMERGENCY ||
      card.id === CYBERDARK_REALM ||
      card.id === CYBERNETIC_HORIZON
  );

  return index !== -1
    ? {
        starter: true,
        index,
      }
    : {
        starter: false,
        index,
      };
}

function getStarter(hand) {
  const starterIndex = identifyStarter(hand);
  const starter = starterIndex.starter ? hand[starterIndex.index] : {};

  if (starterIndex.starter) {
    hand.splice(1, starterIndex.index);
  }

  return {
    starter: true,
    card: starter,
    hand,
  };
}

function containsSpellOrTrap(hand) {
  return hand.some(card => {
    return cardIs('spell', card) || cardIs('trap', card);
  });
}

function checkPowerBond(deck) {
  return deck.some(card => {
    return card.id === POWER_BOND;
  });
}

function checkIsFormOfCyber(card, archetype) {
  const isMachineOrDragon = isType(card, MACHINE) || isType(card, DRAGON);
  const isCyberArchetype = filterSetcode(card, archetype);
  const isMonster = cardIs('Monster', card);

  return isMonster && isMachineOrDragon && isCyberArchetype;
}

function containsCyberMonster(hand, archetype) {
  return hand.some(card => {
    return checkIsFormOfCyber(card, archetype) || card.id === CYBER_EMERGENCY;
  });
}

function containsCyberdarkClaw(hand) {
  return hand.some(card => {
    return card.id === CYBERDARK_CLAW;
  });
}

function containsPseudoComponents(hand) {
  return hand.some(card => {
    return card.id === CYBERDARK_CLAW || card.id === CYBERNETIC_HORIZON || card.id === CYBERDARK_REALM || card.id === CYBERDARK_CANNON;
  });
}

function containsExtraCyberdark(hand) {
  const cybers = hand.filter(card => filterSetcode(card, CYBER_ARCHETYPE));
  const cyberdarks = hand.filter(card =>
    checkIsFormOfCyber(card, CYBERDARK_ARCHETYPE)
  );
  return cybers.legnth >= 2 && cyberdarks.legnth;
}

function canSiegerCombo(starter, deck, hand) {
  if (
    starter.id === CYBER_DRAGON_CORE ||
    starter.id === CYBER_EMERGENCY ||
    starter.id === CYBERNETIC_HORIZON
  ) {
    const isPowerBondInDeck = checkPowerBond(deck);
    const hasSpellTrap = containsSpellOrTrap(hand);
    const hasSpareCyber = containsCyberMonster(hand, CYBER_ARCHETYPE);

    return isPowerBondInDeck && hasSpellTrap && hasSpareCyber;
  }
  return false;
}

function canClawCombo(starter, deck, hand) {
  if (starter.id === CYBERDARK_REALM) {
    const isPowerBondInDeck = checkPowerBond(deck);
    const hasSpellTrap = containsSpellOrTrap(hand);
    const hasSpareCyber =
      containsCyberdarkClaw(hand) || containsExtraCyberdark(hand);

    return isPowerBondInDeck && hasSpellTrap && hasSpareCyber;
  }
  return false;
}

function canPseudoCombo(starter, deck, hand) {
  if (starter.id === CYBER_DRAGON_CORE || starter.id === CYBER_EMERGENCY) {
    const isPowerBondInDeck = checkPowerBond(deck);
    const hasSpellTrap = containsSpellOrTrap(hand);
    const hasSpareCyber = containsPseudoComponents(hand);

    return isPowerBondInDeck && hasSpellTrap && hasSpareCyber;
  }

  return false;
}

function canComboCyberEndDragonWithCore(list) {
  const { hand: initialHand, deck } = drawFive(list.main);
  const { starter, card, hand: handSansStarter } = getStarter(initialHand);

  if (!starter) {
    return false;
  }

  const hasSiegerCombo = canSiegerCombo(card, deck, handSansStarter);
  const hasClawCombo = canClawCombo(card, deck, handSansStarter);
  const hasPseudoCombo = canPseudoCombo(card, deck, handSansStarter);

  return hasSiegerCombo || hasClawCombo || hasPseudoCombo;
}

async function testCyberEndDragonWithCore(fileName, tries = 250) {
  const file = await readDeckFromFile(fileName);
  const deck = importDeck(file);

  let successes = 0;
  let failures = 0;

  for (let i = 0; i < tries; i++) {
    const madeCombo = canComboCyberEndDragonWithCore(deck);
    if (madeCombo) {
      successes++;
    } else {
      failures++;
    }
  }

  return {
    successes,
    failures,
    percentage: `${Number((successes / tries) * 100).toFixed(2)}%`,
  };
}

async function main() {
  program.option('-d, --deck <char>', 'file name of deck to analyze');
  program.option('-t, --tries <number>', 'number of times to test');
  program.parse();

  const options = program.opts();
  const {
    successes,
    failures,
    percentage: CyberdarkEndDragonPercentage,
  } = await testCyberEndDragonWithCore(options.deck, options.tries);

  console.log('Cyberdark End Dragon', CyberdarkEndDragonPercentage);
}

main();
