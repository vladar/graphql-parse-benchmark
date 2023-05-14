const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { formats: formatsConfig } = require("./formats.js");

const formats = Object.keys(formatsConfig);
const resultsPath = path.join(__dirname, "results");

for (const format of formats) {
  console.log(`Running benchmark for format: ${format}`);
  const command = `node --expose-gc  benchmarkRunner.js ${format}`;

  const output = execSync(command).toString();
  fs.writeFileSync(path.join(resultsPath, `${format}.json`), output);
}

console.log("All benchmarks completed.");
