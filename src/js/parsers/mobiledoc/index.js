import MobiledocParser_0_2 from './0-2';
import MobiledocParser_0_3 from './0-3';

import { MOBILEDOC_VERSION as MOBILEDOC_VERSION_0_2 } from 'mobiledoc-kit/renderers/mobiledoc/0-2';
import { MOBILEDOC_VERSION as MOBILEDOC_VERSION_0_3 } from 'mobiledoc-kit/renderers/mobiledoc/0-3';

function parseVersion(mobiledoc) {
  return mobiledoc.version;
}

export default {
  parse(builder, mobiledoc) {
    let version = parseVersion(mobiledoc);
    switch (version) {
      case MOBILEDOC_VERSION_0_2:
        return new MobiledocParser_0_2(builder).parse(mobiledoc);
      case MOBILEDOC_VERSION_0_3:
        return new MobiledocParser_0_3(builder).parse(mobiledoc);
      default:
        throw new Error(`Unknown version of mobiledoc parser requested: ${version}`);
    }
  }
};
