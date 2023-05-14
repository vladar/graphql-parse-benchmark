# Overview

We are interested to see how long it takes to:

1. Load and parse JS chunks, containing GraphQL executable documents in different formats
2. See how long it takes to fully-load each individual chunk (some formats may be lazy-loaded)

## Tested formats

### Inline GraphQL AST object

```js
export const result1 = { kind: "Document", definitions: [/* generated AST definitions here */] };
```

### GraphQL AST as JSON

```js
export const result1 = JSON.parse('{ kind: "Document", definitions: [...] }');
```

### Lazily parsed GraphQL AST

```js
const graphqlQuery1 = "...";
export const result1 = {
  kind: "Document",
  get definitions() {
    return (
      this.__defs ??
      (this.__defs = parse(graphqlQuery1, { noLocation: true }).definitions)
    );
  },
};
// ... etc;
```

### Eagerly parsed GraphQL AST

```js
const graphqlQuery1 = "...";
export const result1 = parse(graphqlQuery1, { noLocation: true });
```

## Benchmark design

Benchmark contains two steps: CLI for code-generation and runtime.

### Code Generator

Generator CLI script relies on 3 hardcoded variables:

1. List of query template functions
2. Total number of each query per chunk
3. Total number of chunks per GraphQL format

Query template function looks like this (expected to return GraphQL query string):

```js
const queryTemplate1 = (i) => `query { foo${i} }`;
```

As output, script produces JS chunk files on disk:

```
.
[generated]/
  [inline-graphql-ast]/
    chunk1.js
    chunk2.js
    ...
  [graphql-ast-as-json]/
    chunk1.js
    chunk2.js
    ...
  [lazy-graphql-ast]/
    chunk1.js
    chunk2.js
    ...
  [eager-graphql-ast]/
    chunk1.js
    chunk2.js
    ...
```

Each chunk exports multiple variables - one variable per generated graphql query.
So if there were `3` query templates and total number of each query per chunk is `4`, chunk
will contain `12` exports (with unique generated queries).

### Runtime

Benchmark runs tests for each format in a separate NodeJS process one-by-one (i.e. sequentially).

For each tested format, benchmark loads JS chunks one-by-one sequentially and measures:

1. Time it takes to load every chunk
2. Time it takes to read every graphql query in the chunk (using hardcoded function `read` defined separately for each tested format)

In the end, aggregated stats for each format includes:

1. Total time it took to load all chunks
2. An array of load time per chunk
3. For each chunk: an array of read times per query
4. Peak JS heap size, final JS heap size

Those aggregated results should be stored in `./results` folder as JSON file
