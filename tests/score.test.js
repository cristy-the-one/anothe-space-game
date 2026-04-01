await new Promise(r => setTimeout(r, 50));
import { calcMultiplier, addKill } from '../src/score.js';
import { state, resetForNewGame } from '../src/state.js';

describe('Score Multiplier');
// After 0-4 kills, multiplier stays x1
assert('0 kills = x1', calcMultiplier(0) === 1);
assert('4 kills = x1', calcMultiplier(4) === 1);
// After 5 kills, multiplier becomes x2
assert('5 kills = x2', calcMultiplier(5) === 2);
assert('9 kills = x2', calcMultiplier(9) === 2);
// After 10 kills, multiplier becomes x4
assert('10 kills = x4', calcMultiplier(10) === 4);
assert('20 kills = x4', calcMultiplier(20) === 4);

describe('addKill');
// Reset state before testing
state.score = 0;
state.killStreak = 0;
state.lastKillTime = 0;
state.multiplier = 1;
addKill('grunt', Date.now());
assert('addKill awards grunt points (10)', state.score === 10);
addKill('boss', Date.now());
assert('addKill awards boss points (500 * x1 streak)', state.score === 510);
state.score = 0;
state.killStreak = 0;
state.lastKillTime = 0;
state.multiplier = 1;
addKill('kamikaze', Date.now());
assert('addKill awards kamikaze points (50)', state.score === 50);

describe('state.shakeIntensity');
assert('initializes to 0', state.shakeIntensity === 0);
state.shakeIntensity = 0.5;
resetForNewGame();
assert('resetForNewGame resets shakeIntensity to 0', state.shakeIntensity === 0);
