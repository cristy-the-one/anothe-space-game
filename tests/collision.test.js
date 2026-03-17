// Waits for assert/describe to be available
await new Promise(r => setTimeout(r, 50));
import { aabbOverlap } from '../src/collision.js';

describe('AABB Collision');
assert('overlapping boxes return true',
  aabbOverlap({x:0,y:0,hw:1,hh:1}, {x:0.5,y:0,hw:1,hh:1}));
assert('non-overlapping boxes return false',
  !aabbOverlap({x:0,y:0,hw:1,hh:1}, {x:3,y:0,hw:1,hh:1}));
assert('touching edges return false',
  !aabbOverlap({x:0,y:0,hw:1,hh:1}, {x:2,y:0,hw:1,hh:1}));
assert('Y-axis gap returns false',
  !aabbOverlap({x:0,y:0,hw:1,hh:1}, {x:0,y:3,hw:1,hh:1}));
