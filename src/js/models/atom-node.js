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

    this.setupResult = this.atom.render({
      element: this.element,
      options: this.atomOptions,
      env: this.env,
      text: this.model.text,
      payload: this.model.payload
    });
  }

  get env() {
    return {
      name: this.atom.name,
      model: this.model
    };
  }

  remove() {
    // this.editor.run(postEditor => postEditor.removeSection(this.model));
  }

  teardown() {
    // TODO - test if setupResult is a function before calling?
    if (this.setupResult) {
      this.setupResult();
    }
  }

}