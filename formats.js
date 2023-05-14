const { parse } = require("graphql");
const { queryTemplates } = require("./config");

const readAst = (value) => {
  const defs = value.definitions;
  if (!defs.length || defs.length === 0 || !defs[0].kind) {
    throw new Error("Incorrect document");
  }
};

const parseLazyFormat = {
  color: "#73c27c",
  read: readAst,
  header() {
    return `
import { parse } from "graphql";
const opts = { noLocation: true };
const defs = (q) => parse(q, opts).definitions;
`;
  },
  exportEntry(exportVar, queryStr) {
    return `
const ${exportVar}Str = \`${queryStr}\`;
export const ${exportVar} = { kind: "Document", get definitions() { return this.__defs ?? (this.__defs = defs(${exportVar}Str)); }};
`;
  },
  setGlobals(global) {
    // pre-load
    require("graphql");
  },
};

const parseLazyOptimizedFormat = {
  color: "#0fbb59",
  read: readAst,
  header() {
    return `
const defs = global.gqlDefs
`;
  },
  exportEntry(exportVar, queryStr) {
    const optimizedQueryStr = queryStr.replace(/[\r\n\s]+/g, " ");

    return `
const ${exportVar}Str = \`${optimizedQueryStr}\`;
export const ${exportVar} = { kind: "Document", get definitions() { return defs("${exportVar}", ${exportVar}Str); }};
`;
  },
  setGlobals(global) {
    const opts = { noLocation: true };
    global.gqlDefs = (queryKey, queryStr) => parse(queryStr, opts).definitions;
    parse(`{ foo }`, opts);
  },
};

const parseEagerFormat = {
  color: "#d36eb0",
  read: readAst,
  header() {
    return `
import { parse } from "graphql";
const opts = { noLocation: true };
`;
  },
  exportEntry(exportVar, queryStr) {
    return `
const ${exportVar}Str = \`${queryStr}\`;
export const ${exportVar} = parse(${exportVar}Str, opts);
`;
  },
  setGlobals(global) {
    const { parse } = require("graphql");
    // global.xParse = parse;
  },
};

const relayCompilerFormat = {
  color: "#d36eb0",
  read: (value) => {
    if (!value.kind || !value.hash) {
      throw new Error("Incorrect Relay IR");
    }
  },
  async exportEntry(exportVar, queryStr) {
    const { schemaSDL } = require("./config");
    const { parse, buildSchema } = require("graphql");
    const { plugin } = await import("./relay-tools/relay-print.mjs");
    const queryAst = parse(queryStr);

    if (!this.__schema) {
      this.__schema = buildSchema(schemaSDL);
    }
    const result = await plugin(this.__schema, [{ document: queryAst }], {
      forceVariableName: exportVar,
    });
    return result.contents + "\n";
    // console.log(result);
  },
  setGlobals(global) {
    // const { parse } = require("graphql");
    // global.xParse = parse;
  },
};

const jsonParseFormat = {
  read: readAst,
  color: "#6ed3c7",
  exportEntry(exportVar, queryStr) {
    const { parse } = require("graphql");
    const ast = parse(queryStr, { noLocation: true });
    const json = JSON.stringify(ast);
    return `export const ${exportVar} = JSON.parse('${json}');`;
  },
};

const literalFormat = {
  color: "#5888BFFF",
  read: readAst,
  exportEntry(exportVar, queryStr) {
    const { parse } = require("graphql");
    const ast = parse(queryStr, { noLocation: true });
    return `export const ${exportVar} = ${JSON.stringify(ast)};`;
  },
};

const exportVarName = (queryEntryIndex, queryTemplateIndex) =>
  `result${queryEntryIndex * queryTemplates.length + queryTemplateIndex}`;

const formats = {
  // "json-parse": jsonParseFormat,
  // "parse-lazy": parseLazyFormat,
  "parse-lazy-optimized": parseLazyOptimizedFormat,
  "parse-eager": parseEagerFormat,
  literal: literalFormat,
  "relay-ir": relayCompilerFormat,
};

module.exports = {
  formats,
  exportVarName,
};
