const {module, test} = QUnit;

import Section from 'content-kit-editor/models/markup-section';
import Marker from 'content-kit-editor/models/marker';
import Markup from 'content-kit-editor/models/markup';

module('Unit: Section');

test('Section exists', (assert) => {
  assert.ok(Section);
});

test('a section can append a marker', (assert) => {
  const s1 = new Section();
  const m1 = new Marker('hello');

  s1.appendMarker(m1);
  assert.equal(s1.markers.length, 1);
});

test('#markerContaining finds the marker at the given offset when 1 marker', (assert) => {
  const m = new Marker('hi there!');
  const s = new Section('h2',[m]);

  for (let i=0; i<m.length; i++) {
    assert.equal(s.markerContaining(i), m, `finds marker at offset ${i}`);
  }
});

test('#markerContaining finds the marker at the given offset when 2 markers', (assert) => {
  const m1 = new Marker('hi ');
  const m2 = new Marker('there!');
  const s = new Section('h2',[m1,m2]);

  assert.equal(s.markerContaining(0), m1,
               'first marker is always found at offset 0');
  assert.equal(s.markerContaining(m1.length + m2.length, false), m2,
               'last marker is found at offset === length when right-inclusive');
  assert.ok(!s.markerContaining(m1.length + m2.length + 1),
            'when offset > length && left-inclusive, no marker is found');
  assert.ok(!s.markerContaining(m1.length + m2.length + 1, false),
            'when offset > length && right-inclusive, no marker is found');

  for (let i=1; i<m1.length; i++) {
    assert.equal(s.markerContaining(i), m1, `finds marker 1 at offset ${i}`);
  }
  assert.equal(s.markerContaining(m1.length), m2, `finds marker m2 (left-inclusive)`);
  assert.equal(s.markerContaining(m1.length, false), m1, `finds marker m1 (right-inclusive)`);

  for (let i=m1.length+1; i<(m1.length+m2.length); i++) {
    assert.equal(s.markerContaining(i), m2, `finds marker 2 at offset ${i}`);
  }
});

test('#markerContaining finds the marker at the given offset when multiple markers', (assert) => {
  const m1 = new Marker('hi ');
  const m2 = new Marker('there!');
  const m3 = new Marker(' and more');
  const markerLength = [m1,m2,m3].reduce((prev, cur) => prev + cur.length, 0);
  const s = new Section('h2',[m1,m2,m3]);

  assert.equal(s.markerContaining(0), m1,
               'first marker is always found at offset 0');
  assert.ok(!s.markerContaining(markerLength),
            'last marker is undefined at offset === length (left-inclusive)');
  assert.equal(s.markerContaining(markerLength, false), m3,
               'last marker is found at offset === length (right-inclusive)');
  assert.ok(!s.markerContaining(markerLength + 1),
               'no marker is found at offset > length');

  for (let i=1; i<m1.length; i++) {
    assert.equal(s.markerContaining(i), m1, `finds marker 1 at offset ${i}`);
  }
  assert.equal(s.markerContaining(m1.length), m2, `finds m2 (left-inclusive)`);
  assert.equal(s.markerContaining(m1.length, false), m1, `finds m1 (right-inclusive)`);

  for (let i=m1.length+1; i<(m1.length+m2.length); i++) {
    assert.equal(s.markerContaining(i), m2, `finds marker 2 at offset ${i}`);
  }

  assert.equal(s.markerContaining(m1.length+m2.length), m3, `finds m3 (left-inclusive)`);
  assert.equal(s.markerContaining(m1.length+m2.length, false), m2, `finds m2 (right-inclusive)`);

  for (let i=m1.length+m2.length+1; i<markerLength; i++) {
    assert.equal(s.markerContaining(i), m3, `finds marker 3 at offset ${i}`);
  }
});

test('a section can be split, splitting its markers', (assert) => {
  const m = new Marker('hi there!', [new Markup('b')]);
  const s = new Section('p', [m]);

  const [s1, s2] = s.split(5);
  assert.equal(s1.markers.length, 1, 's1 has marker');
  assert.equal(s2.markers.length, 1, 's2 has marker');

  assert.ok(s1.markers[0].hasMarkup('b'));
  assert.equal(s1.markers[0].value, 'hi th');

  assert.ok(s2.markers[0].hasMarkup('b'));
  assert.equal(s2.markers[0].value, 'ere!');
});

test('a section can be split, splitting its markers when multiple markers', (assert) => {
  const m1 = new Marker('hi ');
  const m2 = new Marker('there!');
  const s = new Section('h2', [m1,m2]);

  const [s1, s2] = s.split(5);
  assert.equal(s1.markers.length, 2, 's1 has 2 markers');
  assert.equal(s2.markers.length, 1, 's2 has 1 marker');

  assert.equal(s1.markers[0].value, 'hi ');
  assert.equal(s1.markers[1].value, 'th');
  assert.equal(s2.markers[0].value, 'ere!');
});

// test: a section can parse dom

// test: a section can clear a range:
//   * truncating the markers on the boundaries
//   * removing the intermediate markers
//   * connecting (but not joining) the truncated boundary markers
