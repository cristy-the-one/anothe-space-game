// Wave: array of spawn groups. Each group: { type, count, xRange, yRange, delay }
// delay = seconds after wave start to spawn this group

const LEVELS = [
  { // Level 1
    waves: [
      [{ type:'grunt',    count:5, xRange:[-4,4], yRange:[-2,2], delay:0 }],
      [{ type:'grunt',    count:4, xRange:[-5,5], yRange:[-3,3], delay:0 },
       { type:'weaver',   count:2, xRange:[-3,3], yRange:[-1,1], delay:1.5 }],
      [{ type:'weaver',   count:5, xRange:[-4,4], yRange:[-2,2], delay:0 }],
      [{ type:'shooter',  count:3, xRange:[-4,4], yRange:[-2,2], delay:0 },
       { type:'grunt',    count:3, xRange:[-3,3], yRange:[-1,1], delay:2 }],
      [{ type:'kamikaze', count:4, xRange:[-4,4], yRange:[-2,2], delay:0 },
       { type:'grunt',    count:4, xRange:[-5,5], yRange:[-3,3], delay:1 }],
    ]
  },
  { // Level 2
    waves: [
      [{ type:'grunt',    count:6, xRange:[-5,5], yRange:[-3,3], delay:0 },
       { type:'weaver',   count:3, xRange:[-3,3], yRange:[-2,2], delay:1 }],
      [{ type:'weaver',   count:5, xRange:[-5,5], yRange:[-3,3], delay:0 },
       { type:'shooter',  count:2, xRange:[-3,3], yRange:[-1,1], delay:0 }],
      [{ type:'shooter',  count:4, xRange:[-5,5], yRange:[-2,2], delay:0 },
       { type:'kamikaze', count:3, xRange:[-4,4], yRange:[-2,2], delay:2 }],
      [{ type:'kamikaze', count:5, xRange:[-5,5], yRange:[-3,3], delay:0 }],
      [{ type:'grunt',    count:5, xRange:[-5,5], yRange:[-3,3], delay:0 },
       { type:'weaver',   count:3, xRange:[-3,3], yRange:[-2,2], delay:1 },
       { type:'kamikaze', count:3, xRange:[-4,4], yRange:[-2,2], delay:2 }],
    ]
  },
  { // Level 3
    waves: [
      [{ type:'weaver',   count:6, xRange:[-5,5], yRange:[-3,3], delay:0 },
       { type:'shooter',  count:3, xRange:[-4,4], yRange:[-2,2], delay:1 }],
      [{ type:'kamikaze', count:6, xRange:[-5,5], yRange:[-3,3], delay:0 },
       { type:'grunt',    count:4, xRange:[-3,3], yRange:[-2,2], delay:1.5 }],
      [{ type:'shooter',  count:5, xRange:[-5,5], yRange:[-3,3], delay:0 },
       { type:'weaver',   count:4, xRange:[-4,4], yRange:[-2,2], delay:1 }],
      [{ type:'kamikaze', count:7, xRange:[-5,5], yRange:[-3,3], delay:0 },
       { type:'shooter',  count:3, xRange:[-3,3], yRange:[-2,2], delay:2 }],
      [{ type:'grunt',    count:6, xRange:[-5,5], yRange:[-3,3], delay:0 },
       { type:'weaver',   count:5, xRange:[-4,4], yRange:[-2,2], delay:1 },
       { type:'shooter',  count:4, xRange:[-3,3], yRange:[-2,2], delay:2 },
       { type:'kamikaze', count:3, xRange:[-4,4], yRange:[-2,2], delay:3 }],
    ]
  },
];

export function createWaveSequencer(onSpawn) {
  let levelIdx = 0;
  let waveIdx = 0;
  let pendingSpawns = []; // { type, x, y, at_time }
  let waveStartTime = 0;
  let waitingForClear = false;

  function rand(min, max) { return min + Math.random() * (max - min); }

  function loadWave(li, wi) {
    const groups = LEVELS[li].waves[wi];
    waveStartTime = 0; // reset local timer
    pendingSpawns = [];
    for (const g of groups) {
      for (let i = 0; i < g.count; i++) {
        pendingSpawns.push({
          type: g.type,
          x: rand(g.xRange[0], g.xRange[1]),
          y: rand(g.yRange[0], g.yRange[1]),
          at: g.delay + i * 0.4,
        });
      }
    }
    pendingSpawns.sort((a, b) => a.at - b.at);
  }

  loadWave(0, 0);

  return {
    get levelNumber() { return levelIdx + 1; },
    get waveNumber()  { return Math.min(waveIdx, LEVELS[levelIdx].waves.length - 1) + 1; },
    get totalWaves()  { return LEVELS[levelIdx].waves.length; },
    get isBossTime()  { return waveIdx >= LEVELS[levelIdx].waves.length; },
    get isLastLevel() { return levelIdx >= LEVELS.length - 1; },

    update(dt, enemyCount) {
      waveStartTime += dt;

      // Spawn pending enemies
      while (pendingSpawns.length && pendingSpawns[0].at <= waveStartTime) {
        const s = pendingSpawns.shift();
        onSpawn(s.type, s.x, s.y);
      }

      // Wave complete when all spawned and all dead
      if (pendingSpawns.length === 0 && enemyCount === 0 && !waitingForClear) {
        waitingForClear = true;
        return 'wave_clear';
      }
      return null;
    },

    nextWave() {
      waitingForClear = false;
      waveIdx++;
      if (waveIdx < LEVELS[levelIdx].waves.length) {
        loadWave(levelIdx, waveIdx);
        return 'wave';
      }
      return 'boss_time'; // all waves done — trigger boss
    },

    nextLevel() {
      levelIdx++;
      waveIdx = 0;
      waitingForClear = false;
      if (levelIdx < LEVELS.length) {
        loadWave(levelIdx, waveIdx);
        return 'level';
      }
      return 'victory'; // all levels done
    },

    reset() {
      levelIdx = 0; waveIdx = 0; waveStartTime = 0;
      waitingForClear = false;
      pendingSpawns = [];
      loadWave(0, 0);
    },
  };
}
