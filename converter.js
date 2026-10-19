/**
 * Cleans Markdown left over from pasted AI text and converts it to HTML.
 * Handles: **bold**, __bold__, *italic*, ***both***, `code`, [links](url),
 * # headings, - / * / + / bullet-character lists (nested), 1. numbered lists,
 * --- separators, and invisible characters.
 */

function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Remove zero-width / invisible characters and non-breaking spaces.
function cleanInvisible(text) {
  return text
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
    .replace(/\u00A0/g, " ")
    .replace(/\r\n?/g, "\n");
}

function inline(raw) {
  let t = escapeHtml(raw);
  t = t.replace(/`([^`\n]+?)`/g, "<code>$1</code>");
  t = t.replace(/\*\*\*(?=\S)(.+?)(?<=\S)\*\*\*/g, "<strong><em>$1</em></strong>");
  t = t.replace(/\*\*(?=\S)(.+?)(?<=\S)\*\*/g, "<strong>$1</strong>");
  t = t.replace(/__(?=\S)(.+?)(?<=\S)__/g, "<strong>$1</strong>");
  t = t.replace(/\*(?=[^\s*])([^*\n]+?)(?<=[^\s*])\*/g, "<em>$1</em>");
  t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>');
  // Remove any stray markers that didn't pair up.
  t = t.replace(/\*\*+/g, "");
  return t;
}

const HEADING_RE = /^\s{0,3}(#{1,6})\s*(.*?)\s*#*\s*$/;
const BULLET_RE = /^(\s*)[*\-+•▪◦‣]\s+(.*)$/;
const NUMBER_RE = /^(\s*)\d+[.)]\s+(.*)$/;
const RULE_RE = /^\s*([-*_])(\s*\1){2,}\s*$/;

function convertToHtml(input) {
  const lines = cleanInvisible(input).split("\n");
  const out = [];
  const stack = []; // open lists: { indent, tag }

  const closeTo = (indent) => {
    while (stack.length && stack[stack.length - 1].indent > indent) {
      out.push(`</li></${stack.pop().tag}>`);
    }
  };

  const addItem = (indent, tag, text) => {
    closeTo(indent);
    const top = stack[stack.length - 1];
    if (top && top.indent === indent) {
      out.push("</li>");
      if (top.tag !== tag) {
        out.push(`</${top.tag}>`);
        stack.pop();
        out.push(`<${tag}>`);
        stack.push({ indent, tag });
      }
    } else {
      out.push(`<${tag}>`);
      stack.push({ indent, tag });
    }
    out.push(`<li>${inline(text)}`);
  };

  const indentOf = (s) => s.replace(/\t/g, "    ").length;

  for (const line of lines) {
    let m;
    if (line.trim() === "") continue; // blank lines don't break a list

    if ((m = line.match(RULE_RE))) {
      closeTo(-1);
      out.push("<hr>");
    } else if ((m = line.match(BULLET_RE))) {
      addItem(indentOf(m[1]), "ul", m[2]);
    } else if ((m = line.match(NUMBER_RE))) {
      addItem(indentOf(m[1]), "ol", m[2]);
    } else if ((m = line.match(HEADING_RE)) && m[2]) {
      closeTo(-1);
      const level = m[1].length;
      const tag = level === 1 ? "h1" : level <= 3 ? "h2" : "h3";
      out.push(`<${tag}>${inline(m[2])}</${tag}>`);
    } else {
      closeTo(-1);
      out.push(`<p>${inline(line.trim())}</p>`);
    }
  }
  closeTo(-1);
  return out.join("\n");
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { convertToHtml };

  // Run `node converter.js` to see a sample.
  if (require.main === module) {
    const sample = [
      "### Shopping Day",
      "This is **important**, *slightly* odd, and **also bold** on one line.",
      "",
      "* **Milk:** from the shop",
      "  * Full cream",
      "* Bread",
      "",
      "1. First step",
      "2. Second step",
      "---",
    ].join("\n");
    console.log(convertToHtml(sample));
  }
}
