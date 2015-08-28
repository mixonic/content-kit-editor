import { detect } from 'content-kit-editor/utils/array-utils';
import { detectParentNode } from 'content-kit-editor/utils/dom-utils';
import { MARKUP_SECTION_TYPE } from 'content-kit-editor/models/markup-section';
import { MARKER_TYPE } from 'content-kit-editor/models/marker';
import { LIST_ITEM_TYPE } from 'content-kit-editor/models/list-item';

function findSectionContaining(sections, childNode) {
  const { result: section } = detectParentNode(childNode, node => {
    return detect(sections, section => {
      return section.renderNode.element === node;
    });
  });
  return section;
}

const Position = class Position {
  constructor(section, offsetInSection=0) {
    let marker = null,
        offsetInMarker = null;

    if (section !== null && offsetInSection !== null) {
      let markerPosition = section.markerPositionAtOffset(
        offsetInSection
      );
      marker = markerPosition.marker;
      offsetInMarker = markerPosition.offset;
    }

    this.section = section;
    this.offsetInSection = offsetInSection;
    this.marker = marker;
    this.offsetInMarker = offsetInMarker;
  }

  isEqual(position) {
    return this.section === position.section &&
           this.offsetInSection === position.offsetInSection;
  }

  static fromNode(renderTree, sections, node, offsetInNode) {
    // Markup Sections, List Items, and Markers are registered into the element/renderNode map
    let renderNode = renderTree.getElementRenderNode(node),
        section = null,
        offsetInSection = null;

    if (renderNode) {
      switch (renderNode.postNode.type) {
        case MARKUP_SECTION_TYPE:
          // offsetInNode is offset in br, in a p
          section = renderNode.postNode;
          offsetInSection = offsetInNode;
          break;
        case LIST_ITEM_TYPE:
          // offsetInNode is offset in br, in a li
          let listItem = renderNode.postNode;
          section = listItem.section;
          offsetInSection = section.offsetOfListItem(
            {listItem, offset:offsetInNode}
          );
          break;
        case MARKER_TYPE:
          // offsetInNode is offset in text node
          let marker = renderNode.postNode;
          section = marker.section;
          offsetInSection = section.offsetOfMarker(
            {marker, offset:offsetInNode}
          );
          break;
      }
    }

    if (!section) {
      section = findSectionContaining(sections, node);

      if (section) {
        offsetInSection = 0;
      }
    }

    return new Position(section, offsetInSection);
  }
};

export default Position;
