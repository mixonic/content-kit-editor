## Mobiledoc Atoms

Atoms are effectively read-only inline cards.

An atom is an object with a name, type and render hook:

```js
// package: mda-mention-dom
export default {
  name: 'mention',
  type: 'dom',
  render({element, options, env, text, payload}) {
    element.innerHTML = text;
  }
};
```

### Teardown

Mobiledoc-kit will clear the children of a rendered atom, but there may be cases where you wish to manually teardown
any event listeners attached to the window etc...

The return value of the `render` hook is a teardown function which will be called before the atom is removed from the DOM.

```js
// package: mda-mention-dom
export default {
  name: 'mention',
  type: 'dom',
  render({element, options, env, text, payload}) {
    element.innerHTML = text;
    let popOver = new PopOver(element, { url: payload.url });
    return () => {
      popOver.destroy();
    }
  }
};
```

### Arguments

The `render` hook receives a single object containing:

* `element` is a DOM element for the atom's content to be rendered.
* `options` is the `cardOptions` argument passed to the editor or renderer.
* `env` contains information about the running of this hook. It may contain
  the following properties:
  * `env.name` The name of this atom
* `text` is the textual value used to display to the user.
* `payload` is the payload for this atom instance. It was either loaded from
  a Mobiledoc or set when the atom was inserted.
