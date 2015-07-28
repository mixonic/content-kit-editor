import TextFormatToolbar  from '../views/text-format-toolbar';
import Tooltip from '../views/tooltip';
import EmbedIntent from '../views/embed-intent';

import BoldCommand from '../commands/bold';
import ItalicCommand from '../commands/italic';
import LinkCommand from '../commands/link';
import QuoteCommand from '../commands/quote';
import HeadingCommand from '../commands/heading';
import SubheadingCommand from '../commands/subheading';
import UnorderedListCommand from '../commands/unordered-list';
import OrderedListCommand from '../commands/ordered-list';
import ImageCommand from '../commands/image';
import OEmbedCommand from '../commands/oembed';
import CardCommand from '../commands/card';

import Keycodes from '../utils/keycodes';
import {
  getSelectionBlockElement,
  getCursorOffsetInElement
} from '../utils/selection-utils';
import EventEmitter from '../utils/event-emitter';

import MobiledocParser from "../parsers/mobiledoc";
import DOMParser from "../parsers/dom";
import PostParser from '../parsers/post';
import Renderer from 'content-kit-editor/renderers/editor-dom';
import RenderTree from 'content-kit-editor/models/render-tree';
import MobiledocRenderer from '../renderers/mobiledoc';

import { toArray, mergeWithOptions } from 'content-kit-utils';
import {
  detectParentNode,
  clearChildNodes,
} from '../utils/dom-utils';
import {
  forEach
} from '../utils/array-utils';
import { getData, setData } from '../utils/element-utils';
import mixin from '../utils/mixin';
import EventListenerMixin from '../utils/event-listener';
import Cursor from '../models/cursor';
import Section from '../models/markup-section';

const defaults = {
  placeholder: 'Write here...',
  spellcheck: true,
  autofocus: true,
  post: null,
  serverHost: '',
  // FIXME PhantomJS has 'ontouchstart' in window,
  // causing the stickyToolbar to accidentally be auto-activated
  // in tests
  stickyToolbar: false, // !!('ontouchstart' in window),
  textFormatCommands: [
    new BoldCommand(),
    new ItalicCommand(),
    new LinkCommand(),
    new QuoteCommand(),
    new HeadingCommand(),
    new SubheadingCommand()
  ],
  embedCommands: [
    new ImageCommand({ serviceUrl: '/upload' }),
    new OEmbedCommand({ serviceUrl: '/embed'  }),
    new CardCommand()
  ],
  autoTypingCommands: [
    new UnorderedListCommand(),
    new OrderedListCommand()
  ],
  cards: [],
  cardOptions: {},
  unknownCardHandler: () => { throw new Error('Unknown card encountered'); },
  mobiledoc: null
};

function bindContentEditableTypingListeners(editor) {
  // On 'PASTE' sanitize and insert
  editor.addEventListener(editor.element, 'paste', function(e) {
    var data = e.clipboardData;
    var pastedHTML = data && data.getData && data.getData('text/html');
    var sanitizedHTML = pastedHTML && editor._renderer.rerender(pastedHTML);
    if (sanitizedHTML) {
      document.execCommand('insertHTML', false, sanitizedHTML);
      editor.rerender();
    }
    e.preventDefault();
    return false;
  });
}

function bindAutoTypingListeners(editor) {
  // Watch typing patterns for auto format commands (e.g. lists '- ', '1. ')
  editor.addEventListener(editor.element, 'keyup', function(e) {
    var commands = editor.autoTypingCommands;
    var count = commands && commands.length;
    var selection, i;

    if (count) {
      selection = window.getSelection();
      for (i = 0; i < count; i++) {
        if (commands[i].checkAutoFormat(selection.anchorNode)) {
          e.stopPropagation();
          return;
        }
      }
    }
  });
}

function handleSelection(editor) {
  return () => {
    if (editor.cursor.hasSelection()) {
      editor.hasSelection();
    } else {
      editor.hasNoSelection();
    }
  };
}

function bindSelectionEvent(editor) {
  /**
   * The following events/sequences can create a selection and are handled:
   *  * mouseup -- can happen anywhere in document, must wait until next tick to read selection
   *  * keyup when key is a movement key and shift is pressed -- in editor element
   *  * keyup when key combo was cmd-A (alt-A) aka "select all"
   *  * keyup when key combo was cmd-Z (browser restores selection if there was one)
   *
   * These cases can create a selection and are not handled:
   *  * ctrl-click -> context menu -> click "select all"
   */

  // mouseup will not properly report a selection until the next tick, so add a timeout:
  const mouseupHandler = () => setTimeout(handleSelection(editor));
  editor.addEventListener(document, 'mouseup', mouseupHandler);

  const keyupHandler = handleSelection(editor);
  editor.addEventListener(editor.element, 'keyup', keyupHandler);
}

