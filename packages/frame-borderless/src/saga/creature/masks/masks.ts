import type { LayoutMasks } from "@cardanvil/frame-kit";

import keyword from "./keyword.png";
import legendary from "./legendary.png";
import noBorder from "./noBorder.png";
import pinlines from "./pinlines.png";
import rules from "./rules.png";
import title from "./title.png";
import titleAndType from "./titleAndType.png";
import type from "./type.png";

// The keyword mask in this folder is intentionally not imported — nothing in
// the drawing flow reads it.
export const borderlessSagaCreatureMasks: LayoutMasks = {
  noBorder,
  keyword,
  legendary,
  pinlines,
  rules,
  titleAndType,
  title,
  type,
};
