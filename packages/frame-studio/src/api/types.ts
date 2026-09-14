/** Payload shapes served by `frame-kit studio`. Mirrors src/cli/studio. */

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TextBox extends Bounds {
  fontSize?: number;
  color?: string;
  outlineColor?: string;
  outlineWidth?: number;
  verticalAlign?: "top" | "center";
  textAlign?: "left" | "center" | "right";
  fontFamily?: string;
  opacity?: number;
  shadow?: boolean;
}

export interface FrameSlot {
  key: string;
  kind: "boxes" | "assets" | "masks" | "knobs";
  required: boolean;
  variant: string | null;
  layout: string;
  path: string[];
  boxKeys?: string[];
}

export interface Problem {
  severity: string;
  frame?: string;
  file?: string;
  path?: string;
  message: string;
}

export interface FramePayload {
  slug: string;
  id: string;
  name: string;
  revision: number;
  canvas: { width: number; height: number };
  frame: unknown;
  slots: FrameSlot[];
  sourceFiles: string[];
  problems: Problem[];
  stale: boolean;
  staleProblems?: Problem[];
}

export interface FrameSummary {
  slug: string;
  id: string;
  name: string;
  stale: boolean;
}

export interface StudioInfo {
  root: string;
  absoluteRoot: string;
  writeEnabled: boolean;
}

export interface Impact {
  variant: string | null;
  layout: string;
  boxSet: string;
  path: string[];
  /** Which edited path pulled this in. Present on an edit refusal only. */
  edited?: string[];
}

export type Provenance =
  | {
      path: string[];
      editable: true;
      file: string;
      line: number;
      column: number;
      text: string;
      sharedDefault: boolean;
      shared: Impact[];
    }
  | {
      path: string[];
      editable: false;
      reason: string;
      detail: string;
      source?: { file: string; line: number; column: number };
    };

export interface Edit {
  path: (string | number)[];
  value: number | string | boolean;
}

export interface EditRejection {
  path: (string | number)[];
  reason: string;
  detail: string;
}
