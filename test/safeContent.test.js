const assert = require('assert')
const {plainText, renderSafeMarkdown, renderPathMarkdown} = require('../lib/safeContent')

const malicious = [
  '<script>alert(1)</script>',
  '<img src=x onerror=alert(1)>',
  '[open me](javascript:alert(1))',
  '<svg><a href="javascript:alert(1)">bad</a></svg>'
]

for (const input of malicious) {
  const output = renderSafeMarkdown(input)
  assert(!/<(?:script|img|svg|a)(?:\s|>)/i.test(output), `Unsafe output for: ${input}`)
}

const lesson = renderSafeMarkdown('# This week\n\n1. Play slowly\n2. Listen closely\n\n**Aim:** a calm pulse.\n\n> Keep breathing.')
assert(lesson.includes('<h1>This week</h1>'))
assert(lesson.includes('<ol>'))
assert(lesson.includes('<strong>Aim:</strong>'))
assert(lesson.includes('<blockquote>'))
assert.strictEqual(plainText('Keep <b>steady</b>\0'), 'Keep steady')
assert.strictEqual(plainText('> Listen inwardly'), '> Listen inwardly')

const specialCharacters = renderSafeMarkdown('Hanford&amp;#39;s idea: Debussy&#8217;s r\u00eave \u2014 pi\u00f9 \u266f')
assert(specialCharacters.includes("Hanford&#039;s idea: Debussy\u2019s r\u00eave \u2014 pi\u00f9 \u266f"))

const encodedMarkup = renderSafeMarkdown('&lt;script&gt;alert(1)&lt;/script&gt;')
assert(!encodedMarkup.includes('<script>'))
assert(encodedMarkup.includes('&lt;script&gt;'))

const legacyPath = renderPathMarkdown('# The Quiet Knot\n\nSomething became easier.')
assert(legacyPath.includes('<h1>What Hanford noticed</h1>'))
assert(!legacyPath.includes('Quiet Knot'))

const previousObservationPath = renderPathMarkdown('## What I Noticed\n\nA more settled pulse.')
assert(previousObservationPath.includes('<h2>What Hanford noticed</h2>'))
assert(!previousObservationPath.includes('What I Noticed'))

console.log('safeContent tests passed')
