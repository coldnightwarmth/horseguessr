export type HorseQuote = {
  text: string
  author: string
  work: string
  source: string
}

// Short, source-linked excerpts selected from literary and archival pages.
// The homepage chooses one deterministically from the Central-time date key.
export const horseQuotes: HorseQuote[] = [
  {
    text: 'Good places make good horses.',
    author: 'Anna Sewell',
    work: 'Black Beauty',
    source: 'https://www.gutenberg.org/files/271/271-h/271-h.htm',
  },
  {
    text: 'Then can no horse with my desire keep pace.',
    author: 'William Shakespeare',
    work: 'Sonnet 51',
    source: 'https://www.folger.edu/explore/shakespeares-works/shakespeares-sonnets/read/51/',
  },
  {
    text: 'When I bestride him, I soar; I am a hawk; he trots the air.',
    author: 'William Shakespeare',
    work: 'Henry V',
    source: 'https://www.folger.edu/explore/shakespeares-works/henry-v/read/3/7/',
  },
  {
    text: 'There’s nothing so good for the inside of a person as the outside of a horse.',
    author: 'Ronald Reagan',
    work: 'White House remarks, 1982',
    source: 'https://www.reaganlibrary.gov/archives/speech/remarks-white-house-barbecue-professional-rodeo-cowboy-association',
  },
  {
    text: 'Hitch your wagon to a star.',
    author: 'Ralph Waldo Emerson',
    work: 'Society and Solitude',
    source: 'https://www.gutenberg.org/files/69258/old/69258-h/69258-h.htm',
  },
  {
    text: 'Their hung heads patient as the horizons.',
    author: 'Ted Hughes',
    work: 'The Horses',
    source: 'https://www.poetryfoundation.org/poems/161873/the-horses',
  },
  {
    text: 'She had horses who called themselves, “horse.”',
    author: 'Joy Harjo',
    work: 'She Had Some Horses',
    source: 'https://www.poetryfoundation.org/poems/141852/she-had-some-horses-590104cf40742',
  },
  {
    text: 'O, for a horse with wings!',
    author: 'William Shakespeare',
    work: 'Cymbeline',
    source: 'https://www.folger.edu/blogs/shakespeare-and-beyond/famous-quotes-from-cymbeline/',
  },
]