function bindKeyListeners(editor) {
  // escape key
  editor.addEventListener(document, 'keyup', (event) => {
    if (event.keyCode === Keycodes.ESC) {
      editor.trigger('escapeKey');
    }
  });

  editor.addEventListener(document, 'keydown', (event) => {
    switch (event.keyCode) {
      case Keycodes.BACKSPACE:
      case Keycodes.DELETE:
        editor.handleDeletion(event);
        break;
      case Keycodes.ENTER:
        editor.handleNewline(event);
        break;
    }
  });
}

function bindDragAndDrop(editor) {
  // TODO. For now, just prevent redirect when dropping something on the page
  editor.addEventListener(window, 'dragover', function(e) {
    e.preventDefault(); // prevents showing cursor where to drop
  });
  editor.addEventListener(window, 'drop', function(e) {
    e.preventDefault(); // prevent page from redirecting
  });
}

function initEmbedCommands(editor) {
  var commands = editor.embedCommands;
  if(commands) {
    editor.addView(new EmbedIntent({
      editorContext: editor,
      commands: commands,
      rootElement: editor.element
    }));
  }
}

/**
 * @class Editor
 * An individual Editor
 * @param element `Element` node
 * @param options hash of options
 */
class Editor {
  constructor(element, options) {
    if (!element) {
      throw new Error('Editor requires an element as the first argument');
    }

    this._elementListeners = [];
    this._views = [];
    this.element = element;

    // FIXME: This should merge onto this.options
    mergeWithOptions(this, defaults, options);

    this._parser   = PostParser;
    this._renderer = new Renderer(this.cards, this.unknownCardHandler, this.cardOptions);

    this.applyClassName();
    this.applyPlaceholder();

    element.spellcheck = this.spellcheck;
    element.setAttribute('contentEditable', true);

    if (this.mobiledoc) {
      this.parseModelFromMobiledoc(this.mobiledoc);
    } else {
      this.parseModelFromDOM(this.element);
    }

    clearChildNodes(element);
    this.rerender();

    bindContentEditableTypingListeners(this);
    bindAutoTypingListeners(this);
    bindDragAndDrop(this);
    bindSelectionEvent(this);
    bindKeyListeners(this);
    this.addEventListener(element, 'input', () => this.handleInput());
    initEmbedCommands(this);

    this.addView(new TextFormatToolbar({
      editor: this,
      rootElement: element,
      commands: this.textFormatCommands,
      sticky: this.stickyToolbar
    }));

    this.addView(new Tooltip({
      rootElement: element,
      showForTag: 'a'
    }));

    if (this.autofocus) {
      element.focus();
    }
  }

  addView(view) {
    this._views.push(view);
  }

  loadModel(post) {
    this.post = post;
    this.rerender();
    this.trigger('update');
  }

  parseModelFromDOM(element) {
    this.post = this._parser.parse(element);
    this._renderTree = new RenderTree();
    let node = this._renderTree.buildRenderNode(this.post);
    this._renderTree.node = node;
    this.trigger('update');
  }

  parseModelFromMobiledoc(mobiledoc) {
    this.post = new MobiledocParser().parse(mobiledoc);
    this._renderTree = new RenderTree();
    let node = this._renderTree.buildRenderNode(this.post);
    this._renderTree.node = node;
    this.trigger('update');
  }

  rerender() {
    let postRenderNode = this.post.renderNode;
    if (!postRenderNode.element) {
      postRenderNode.element = this.element;
      postRenderNode.markDirty();
    }

    this._renderer.render(this._renderTree);
  }

  handleDeletion() {
    return;
    // FIXME must join markers

    // Delete wholly selected sections
    if (this.cursor.hasSelection()) {
      const activeSections = this.cursor.activeSections;
      const whollySelectedSections = activeSections.slice(1,-1);
      forEach(whollySelectedSections, (section) => this.post.removeSection(section));
    }

    // If deleting from beginning of section, join sections
  }

  handleNewline(event) {
    event.preventDefault();

    if (this.cursor.hasSelection()) {
      console.log('has selection, should delete it');
    }
    let currentSection;
    let activeSections = this.cursor.activeSections;
    currentSection = activeSections[activeSections.length - 1];
    if (!currentSection) { currentSection = this.post.sections[-1]; }

    const leftOffset = this.cursor.leftOffset;
    const [newLeftSection, newRightSection] = currentSection.split(leftOffset);

    this.post.replaceSection(currentSection, newLeftSection);
    this.post.insertSectionAfter(newRightSection, newLeftSection);

    console.log('rerender!');
    this.rerender();

    setTimeout(() => {
      debugger;
      this.cursor.moveToSection(newRightSection);
    });
  }

