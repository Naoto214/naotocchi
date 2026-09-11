// A small structural DOM for the display adapter's Node tests. It models node
// replacement and observer delivery, not CSS, image loading, or browser layout.
function createDOM() {
  const observers = new Set();
  let document;
  const decode = text => text.replace(/&(amp|lt|gt|quot|#39);/g, (_, key) =>
    ({amp:'&',lt:'<',gt:'>',quot:'"','#39':"'"})[key]);
  function notify(record) {
    for (const observer of observers) {
      const {root, options} = observer;
      if (!root || (root !== record.target && !(options.subtree && root.contains(record.target)))) continue;
      if (options[record.type]) observer.records.push(record);
    }
  }
  class Node {
    constructor(type, name) {
      this.nodeType = type; this.nodeName = name;
      this.childNodes = []; this.parentNode = null;
      this.ownerDocument = document;
    }
    get parentElement() { return this.parentNode?.nodeType === 1 ? this.parentNode : null; }
    get firstChild() { return this.childNodes[0] || null; }
    get children() { return this.childNodes.filter(node => node.nodeType === 1); }
    get isConnected() { return document.contains(this); }
    contains(node) { return node === this || this.childNodes.some(child => child.contains(node)); }
    appendChild(node) {
      if (node.nodeType === 11) { for (const child of [...node.childNodes]) this.appendChild(child); return node; }
      node.remove(); this.childNodes.push(node); node.parentNode = this;
      notify({type:'childList', target:this, addedNodes:[node], removedNodes:[]}); return node;
    }
    removeChild(node) {
      const index = this.childNodes.indexOf(node);
      if (index < 0) throw Error('Not a child');
      this.childNodes.splice(index, 1); node.parentNode = null;
      notify({type:'childList', target:this, addedNodes:[], removedNodes:[node]}); return node;
    }
    replaceChild(replacement, node) {
      const index = this.childNodes.indexOf(node);
      if (index < 0) throw Error('Not a child');
      const added = replacement.nodeType === 11 ? [...replacement.childNodes] : [replacement];
      for (const child of added) child.remove();
      this.childNodes.splice(index, 1, ...added); node.parentNode = null;
      for (const child of added) child.parentNode = this;
      notify({type:'childList', target:this, addedNodes:added, removedNodes:[node]}); return node;
    }
    remove() { this.parentNode?.removeChild(this); }
    get textContent() { return this.childNodes.map(child => child.textContent).join(''); }
    set textContent(value) {
      for (const child of [...this.childNodes]) this.removeChild(child);
      if (String(value)) this.appendChild(document.createTextNode(String(value)));
    }
  }
  class Text extends Node {
    constructor(value) { super(3, '#text'); this.value = String(value); }
    get nodeValue() { return this.value; }
    set nodeValue(value) { this.value = String(value); notify({type:'characterData', target:this}); }
    get textContent() { return this.nodeValue; }
    set textContent(value) { this.nodeValue = value; }
    get data() { return this.nodeValue; }
    set data(value) { this.nodeValue = value; }
  }
  class Element extends Node {
    constructor(name) { super(1, name.toUpperCase()); this.tagName = this.nodeName; this.attributes = {}; this.listeners = new Map(); }
    get className() { return this.getAttribute('class') || ''; }
    set className(value) { this.setAttribute('class', value); }
    get classList() { return {contains: name => this.className.split(/\s+/).includes(name)}; }
    get id() { return this.getAttribute('id') || ''; }
    set id(value) { this.setAttribute('id', value); }
    get hidden() { return this.hasAttribute('hidden'); }
    set hidden(value) { if (value) this.setAttribute('hidden', ''); else this.removeAttribute('hidden'); }
    get isContentEditable() { return this.getAttribute('contenteditable') !== 'false' &&
      (this.hasAttribute('contenteditable') || !!this.parentElement?.isContentEditable); }
    setAttribute(name, value) { this.attributes[name] = String(value); notify({type:'attributes', target:this, attributeName:name}); }
    getAttribute(name) { return Object.hasOwn(this.attributes, name) ? this.attributes[name] : null; }
    hasAttribute(name) { return Object.hasOwn(this.attributes, name); }
    removeAttribute(name) { delete this.attributes[name]; notify({type:'attributes', target:this, attributeName:name}); }
    matches(selector) {
      return selector.split(',').some(part => {
        const item = part.trim();
        if (item.startsWith('.')) return this.classList.contains(item.slice(1));
        if (item.startsWith('#')) return this.id === item.slice(1);
        return item.toUpperCase() === this.tagName;
      });
    }
    closest(selector) { return this.matches(selector) ? this : this.parentElement?.closest(selector) || null; }
    querySelectorAll(selector) {
      const found = [];
      const visit = node => { for (const child of node.children) { if (child.matches(selector)) found.push(child); visit(child); } };
      visit(this); return found;
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    addEventListener(type, callback) { if (!this.listeners.has(type)) this.listeners.set(type, []); this.listeners.get(type).push(callback); }
    dispatchEvent(event) { for (const callback of this.listeners.get(event.type) || []) callback.call(this, event); }
    set innerHTML(html) {
      this.textContent = '';
      const stack = [this];
      for (const token of String(html).match(/<[^>]*>|[^<]+/g) || []) {
        if (token.startsWith('</')) { stack.pop(); continue; }
        if (token.startsWith('<')) {
          const [, name, attributes] = token.match(/^<([\w-]+)([\s\S]*?)\/?\s*>$/) || [];
          if (!name) continue;
          const element = document.createElement(name);
          for (const [, attr, quoted, single, bare] of attributes.matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s/]+)))?/g)) {
            element.setAttribute(attr, decode(quoted ?? single ?? bare ?? ''));
          }
          stack.at(-1).appendChild(element);
          if (!/^(img|br|input|hr|meta|link)$/i.test(name) && !token.endsWith('/>')) stack.push(element);
        } else stack.at(-1).appendChild(document.createTextNode(decode(token)));
      }
    }
  }
  class MutationObserver {
    constructor(callback) { this.callback = callback; this.records = []; observers.add(this); }
    observe(root, options) { this.root = root; this.options = options; }
    disconnect() { this.root = null; this.records = []; }
    takeRecords() { return this.records.splice(0); }
  }
  document = new Node(9, '#document'); document.ownerDocument = document;
  document.createElement = name => new Element(name);
  document.createTextNode = value => new Text(value);
  document.createDocumentFragment = () => new Node(11, '#document-fragment');
  document.defaultView = {MutationObserver};
  document.documentElement = document.createElement('html');
  document.body = document.createElement('body');
  document.appendChild(document.documentElement); document.documentElement.appendChild(document.body);
  document.flushMutations = () => {
    let rounds = 0;
    while ([...observers].some(observer => observer.records.length)) {
      if (++rounds > 20) throw Error('MutationObserver did not settle');
      for (const observer of observers) if (observer.records.length) observer.callback(observer.takeRecords());
    }
    return rounds;
  };
  return document;
}
module.exports = {createDOM};
