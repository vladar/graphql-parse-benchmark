const queriesPerChunk = 20;
const chunksPerFormat = 10;
const warmupChunks = 0;

const schemaSDL = `
  type Query {
    foo(index: Int): String
    chats(salt: Int): [Chat]
  }

  type Chat {
    id: ID
    title: String
    isOneOnOne: String
    lastMessage: Message
    members: [Member!]
    isHighImportance: String
    isMuted: String
    isLastMessageFromMe: String
    activeCallsCount: String
    datatid: String
    displayName: String
    hasActiveCalls: String
    hasFailedMessages: String
    otherMemberMris: String
    isSfB: String
    isNewChat: String
    isBotBlocked: String
    isBotUser: String
    isFederated: String
    isHidden: String
    pictureUpn: String
    pinnedIndex: String
    showAtMention: String
    showMarkers: String
    tooltipTitle: String
    longTitle: String
    pictureGroup: String
    lastMessageTime: String
    messagePreview: String
    messagePreviewAria: String
    isLastMessageText: String
    isMeeting: String
    plGroupKey: String
    hasActions: String
    canBeDiscarded: String
    canBotBeBlocked: String
    canBePinned: String
    canBeMuted: String
    canBeLeft: String
    canBeHidden: String
    canBeFavorited: String
    pinnedButtonText: String
    pinnedIconSrc: String
    favoriteButtonText: String
    favoriteIconSrc: String
    discardButtonText: String
    muteButtonText: String
    muteIconSrc: String
    blockButtonText: String
    hideButtonText: String
    hideIconSrc: String
    leaveButtonText: String
  }

  type Message {
    id: ID!
    content: String
    originalArrivalTime: String
    from: String
    messageType: String
    clientMessageId: String
    imDisplayName: String
    type: String
    composeTime: String
    containerId: String
    parentMessageId: String
    version: String
    threadType: String
  }

  type Member {
    id: ID!
    displayName: String
    givenName: String
  }
`;

const queryTemplates = [
  // (i) => `query queryName${i} { foo(index: ${i}) }`,
  // (i) =>
  //   `query queryName${i} ($foo${i}: ComplexType, $site: Site = MOBILE) @onQuery { whoever123is: node(id: [123, 456]) { id ... on User @onInlineFragment { field2 { id alias: field1(first: 10, after: $foo) @include(if: $foo) { id ...frag @onFragmentSpread } } } ... @skip(unless: $foo) { id } ... { id } } } mutation likeStory @onMutation { like(story: 123) @onField { story { id @onField } } } subscription StoryLikeSubscription( $input: StoryLikeSubscribeInput @onVariableDefinition ) @onSubscription { storyLikeSubscribe(input: $input) { story { likers { count } likeSentence { text } } } } fragment frag on Friend @onFragmentDefinition { foo( size: $size bar: $b obj: { key: "value " block:" block string uses" } ) } { unnamed(truthy: true, falsy: false, nullish: null) query } query { __typename }`,
  (i) => `
  query chatList${i} {
    chats(salt: ${i}) {
      __typename
      id
      title
      isOneOnOne
      lastMessage {
        __typename
        content
        originalArrivalTime
        imDisplayName
        from
        id

        messageType
        clientMessageId
        imDisplayName
        type
        composeTime
        containerId
        parentMessageId
        version
        threadType
      }
      members {
        __typename
        id
        displayName
        givenName
      }
      isHighImportance
      isMuted
      isLastMessageFromMe
      activeCallsCount
      datatid
      displayName
      hasActiveCalls
      hasFailedMessages
      otherMemberMris
      isSfB
      isNewChat
      isBotBlocked
      isBotUser
      isFederated
      isHidden
      pictureUpn
      pinnedIndex
      showAtMention
      showMarkers
      tooltipTitle
      longTitle
      pictureGroup
      lastMessageTime
      messagePreview
      messagePreviewAria
      isLastMessageText
      isMeeting
      plGroupKey
      hasActions
      canBeDiscarded
      canBotBeBlocked
      canBePinned
      canBeMuted
      canBeLeft
      canBeHidden
      canBeFavorited
      pinnedButtonText
      pinnedIconSrc
      favoriteButtonText
      favoriteIconSrc
      discardButtonText
      muteButtonText
      muteIconSrc
      blockButtonText
      hideButtonText
      hideIconSrc
      leaveButtonText
    }
  }
  `,
];

module.exports = {
  queryTemplates,
  queriesPerChunk,
  chunksPerFormat,
  warmupChunks,
  schemaSDL,
};
