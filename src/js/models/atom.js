import { ATOM_TYPE } from './types';

export default class Atom {
  constructor(name, text, payload) {
    this.name = name;
    this.text = text;
    this.payload = payload;
    this.type = ATOM_TYPE;
    this.length = 1;
  }
}