  hasSelection() {
    if (!this._hasSelection) {
      this.trigger('selection');
    } else {
      this.trigger('selectionUpdated');
    }
    this._hasSelection = true;
  }

  hasNoSelection() {
    if (this._hasSelection) {
      this.trigger('selectionEnded');
    }
    this._hasSelection = false;
  }

  cancelSelection() {
    if (this._hasSelection) {
      // FIXME perhaps restore cursor position to end of the selection?
      this.cursor.clearSelection();
      this.hasNoSelection();
    }
  }

  getActiveMarkers() {
    const cursor = this.cursor;
    return cursor.activeMarkers;
  }

  getActiveSections() {
    const cursor = this.cursor;
    return cursor.activeSections;
  }

  get cursor() {
    return new Cursor(this);
  }

  getCurrentBlockIndex() {
    var selectionEl = this.element || getSelectionBlockElement();
    var blockElements = toArray(this.element.children);
    return blockElements.indexOf(selectionEl);
  }

  getCursorIndexInCurrentBlock() {
    var currentBlock = getSelectionBlockElement();
    if (currentBlock) {
      return getCursorOffsetInElement(currentBlock);
    }
    return -1;
  }

  applyClassName() {
    var editorClassName = 'ck-editor';
    var editorClassNameRegExp = new RegExp(editorClassName);
    var existingClassName = this.element.className;

    if (!editorClassNameRegExp.test(existingClassName)) {
      existingClassName += (existingClassName ? ' ' : '') + editorClassName;
    }
    this.element.className = existingClassName;
  }

  applyPlaceholder() {
    const placeholder = this.placeholder;
    const existingPlaceholder = getData(this.element, 'placeholder');

    if (placeholder && !existingPlaceholder) {
      setData(this.element, 'placeholder', placeholder);
    }
  }

  /**
   * types of input to handle:
   *   * delete from beginning of section
   *       joins 2 sections
   *   * delete when multiple sections selected
   *       removes wholly-selected sections,
   *       joins the partially-selected sections
   *   * hit enter
   *       if anything is selected, delete it first, then
   *       if at end of section, add new empty section after it
   *       if at beginning of section, add an empty section before it
   *       if in middle of section, split it into two
   */    
  handleInput() {
    this.reparse();
    this.trigger('update');
  }

  reparse() {
    this.post = this._parser.parse(this.element);
  }

  getSectionsWithCursor() {
    return this.getRenderNodesWithCursor().map( renderNode => {
      return renderNode.postNode;
    });
  }

  getRenderNodesWithCursor() {
    const selection = document.getSelection();
    if (selection.rangeCount === 0) {
      return null;
    }

    const range = selection.getRangeAt(0);

    let { startContainer:startElement, endContainer:endElement } = range;

    let getElementRenderNode = (e) => {
      return this._renderTree.getElementRenderNode(e);
    };
    let { result:startRenderNode } = detectParentNode(startElement, getElementRenderNode);
    let { result:endRenderNode } = detectParentNode(endElement, getElementRenderNode);

    let nodes = [];
    let node = startRenderNode;
    while (node && (!endRenderNode.nextSibling || endRenderNode.nextSibling !== node)) {
      nodes.push(node);
      node = node.nextSibling;
    }

    return nodes;
  }

  reparseSection(section) {
    let sectionRenderNode = section.renderNode;
    let sectionElement = sectionRenderNode.element;
    let previousSection = this.post.getPreviousSection(section);

    var newSection = this._parser.parseSection(
      previousSection,
      sectionElement
    );
    section.markers = newSection.markers;

    this.trigger('update');
  }

  serialize() {
    return MobiledocRenderer.render(this.post);
  }

  removeAllViews() {
    this._views.forEach((v) => v.destroy());
    this._views = [];
  }

  insertSectionAtCursor(newSection) {
    let newRenderNode = this._renderTree.buildRenderNode(newSection);
    let renderNodes = this.getRenderNodesWithCursor();
    let lastRenderNode = renderNodes[renderNodes.length-1];
    lastRenderNode.parentNode.insertAfter(newRenderNode, lastRenderNode);
    this.post.insertSectionAfter(newSection, lastRenderNode.postNode);
    renderNodes.forEach(renderNode => renderNode.scheduleForRemoval());
    this.trigger('update');
  }

  removeSection(section) {
    this.post.removeSection(section);
  }

  destroy() {
    this.removeAllEventListeners();
    this.removeAllViews();
  }
}

mixin(Editor, EventEmitter);
mixin(Editor, EventListenerMixin);

export default Editor;
