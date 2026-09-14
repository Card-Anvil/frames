/** Golden angle, so adjacent boxes never share a hue. From the prototype. */
export const hueFor = (index: number): number => (index * 137.508) % 360;

export const boxColor = (index: number, alpha = 1): string =>
  `hsla(${String(hueFor(index))}, 90%, 55%, ${String(alpha)})`;
