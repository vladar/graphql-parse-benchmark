const { parse, print } = require("graphql");
global.xRequire = () => ({ parse });

// `graphql-js` kitchen-sink query:
const queryText = (i) =>
  `query queryName($foo${i}: ComplexType, $site: Site = MOBILE) @onQuery { whoever123is: node(id: [123, 456]) { id ... on User @onInlineFragment { field2 { id alias: field1(first: 10, after: $foo) @include(if: $foo) { id ...frag @onFragmentSpread } } } ... @skip(unless: $foo) { id } ... { id } } } mutation likeStory @onMutation { like(story: 123) @onField { story { id @onField } } } subscription StoryLikeSubscription( $input: StoryLikeSubscribeInput @onVariableDefinition ) @onSubscription { storyLikeSubscribe(input: $input) { story { likers { count } likeSentence { text } } } } fragment frag on Friend @onFragmentDefinition { foo( size: $size bar: $b obj: { key: "value " block:" block string uses" } ) } { unnamed(truthy: true, falsy: false, nullish: null) query } query { __typename }`;

// const queryText = (i) =>
//   `query operationXQuery { chats(id: "${i}") { __typename id title isOneOnOne lastMessage { __typename content originalArrivalTime imDisplayName from id messageType clientMessageId imDisplayName type composeTime containerId parentMessageId version threadType } members { __typename id displayName givenName } isHighImportance isMuted isLastMessageFromMe activeCallsCount datatid displayName hasActiveCalls hasFailedMessages otherMemberMris isSfB isNewChat isBotBlocked isBotUser isFederated isHidden pictureUpn pinnedIndex showAtMention showMarkers tooltipTitle longTitle pictureGroup lastMessageTime messagePreview messagePreviewAria isLastMessageText isMeeting plGroupKey hasActions canBeDiscarded canBotBeBlocked canBePinned canBeMuted canBeLeft canBeHidden canBeFavorited pinnedButtonText pinnedIconSrc favoriteButtonText favoriteIconSrc discardButtonText muteButtonText muteIconSrc blockButtonText hideButtonText hideIconSrc leaveButtonText } }`;

const queryAstJson = (i) =>
  JSON.stringify(parse(queryText(i), { noLocation: true }));

for (let i = 0; i < 1; i++) {
  // parse(`{q}`, { noLocation: true });
}

async function bench(codeFn) {
  let compile = 0;
  let run = 0;
  let lastReturn;
  for (let i = 0; i < 1; i++) {
    const code = codeFn(i);

    const start = performance.now();
    const fn = new Function(code);
    const fnCreated = performance.now();
    lastReturn = fn(i);
    const fnReturned = performance.now();

    compile += fnCreated - start;
    run += fnReturned - fnCreated;

    // TODO: run some other code to evict CPU code cache
    // print(lastReturn);
    // await Promise.resolve();
    // print(lastReturn);
  }
  return { lastReturn, compile, run, total: compile + run };
}

const parseCodeFn = (i) => `
  const { parse } = xRequire("graphql");
  const queryText${i} = '${queryText(i)}';
  const result${i} = parse(queryText${i}, { noLocation: true });
  return result${i};
`;

const parseResult = bench(parseCodeFn);

const preParsedCodeFn = (i) => `
  const result${i} = ${queryAstJson(i)};
  return result${i};
`;

const jsonParseCodeFn = (i) => `
  const result${i} = JSON.parse('${queryAstJson(i)}');
  return result${i};
`;

const preParseResult = bench(preParsedCodeFn);
const jsonParseResult = bench(jsonParseCodeFn);

function render(label, { total, compile, run }) {
  const t = (num) => num.toFixed(4);
  return `${label} ${t(total)} (compile: ${t(compile)}; run: ${t(run)})`;
}

async function run() {
  console.log(``);
  console.log(render("Parsed:    ", await parseResult));
  console.log(render("Pre Parsed:", await preParseResult));
  // console.log(render("JSON Parse:", jsonParseResult));
  console.log(``);

  const allEqual =
    JSON.stringify(parseResult.lastReturn) ===
      JSON.stringify(preParseResult.lastReturn) &&
    JSON.stringify(parseResult.lastReturn) ===
      JSON.stringify(jsonParseResult.lastReturn);

  if (!allEqual) {
    console.log("Sanity-check FAILED: results  are not equal");
    // console.log(`Parsed:`, print(parseResult.lastReturn));
    // console.log(`Pre Parsed:`, print(preParseResult.lastReturn));
  }
}

run().catch(console.error);
