import { concatAST, printSchema, Source, visit as visitAST } from "graphql";
import { create as createRelaySchema } from "relay-compiler/lib/core/Schema.js";
import { transform as transformToIR } from "relay-compiler/lib/core/RelayParser.js";
import * as InlineFragmentsTransform from "relay-compiler/lib/transforms/InlineFragmentsTransform.js";
import * as IRTransformer from "relay-compiler/lib/core/IRTransformer.js";
import CompilerContext from "relay-compiler/lib/core/CompilerContext.js";
import dedupeJSONStringify from "relay-compiler/lib/util/dedupeJSONStringify.js";
import crypto from "crypto";

import compileRelayArtifacts from "relay-compiler/lib/codegen/compileRelayArtifacts.js";
// import * as InlineFragmentsTransform from "./vendor/relay-compiler-v12.0.0/lib/transforms/InlineFragmentsTransform";
import * as RelayIRTransforms from "relay-compiler/lib/core/RelayIRTransforms.js";

import invariant from "invariant";

const SchemaCache = new WeakMap();

const SCHEMA_EXTENSIONS = `
  directive @connection(key: String!, filter: [String]) on FIELD
`;

// Inline all fragments, including for ReaderFragments, but do not remove them.
const PluginIRTransforms = {
  ...RelayIRTransforms,
  fragmentTransforms: [
    InlineFragmentsTransform.transform,
    ...RelayIRTransforms.fragmentTransforms,
  ],
  codegenTransforms: RelayIRTransforms.codegenTransforms
    .filter((transform) => transform.name !== "generateTypeNameTransform")
    .map((transform) =>
      // FIXME: This isn't actually removing the transform, but unsure what the
      //        ramifications are of removing this now.
      transform.name === "InlineFragmentsTransform"
        ? InlineFragmentsTransform.transform
        : transform
    ),
};

/**
 * Changes the name of the "filter" argument to "filters" to match what
 * relay-compiler expects.
 */
const ConnectionFilterPluralizationTransform = (context) =>
  IRTransformer.transform(context, {
    Directive: (node) =>
      node.name === "connection" &&
      node.args.find((arg) => arg.name === "filter")
        ? {
            ...node,
            args: node.args.map((arg) =>
              arg.name === "filter" ? { ...arg, name: "filters" } : arg
            ),
          }
        : node,
  });

export const plugin = async (schema, documents, config, info) => {
  if (!SchemaCache.has(schema)) {
    SchemaCache.set(
      schema,
      createRelaySchema(
        new Source(SCHEMA_EXTENSIONS + "\n\n" + printSchema(schema))
      )
    );
  }

  const relaySchema = SchemaCache.get(schema);
  const nodes = collectIRNodes(relaySchema, documents, config);

  let compilerContext = new CompilerContext(relaySchema);
  for (const node of nodes) {
    compilerContext = compilerContext.add(node);
  }
  compilerContext = compilerContext.applyTransform(
    ConnectionFilterPluralizationTransform
  );

  const generatedNodes = compileRelayArtifacts(
    compilerContext,
    PluginIRTransforms
  ).map(([_, node]) => node);

  return {
    contents: generatedNodes
      .filter(isNodePartOfMainDocuments(documents))
      .flatMap(generateVariableDefinitions(config))
      .join("\n"),
  };
};

const generateVariableDefinitions = (config) => {
  return (node) => {
    const variable = getVariableName(node, config);
    const json = dedupeJSONStringify(node);
    return [
      `export const ${variable} = ${json};`,
      `${variable}.hash = "${
        isConcreteRequest(node) && node.params.cacheID
          ? // For a ConcreteRequest we can re-use the cacheID and avoid some overhead
            node.params.cacheID
          : // For a ReaderFragment we need to generate a hash ourselves
            crypto.createHash("md5").update(json, "utf8").digest("hex")
      }";`,
    ];
  };
};

function isNodePartOfMainDocuments(documents) {
  const operationsInDocument = documents.flatMap((source) =>
    source.document.definitions
      .filter((def) => def.kind === "OperationDefinition")
      .map((def) => def.name.value)
  );
  const fragmentsInDocument = documents.flatMap((source) =>
    source.document.definitions
      .filter((def) => def.kind === "FragmentDefinition")
      .map((def) => def.name.value)
  );
  return (node) =>
    isConcreteRequest(node)
      ? operationsInDocument.includes(node.operation.name)
      : isReaderFragment(node)
      ? fragmentsInDocument.includes(node.name)
      : false;
}

function isConcreteRequest(node) {
  return node.kind === "Request";
}

function isReaderFragment(node) {
  return node.kind === "Fragment";
}

// TODO: This name faffing in graphql-codegen isn't really clear to me. It
//       would be great if we could just re-use their logic in BaseVisitor, but
//       we don't have graphql-js AST nodes here.
function getVariableName(node, config) {
  if (config.forceVariableName) {
    return config.forceVariableName;
  }
  if (isConcreteRequest(node)) {
    const name = node.operation.name;
    return `${name}${config.documentVariableSuffix || "Document"}`;
  } else if (isReaderFragment(node)) {
    const name = node.name;
    return `${
      config.dedupeOperationSuffix ? name.replace(/Fragment$/, "") : name
    }${config.fragmentVariableSuffix || "FragmentDoc"}`;
  } else {
    throw new Error("Unexpected node type");
  }
}

function collectIRNodes(schema, documents, config) {
  const operationNodes = new Map();
  const fragmentNodes = new Map();

  documents.forEach((doc) => {
    invariant(doc.document, "Expected document to be parsed");
    const docWithTypenames = addTypename(doc.document);
    docWithTypenames.definitions.forEach((definition) => {
      if (definition.kind === "OperationDefinition") {
        addNode(operationNodes, definition, doc.location);
      } else {
        addNode(fragmentNodes, definition, doc.location);
      }
    });
  });

  config?.externalFragments?.forEach((fragment) => {
    addNode(fragmentNodes, fragment.node, fragment.importFrom);
  });

  return transformToIR(schema, [
    ...operationNodes.values(),
    ...fragmentNodes.values(),
  ]);
}

function addNode(nodes, definition, location) {
  const name = definition.name.value;
  invariant(
    nodes.get(name) === undefined ||
      nodes.get(name)?.loc?.source?.name === location,
    "graphql-codegen-relay-ir-plugin: Duplicate definition %s in document %s and %s",
    name,
    location || "unknown",
    nodes.get(name)?.loc?.source?.name || "unknown"
  );
  nodes.set(name, definition);
}

// Doing this on the graphql-js AST for now, because we do the same in our
// patched version of @graphql-codegen/typed-document-node and this will keep
// it in sync more easily.
function addTypename(document) {
  return visitAST(document, {
    SelectionSet: {
      leave(node, _, parent) {
        if (
          parent &&
          !Array.isArray(parent) &&
          parent.kind === "OperationDefinition"
        ) {
          return;
        }
        const { selections } = node;
        if (!selections) {
          return;
        }
        // Check if there already is an unaliased __typename selection
        if (
          selections.some(
            (selection) =>
              selection.kind === "Field" &&
              selection.name.value === "__typename" &&
              selection.alias === undefined
          )
        ) {
          return;
        }
        return {
          ...node,
          selections: [
            ...selections,
            {
              kind: "Field",
              name: {
                kind: "Name",
                value: "__typename",
              },
            },
          ],
        };
      },
    },
  });
}
