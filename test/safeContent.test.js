const assert = require('assert')
const {plainText, renderSafeMarkdown} = require('../lib/safeContent')

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

console.log('safeContent tests passed')
