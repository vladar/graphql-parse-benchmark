const { performance } = require("perf_hooks");
const { formats, exportVarName } = require("./formats.js");
const {
  chunksPerFormat,
  queriesPerChunk,
  queryTemplates,
  warmupChunks,
} = require("./config.js");

async function runBenchmark(format) {
  const { read, setGlobals } = formats[format];

  if (setGlobals) {
    setGlobals(global);
  }

  let peakHeap = 0;
  let totalTime = 0;
  let totalLoadTime = 0;
  let chunkLoadTimes = [];
  let chunkReadTimes = [];
  let chunkEvalTimes = [];

  // Warmup:
  for (let chunk = 0; chunk < warmupChunks; chunk++) {
    const chunkPath = `./generated/${format}/chunk${chunk}.mjs`;
    const chunkModule = await import(chunkPath);
    for (let query = 0; query < queriesPerChunk; query++) {
      for (let template = 0; template < queryTemplates.length; template++) {
        const queryName = exportVarName(query, template);
        global.BENCHMARK_TMP = read(chunkModule[queryName]);
      }
    }
  }

  // Run:
  const start = performance.now();
  for (let chunk = warmupChunks; chunk < chunksPerFormat; chunk++) {
    const chunkPath = `./generated/${format}/chunk${chunk}.mjs`;

    const loadStart = performance.now();
    const chunkModule = await import(chunkPath);

    const loadEnd = performance.now();
    const chunkLoadTime = loadEnd - loadStart;
    totalLoadTime += chunkLoadTime;
    chunkLoadTimes.push(chunkLoadTime);

    let readTimes = [];
    for (let query = 0; query < queriesPerChunk; query++) {
      for (let template = 0; template < queryTemplates.length; template++) {
        const exportedVarName = exportVarName(query, template);
        const readStart = performance.now();
        global.BENCHMARK_TMP = read(chunkModule[exportedVarName]);
        const readEnd = performance.now();
        readTimes.push(readEnd - readStart);
        const { heapTotal } = process.memoryUsage();
        peakHeap = Math.max(peakHeap, heapTotal);
      }
    }
    chunkReadTimes.push(readTimes);
    chunkEvalTimes.push(performance.now() - loadStart);
  }
  totalTime = performance.now() - start;
  global.BENCHMARK_TMP = undefined;

  const memoryUsage = process.memoryUsage();
  const stats = {
    totalTime,
    totalLoadTime,
    chunkLoadTimes,
    chunkEvalTimes,
    peakHeap,
    finalHeap: memoryUsage.heapUsed,
    finalHeapAfterGC: 0,
    chunkReadTimes,
  };

  if (global.gc) {
    global.gc();
    stats.finalHeapAfterGC = process.memoryUsage().heapUsed;
  }

  return stats;
}

async function runBenchmarkAndReport(format) {
  const stats = await runBenchmark(format);
  console.log(JSON.stringify(stats, null, 2));
}

const inputFormat = process.argv[2];

if (!formats[inputFormat]) {
  throw new Error(`Unsupported format: ${inputFormat}`);
}

runBenchmarkAndReport(inputFormat).catch(console.error);
