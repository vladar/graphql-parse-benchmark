const fs = require("fs");
const path = require("path");
const { ChartJSNodeCanvas } = require("chartjs-node-canvas");
const { formats: formatsConfig } = require("./formats");

const width = 800; //px
const height = 600; //px

const chartCallback = (ChartJS) => {
  // Disable animations
  // ChartJS.defaults.animation = false;
};

const formats = Object.keys(formatsConfig);
const resultsPath = path.join(__dirname, "results");

const allResults = {};
formats.forEach((format) => {
  allResults[format] = JSON.parse(
    fs.readFileSync(path.join(resultsPath, `${format}.json`))
  );
});

async function plotChunkLoad(includeEvalTime = false) {
  const data = formats.map((format) => {
    return {
      label: format,
      data: includeEvalTime
        ? allResults[format].chunkEvalTimes
        : allResults[format].chunkLoadTimes,
      fill: false,
      borderColor: formatsConfig[format].color,
    };
  });

  const configuration = {
    type: "line",
    data: {
      labels: Array.from({ length: data[0].data.length }, (_, i) => i + 1),
      datasets: data,
    },
    options: {
      responsive: true,
      title: {
        display: true,
        text: includeEvalTime
          ? "Chunk Load and Eval Time by Format"
          : "Chunk Load Time by Format",
      },
      scales: {
        x: {
          display: true,
          scaleLabel: {
            display: true,
            labelString: "Chunk",
          },
        },
        y: {
          display: true,
          scaleLabel: {
            display: true,
            labelString: "Time (ms)",
          },
        },
      },
    },
  };

  const chartJSNodeCanvas = new ChartJSNodeCanvas({
    width,
    height,
    // chartCallback,
  });

  const chartFilename = includeEvalTime
    ? "chart-chunks-eval-time.png"
    : "chart-chunks-load-time.png";

  const image = await chartJSNodeCanvas.renderToBuffer(configuration);
  fs.writeFileSync(path.join(resultsPath, chartFilename), image);

  console.log(`${chartFilename} saved in ./results folder`);
}

async function plotTotalTime() {
  // const data = [
  //   {
  //     label: "Example 1",
  //     totalTime: 22.58720000088215,
  //     totalLoadTime: 22.216600004583597,
  //   },
  //   {
  //     label: "Example 2",
  //     totalTime: 20.58720000088215,
  //     totalLoadTime: 18.216600004583597,
  //   },
  // ];

  const data = formats.map((format) => allResults[format]);

  const configuration = {
    type: "bar",
    data: {
      labels: formats,
      datasets: [
        {
          label: "Load Time",
          data: data.map((item) => item.totalLoadTime),
          backgroundColor: "rgba(75, 192, 192, 0.2)",
          borderColor: "rgba(75, 192, 192, 1)",
          borderWidth: 1,
        },
        {
          label: "Read Time",
          data: data.map((item) => item.totalTime - item.totalLoadTime),
          backgroundColor: "rgba(255, 206, 86, 0.2)",
          borderColor: "rgba(255, 206, 86, 1)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      title: {
        display: true,
        text: "Total Time vs Load Time",
      },
      scales: {
        x: {
          stacked: true,
        },

        y: {
          stacked: true,
        },
      },
    },
  };

  const chartJSNodeCanvas = new ChartJSNodeCanvas({
    width,
    height,
    // chartCallback,
  });

  const image = await chartJSNodeCanvas.renderToBuffer(configuration);

  const chartFilename = "chart-latency.png";
  fs.writeFileSync(path.join(__dirname, "results", chartFilename), image);
  console.log(`${chartFilename} saved in ./results folder`);
}

async function plotTotalMemory() {
  // const data = [
  //   {
  //     label: "Example 1",
  //     totalTime: 22.58720000088215,
  //     totalLoadTime: 22.216600004583597,
  //   },
  //   {
  //     label: "Example 2",
  //     totalTime: 20.58720000088215,
  //     totalLoadTime: 18.216600004583597,
  //   },
  // ];

  const data = formats.map((format) => allResults[format]);

  const configuration = {
    type: "bar",
    data: {
      labels: formats,
      datasets: [
        {
          label: "Final Heap (after GC)",
          data: data.map((item) => item.finalHeapAfterGC),
          backgroundColor: "rgba(255, 206, 86, 0.2)",
          borderColor: "rgba(255, 206, 86, 1)",
          borderWidth: 1,
        },
        {
          label: "Final Heap (before GC)",
          data: data.map((item) => item.finalHeap - item.finalHeapAfterGC),
          backgroundColor: "rgba(75, 192, 192, 0.2)",
          borderColor: "rgba(75, 192, 192, 1)",
          borderWidth: 1,
        },
        {
          label: "Peak heap",
          data: data.map((item) => item.peakHeap - item.finalHeap),
          backgroundColor: "rgba(132, 199, 114, 0.2)",
          borderColor: "rgb(132, 199, 114)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      title: {
        display: true,
        text: "Memory usage",
      },
      scales: {
        x: {
          stacked: true,
        },

        y: {
          stacked: true,
        },
      },
    },
  };

  const chartJSNodeCanvas = new ChartJSNodeCanvas({
    width,
    height,
    // chartCallback,
  });

  const image = await chartJSNodeCanvas.renderToBuffer(configuration);

  const chartFilename = "chart-memory.png";
  fs.writeFileSync(path.join(__dirname, "results", chartFilename), image);
  console.log(`${chartFilename} saved in ./results folder`);
}

(async () => {
  await plotChunkLoad(true);
  await plotChunkLoad(false);
  await plotTotalTime();
  await plotTotalMemory();
})();
