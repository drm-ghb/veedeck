import type { CSSProperties, ReactNode } from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": {
        src?: string;
        "camera-controls"?: boolean | string;
        "auto-rotate"?: boolean | string;
        "shadow-intensity"?: string;
        "environment-image"?: string;
        exposure?: string;
        ar?: boolean | string;
        style?: CSSProperties;
        className?: string;
        children?: ReactNode;
      };
    }
  }
}
