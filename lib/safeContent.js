const marked = require('marked')

function escapeHTML(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function plainText(value) {
  return String(value == null ? '' : value)
    .replace(/\0/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/</g, '')
}

function decodeLegacyEntities(value) {
  const named = {
    amp: '&', apos: "'", gt: '>', lt: '<', nbsp: '\u00a0', quot: '"'
  }
  let decoded = String(value == null ? '' : value)

  // Some older lesson notes were encoded more than once before being saved.
  for (let pass = 0; pass < 2; pass += 1) {
    const next = decoded.replace(/&(#(?:x[0-9a-f]+|\d+)|amp|apos|gt|lt|nbsp|quot);/gi, (entity, code) => {
      if (code[0] !== '#') return named[code.toLowerCase()]
      const numeric = code[1].toLowerCase() === 'x'
        ? parseInt(code.slice(2), 16)
        : parseInt(code.slice(1), 10)
      if (!Number.isFinite(numeric) || numeric < 0 || numeric > 0x10ffff || (numeric >= 0xd800 && numeric <= 0xdfff)) return entity
      return String.fromCodePoint(numeric)
    })
    if (next === decoded) break
    decoded = next
  }
  return decoded
}

function renderInline(tokens) {
  return (tokens || []).map(token => {
    switch (token.type) {
      case 'text': return token.tokens ? renderInline(token.tokens) : escapeHTML(decodeLegacyEntities(token.text))
      case 'strong': return `<strong>${renderInline(token.tokens)}</strong>`
      case 'em': return `<em>${renderInline(token.tokens)}</em>`
      case 'codespan': return `<code>${escapeHTML(token.text)}</code>`
      case 'br': return '<br>'
      case 'del': return renderInline(token.tokens)
      case 'link': return renderInline(token.tokens)
      case 'image': return escapeHTML(token.text || '')
      case 'escape': return escapeHTML(decodeLegacyEntities(token.text))
      case 'html': return escapeHTML(token.raw || token.text)
      default: return token.tokens ? renderInline(token.tokens) : escapeHTML(token.text || token.raw || '')
    }
  }).join('')
}

function renderBlocks(tokens) {
  return (tokens || []).map(token => {
    switch (token.type) {
      case 'space': return ''
      case 'hr': return '<hr>'
      case 'heading': {
        const depth = Math.min(Math.max(Number(token.depth) || 1, 1), 4)
        return `<h${depth}>${renderInline(token.tokens)}</h${depth}>`
      }
      case 'paragraph': return `<p>${renderInline(token.tokens)}</p>`
      case 'text': return token.tokens ? `<p>${renderInline(token.tokens)}</p>` : `<p>${escapeHTML(token.text)}</p>`
      case 'blockquote': return `<blockquote>${renderBlocks(token.tokens)}</blockquote>`
      case 'code': return `<pre><code>${escapeHTML(token.text)}</code></pre>`
      case 'list': {
        const tag = token.ordered ? 'ol' : 'ul'
        const items = (token.items || []).map(item => `<li>${renderBlocks(item.tokens)}</li>`).join('')
        return `<${tag}>${items}</${tag}>`
      }
      case 'html': return `<p>${escapeHTML(token.raw || token.text)}</p>`
      default: return token.tokens ? renderBlocks(token.tokens) : escapeHTML(token.text || token.raw || '')
    }
  }).join('')
}

function renderSafeMarkdown(value) {
  return renderBlocks(marked.lexer(decodeLegacyEntities(value)))
}

function renderPathMarkdown(value) {
  return renderSafeMarkdown(value)
    .replace(/The Quiet Knot/gi, 'What Hanford noticed')
    .replace(/Quiet Knot/gi, 'What Hanford noticed')
    .replace(/What I Noticed/gi, 'What Hanford noticed')
}

module.exports = {escapeHTML, plainText, renderSafeMarkdown, renderPathMarkdown}
