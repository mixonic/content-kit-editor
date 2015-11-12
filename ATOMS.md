## Mobiledoc Atoms

Atoms are effectively read-only inline cards.

An atom is an object with a name and at least one of several hooks defined. For example:

```js
var demoAtom = {
  name: 'mention',
  display: {
    setup(element, options, env, payload) {
      element.innerHTML = `<span class="mention">${payload.name}</span>`;
    }
  }
}
```

### Available hooks

Like [CARDS](CARDS.md) there are several hooks an atom should define.

```js
var exampleAtom = {
  name: 'example',
  display: {
    setup(element, options, env, payload) {},
    teardown(setupReturnValue) {}
  },
  html: {
    setup(buffer, options, env, payload) {},
    teardown(setupReturnValue) {}
  }
};
```

|Hook|Used by Mobiledoc Kit|Used by DOM Renderer|Used by HTML Renderer|
|---|---|---|---|
|`display`|✓|✓||
|`html`|||✓|

Atoms are read-only so, unlike cards, do not have an `edit` hook.

Each hook has a `setup` and `teardown` method. The arguments are:

* `element` is a DOM element for that section. Nodes of that view for a card
  should be appended to the `element`.
* `buffer` is an array passed to the `html` hook instead of a DOM element.
  The content for the card should be pushed on that array as a string.
* `options` is the `cardOptions` argument passed to the editor or renderer.
* `env` contains information about the running of this hook. It may contain
  the following properties:
  * `env.name` The name of this card
  * `env.remove()` remove this card. This calls the current mode's `teardown()`
    hook and removes the card from DOM and from the post abstract.
    the instance to edit mode.
* `payload` is the payload for this card instance. It was either loaded from
  a Mobiledoc or set when the atom was inserted.

Additionally, *renderers may offer the ability to configure a non-standard
hook name at runtime*. An example would be having the DOM renderer called with
an option specifying the hook name `mobile-placeholder`. This allows for
variants of a card in different situations.
