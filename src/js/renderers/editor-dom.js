import RenderNode from "content-kit-editor/models/render-node";
import CardNode from "content-kit-editor/models/card-node";
import { detect } from 'content-kit-editor/utils/array-utils';
import { POST_TYPE } from "../models/post";
import { MARKUP_SECTION_TYPE } from "../models/markup-section";
import { MARKER_TYPE } from "../models/marker";
import { IMAGE_SECTION_TYPE } from "../models/image";

export const UNPRINTABLE_CHARACTER = "\u200C";

function createElementFromMarkup(doc, markup) {
  var element = doc.createElement(markup.tagName);
  if (markup.attributes) {
    for (var i=0, l=markup.attributes.length;i<l;i=i+2) {
      element.setAttribute(markup.attributes[i], markup.attributes[i+1]);
    }
  }
  return element;
}

function renderMarkupSection(doc, section) {
  var element = doc.createElement(section.tagName);
  section.element = element;
  return element;
}

function isEmptyText(text) {
  return text.trim() === '';
}

function renderMarker(doc, marker, element) {
  const openTypes = marker.openedMarkups;
  let closeTypesLength = marker.closedMarkups.length;
  let text = marker.value;
  if (isEmptyText(text)) {
    // This is necessary to allow the cursor to move into this area
    text = UNPRINTABLE_CHARACTER;
  }

  const textNode = doc.createTextNode(text);
  let markup;
  let currentElement = element;

  for (let j=0, m=openTypes.length;j<m;j++) {
    markup = openTypes[j];
    let openedElement = createElementFromMarkup(doc, markup);
    currentElement.appendChild(openedElement);
    currentElement = openedElement;
  }

  currentElement.appendChild(textNode);

  // walk up the DOM to find the top-level container of this marker.
  // It will be the node that we `appendChild` the next marker's node onto
  while (closeTypesLength--) {
    currentElement = currentElement.parentNode;
  }

  return { nextElement: currentElement, textNode };
}

class Visitor {
  constructor(cards, unknownCardHandler, options) {
    this.cards = cards;
    this.unknownCardHandler = unknownCardHandler;
    this.options = options;
  }

  [POST_TYPE](renderNode, post, visit) {
    if (!renderNode.element) {
      let element = document.createElement('div');
      renderNode.element = element;
    }
    visit(renderNode, post.sections);
  }

  [MARKUP_SECTION_TYPE](renderNode, section, visit) {
    if (!renderNode.element) {
      let element = renderMarkupSection(window.document, section);
      if (renderNode.previousSibling) {
        let previousElement = renderNode.previousSibling.element;
        let nextElement = previousElement.nextSibling;
        if (nextElement) {
          nextElement.parentNode.insertBefore(element, nextElement);
        }
      }
      if (!element.parentNode) {
        renderNode.parentNode.element.appendChild(element);
      }
      renderNode.element = element;
    }
    visit(renderNode, section.markers);
  }

  [MARKER_TYPE](renderNode, marker) {
    let parentElement;
    if (renderNode.previousSibling) {
      parentElement = renderNode.previousSibling.nextMarkerElement;
    } else {
      parentElement = renderNode.parentNode.element;
    }

    // FIXME before we render marker, should delete previous renderNode's element
    // and up until the next marker element
    let {nextElement, textNode} = renderMarker(window.document, marker, parentElement);

    renderNode.nextMarkerElement = nextElement;
    renderNode.element = textNode;
  }

  [IMAGE_SECTION_TYPE](renderNode, section) {
    if (renderNode.element) {
      if (renderNode.element.src !== section.src) {
        renderNode.element.src = section.src;
      }
    } else {
      let element = document.createElement('img');
      element.src = section.src;
      if (renderNode.previousSibling) {
        let previousElement = renderNode.previousSibling.element;
        let nextElement = previousElement.nextSibling;
        if (nextElement) {
          nextElement.parentNode.insertBefore(element, nextElement);
        }
      }
      if (!element.parentNode) {
        renderNode.parentNode.element.appendChild(element);
      }
      renderNode.element = element;
    }
  }

  card(renderNode, section) {
    const card = detect(this.cards, card => card.name === section.name);

    const env = { name: section.name };
    const element = document.createElement('div');
    element.contentEditable = 'false';
    renderNode.element = element;
    renderNode.parentNode.element.appendChild(renderNode.element);

    if (card) {
      let cardNode = new CardNode(card, section, renderNode.element, this.options);
      renderNode.cardNode = cardNode;
      cardNode.display();
    } else {
      this.unknownCardHandler(renderNode.element, this.options, env, section.payload);
    }
  }
}

let destroyHooks = {
  [POST_TYPE](/*renderNode, post*/) {
    throw new Error('post destruction is not supported by the renderer');
  },
  [MARKUP_SECTION_TYPE](renderNode, section) {
    let post = renderNode.parentNode.postNode;
    post.removeSection(section);
    // Some formatting commands remove the element from the DOM during
    // formatting. Do not error if this is the case.
    if (renderNode.element.parentNode) {
      renderNode.element.parentNode.removeChild(renderNode.element);
    }
  },

  [MARKER_TYPE](renderNode, marker) {
    // FIXME before we render marker, should delete previous renderNode's element
    // and up until the next marker element

    let element = renderNode.element;
    while (element.parentNode !== renderNode.nextMarkerElement) {
      element = element.parentNode;
    }

    marker.section.removeMarker(marker);

    element.parentNode.removeChild(element);
  },

  [IMAGE_SECTION_TYPE](renderNode, section) {
    let post = renderNode.parentNode.postNode;
    post.removeSection(section);
    renderNode.element.parentNode.removeChild(renderNode.element);
  },

  card(renderNode, section) {
    if (renderNode.cardNode) {
      renderNode.cardNode.teardown();
    }
    let post = renderNode.parentNode.postNode;
    post.removeSection(section);
    renderNode.element.parentNode.removeChild(renderNode.element);
  }
};

function removeChildren(parentNode) {
  let child = parentNode.firstChild;
  while (child) {
    let nextChild = child.nextSibling;
    if (child.isRemoved) {
      destroyHooks[child.postNode.type](child, child.postNode);
      parentNode.removeChild(child);
    }
    child = nextChild;
  }
}

// Find an existing render node for the given postNode, or
// create one, insert it into the tree, and return it
function lookupNode(renderTree, parentNode, postNode, previousNode) {
  if (postNode.renderNode) {
    return postNode.renderNode;
  } else {
    let renderNode = new RenderNode(postNode);
    renderNode.renderTree = renderTree;
    parentNode.insertAfter(renderNode, previousNode);
    postNode.renderNode = renderNode;
    return renderNode;
  }
}

function renderInternal(renderTree, visitor) {
  let nodes = [renderTree.node];
  function visit(parentNode, postNodes) {
    let previousNode;
    postNodes.forEach(postNode => {
      let node = lookupNode(renderTree, parentNode, postNode, previousNode);
      if (node.isDirty) {
        nodes.push(node);
      }
      previousNode = node;
    });
  }
  let node = nodes.shift();
  while (node) {
    removeChildren(node);
    visitor[node.postNode.type](node, node.postNode, visit);
    node.markClean();
    node = nodes.shift();
  }
}

export default class Renderer {
  constructor(cards, unknownCardHandler, options) {
    this.visitor = new Visitor(cards, unknownCardHandler, options);
  }

  render(renderTree) {
    renderInternal(renderTree, this.visitor);
  }
}
