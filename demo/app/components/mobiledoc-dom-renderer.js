import Ember from 'ember';
import cards from '../mobiledoc-cards/dom';
import atoms from '../mobiledoc-atoms/dom';
import Renderer from 'ember-mobiledoc-dom-renderer';

let { run } = Ember;

let renderer = new Renderer({cards, atoms});

export default Ember.Component.extend({
  didRender() {
    let mobiledoc = this.get('mobiledoc');
    if (!mobiledoc) {
      return;
    }

    run(() => {
      if (this._teardownRender) {
        this._teardownRender();
        this._teardownRender = null;
      }

      let target = this.$();
      let { result, teardown } = renderer.render(mobiledoc);
      target.append(result);
      this._teardownRender = teardown;
    });
  }
});
