import { Box, HStack, Text, VStack } from "@chakra-ui/react";

import type { MaskLayer } from "../lib/layers.js";

export interface MaskPanelProps {
  masks: readonly MaskLayer[];
  enabled: ReadonlySet<string>;
  onToggle: (id: string) => void;
}

/**
 * The layout's section masks, as cutouts you can switch on.
 *
 * Frame art and decorations are chosen from the card, so the only thing left
 * to pick by hand is which mask to look through — which is how you check that
 * a mask lines up with the art it is meant to clip.
 */
export function MaskPanel(props: MaskPanelProps): React.JSX.Element {
  const { masks, enabled, onToggle } = props;

  return (
    <VStack align="stretch" gap="0" mt="3">
      <Text fontSize="xs" textTransform="uppercase" color="fg.muted" mb="1">
        Masks
      </Text>
      {masks.length === 0 && (
        <Text fontSize="xs" color="fg.muted">
          This layout ships no section masks.
        </Text>
      )}
      {masks.map((mask) => {
        const on = enabled.has(mask.id);
        return (
          <HStack
            key={mask.id}
            gap="1"
            px="2"
            py="0.5"
            borderRadius="sm"
            opacity={on ? 1 : 0.4}
            _hover={{ bg: "bg.muted" }}
          >
            <Box
              as="button"
              fontSize="xs"
              color="fg.muted"
              title={on ? "hide" : "show"}
              onClick={() => {
                onToggle(mask.id);
              }}
            >
              {on ? "👁" : "🚫"}
            </Box>
            <Text fontSize="xs" flex="1" truncate title={mask.id}>
              {mask.id}
            </Text>
          </HStack>
        );
      })}
      {masks.length > 0 && (
        <Text fontSize="xs" color="fg.muted" mt="1">
          A mask cuts the art down to its shape, the way the renderer composites
          it.
        </Text>
      )}
    </VStack>
  );
}
