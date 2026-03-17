await new Promise(r => setTimeout(r, 50));
import { calcMultiplier, addKill } from '../src/score.js';

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
