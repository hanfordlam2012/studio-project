const assert = require('assert')
const studioPostMedia = require('../lib/studioPostMedia')

assert.strictEqual(studioPostMedia('https://youtu.be/zhUdsJw0IBo').type, 'youtube')
assert.strictEqual(studioPostMedia('https://www.youtube.com/watch?v=zhUdsJw0IBo').id, 'zhUdsJw0IBo')
assert.strictEqual(studioPostMedia('https://example.com/phrase.m4a?download=1').type, 'audio')
assert.strictEqual(studioPostMedia('https://example.com/performance.webm').type, 'video')
assert.strictEqual(studioPostMedia('https://example.com/listen').type, 'link')
assert.strictEqual(studioPostMedia(''), null)

console.log('Studio Post media tests passed')
