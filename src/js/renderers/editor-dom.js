import RenderNode from "content-kit-editor/models/render-node";
import CardNode from "content-kit-editor/models/card-node";
import { detect } from 'content-kit-editor/utils/array-utils';
import { POST_TYPE } from "../models/post";
import { MARKUP_SECTION_TYPE } from "../models/markup-section";
import { MARKER_TYPE } from "../models/marker";
import { IMAGE_SECTION_TYPE } from "../models/image";
import { clearChildNodes } from '../utils/dom-utils';

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

// ascends from element upward, returning the last parent node that is not
// parentElement
function penultimateParentOf(element, parentElement) {
  while (parentElement &&
         element.parentNode !== parentElement &&
         element.parentElement !== document.body // ensure the while loop stops
        ) {
    element = element.parentNode;
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

// pass in a renderNode's previousSibling
function getNextMarkerElement(renderNode) {
  let element = renderNode.element.parentNode;
  let closedCount = renderNode.postNode.closedMarkups.length;

  // walk up the number of closed markups
  while (closedCount--) {
    element = element.parentNode;
  }
  return element;
}

function renderMarker(marker, element, previousRenderNode) {
  const openTypes = marker.openedMarkups;
  let text = marker.value;
  if (isEmptyText(text)) {
    // This is necessary to allow the cursor to move into this area
    text = UNPRINTABLE_CHARACTER;
  }

  let textNode = document.createTextNode(text);
  let currentElement = textNode;
  let markup;

  for (let j=openTypes.length-1;j>=0;j--) {
    markup = openTypes[j];
    let openedElement = createElementFromMarkup(document, markup);
    openedElement.appendChild(currentElement);
    currentElement = openedElement;
  }

  if (previousRenderNode) {
    let nextMarkerElement = getNextMarkerElement(previousRenderNode);

    let previousSibling = previousRenderNode.element;
    let previousSiblingPenultimate = penultimateParentOf(previousSibling, nextMarkerElement);
    nextMarkerElement.insertBefore(currentElement, previousSiblingPenultimate.nextSibling);
  } else {
    element.insertBefore(currentElement, element.firstChild);
  }

  return textNode;
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

    // remove all elements so that we can rerender
    clearChildNodes(renderNode.element);

    const visitAll = true;
    visit(renderNode, section.markers, visitAll);
  }

  [MARKER_TYPE](renderNode, marker) {
    let parentElement;

    if (renderNode.previousSibling) {
      parentElement = getNextMarkerElement(renderNode.previousSibling);
    } else {
      parentElement = renderNode.parentNode.element;
    }
    let textNode = renderMarker(marker, parentElement, renderNode.previousSibling);

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
    let nextMarkerElement = getNextMarkerElement(renderNode);
    while (element.parentNode && element.parentNode !== nextMarkerElement) {
      element = element.parentNode;
    }

    marker.section.removeMarker(marker);

    if (element.parentNode) {
      // if no parentNode, the browser already removed this element
      element.parentNode.removeChild(element);
    }
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

// removes children from parentNode that are scheduled for removal
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
  function visit(parentNode, postNodes, visitAll=false) {
    let previousNode;
    postNodes.forEach(postNode => {
      let node = lookupNode(renderTree, parentNode, postNode, previousNode);
      if (node.isDirty || visitAll) {
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
