export default class AtomNode {
  constructor(editor, atom, model, element, atomOptions) {
    this.editor = editor;
    this.atom = atom;
    this.model = model;
    this.atomOptions = atomOptions;
    this.element = element;

    this.setupResult = null;
  }

  render() {
    this.teardown();

    let fragment = document.createDocumentFragment();

    this.setupResult = this.atom.render({
      options: this.atomOptions,
      env: this.env,
      text: this.model.text,
      payload: this.model.payload,
      fragment
    });

    this.element.appendChild(fragment);
  }

  get env() {
    return {
      name: this.atom.name
    };
  }

  teardown() {
    // TODO - test if setupResult is a function before calling?
    if (this.setupResult) {
      this.setupResult();
    }
  }

}