## Mobiledoc Atoms

Atoms are effectively read-only inline cards.

An atom is an object with a name and at least one of several hooks defined. For example:

```js
var demoAtom = {
  name: 'mention',
  display: {
    setup(element, options, env, text, payload) {
      element.innerHTML = `<span class="mention">${text}</span>`;
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
    setup(element, options, env, text, payload) {},
    teardown(setupReturnValue) {}
  },
  html: {
    setup(buffer, options, env, text, payload) {},
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

* `element` is a DOM element for that section. Nodes of that view for a atom
  should be appended to the `element`.
* `buffer` is an array passed to the `html` hook instead of a DOM element.
  The content for the atom should be pushed on that array as a string.
* `options` is the `cardOptions` argument passed to the editor or renderer.
* `env` contains information about the running of this hook. It may contain
  the following properties:
  * `env.name` The name of this atom
  * `env.remove()` remove this atom. This calls the current mode's `teardown()`
    hook and removes the atom from DOM and from the post abstract.
    the instance to edit mode.
* `text` is the textual value used to display to the user.
* `payload` is the payload for this atom instance. It was either loaded from
  a Mobiledoc or set when the atom was inserted.

Additionally, *renderers may offer the ability to configure a non-standard
hook name at runtime*. An example would be having the DOM renderer called with
an option specifying the hook name `mobile-placeholder`. This allows for
variants of an atom in different situations.
