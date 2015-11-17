import { MARKER_TYPE } from './types';
import mixin from '../utils/mixin';
import MarkuperableMixin from '../utils/markuperable';
import LinkedItem from '../utils/linked-item';

function trim(str) {
  return str.replace(/^\s+/, '').replace(/\s+$/, '');
}

const Marker = class Marker extends LinkedItem {
  constructor(value='', markups=[]) {
    super();
    this.value = value;
    this.markups = [];
    this.type = MARKER_TYPE;
    markups.forEach(m => this.addMarkup(m));
  }

  clone() {
    const clonedMarkups = this.markups.slice();
    return this.builder.createMarker(this.value, clonedMarkups);
  }

  get isEmpty() {
    return this.length === 0;
  }

  get isBlank() {
    return trim(this.value).length === 0;
  }

  get length() {
    return this.value.length;
  }

  truncateFrom(offset) {
    this.value = this.value.substr(0, offset);
  }

  truncateTo(offset) {
    this.value = this.value.substr(offset);
  }

  // delete the character at this offset,
  // update the value with the new value
  deleteValueAtOffset(offset) {
    if (offset < 0 || offset > this.length) {
      throw new Error(`Invalid offset "${offset}"`);
    }
    const [ left, right ] = [
      this.value.slice(0, offset),
      this.value.slice(offset+1)
    ];
    this.value = left + right;
  }

  join(other) {
    const joined = this.builder.createMarker(this.value + other.value);
    this.markups.forEach(m => joined.addMarkup(m));
    other.markups.forEach(m => joined.addMarkup(m));

    return joined;
  }

  split(offset=0, endOffset=this.length) {
    let markers = [];

    markers = [
      this.builder.createMarker(this.value.substring(0, offset)),
      this.builder.createMarker(this.value.substring(offset, endOffset)),
      this.builder.createMarker(this.value.substring(endOffset))
    ];

    this.markups.forEach(mu => markers.forEach(m => m.addMarkup(mu)));
    return markers;
  }
};

mixin(Marker, MarkuperableMixin);

export default Marker;
