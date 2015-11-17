const {module, test} = QUnit;

import PostNodeBuilder from 'mobiledoc-kit/models/post-node-builder';

let builder;
module('Unit: Atom', {
  beforeEach() {
    builder = new PostNodeBuilder();
  },
  afterEach() {
    builder = null;
  }
});

test('can create an atom with text and payload', (assert) => {
  let payload = {};
  let text = 'atom-text';
  let name = 'atom-name';
  let atom = builder.createAtom(name, text, payload);
  assert.ok(!!atom, 'creates atom');
  assert.ok(atom.name === name, 'has name');
  assert.ok(atom.text === text, 'has text');
  assert.ok(atom.payload === payload, 'has payload');
  assert.ok(atom.length === 1, 'has length of 1');
});