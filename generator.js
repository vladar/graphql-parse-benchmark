const fs = require("fs");
const path = require("path");
const { formats: allFormats, exportVarName } = require("./formats.js");
const {
  chunksPerFormat,
  queriesPerChunk,
  queryTemplates,
} = require("./config.js");

const formats = Object.keys(allFormats);

formats.forEach(async (format) => {
  const formatPath = path.join(__dirname, "generated", format);
  fs.mkdirSync(formatPath, { recursive: true });

  const formatConfig = allFormats[format];

  for (let chunk = 0; chunk < chunksPerFormat; chunk++) {
    let content = "";

    if (formatConfig.header) {
      content += await formatConfig.header();
    }

    for (let query = 0; query < queriesPerChunk; query++) {
      for (let template = 0; template < queryTemplates.length; template++) {
        const queryStr = queryTemplates[template](query);
        const exportVar = exportVarName(query, template);

        content += await formatConfig.exportEntry(exportVar, queryStr);
      }
    }
    fs.writeFileSync(path.join(formatPath, `chunk${chunk}.mjs`), content);
  }
});
