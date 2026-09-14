import { Box, HStack, Text, VStack } from "@chakra-ui/react";

import type { AssetLayer, MaskLayer } from "../lib/layers.js";

export interface LayerPanelProps {
  layers: readonly AssetLayer[];
  masks: readonly MaskLayer[];
  enabled: ReadonlySet<string>;
  enabledMasks: ReadonlySet<string>;

  onToggle: (id: string) => void;
  onToggleMask: (id: string) => void;
}

function Row(props: {
  label: string;
  on: boolean;
  onToggle: () => void;
  onMove?: (direction: -1 | 1) => void;
}): React.JSX.Element {
  const { label, on, onToggle, onMove } = props;
  return (
    <HStack
      gap="1"
      px="2"
      py="0.5"
      borderRadius="4px"
      opacity={on ? 1 : 0.4}
      _hover={{ bg: "#2f2f2f" }}
    >
      <Box
        as="button"
        fontSize="11px"
        color="#9d9d9d"
        onClick={onToggle}
        title={on ? "hide" : "show"}
      >
        {on ? "👁" : "🚫"}
      </Box>
      <Text fontSize="11px" flex="1" truncate title={label}>
        {label}
      </Text>
      {onMove && (
        <HStack gap="0">
          <Box
            as="button"
            fontSize="10px"
            color="#9d9d9d"
            px="1"
            title="draw earlier (lower)"
            onClick={() => {
              onMove(-1);
            }}
          >
            ▲
          </Box>
          <Box
            as="button"
            fontSize="10px"
            color="#9d9d9d"
            px="1"
            title="draw later (higher)"
            onClick={() => {
              onMove(1);
            }}
          >
            ▼
          </Box>
        </HStack>
      )}
    </HStack>
  );
}

/**
 * The art and masks behind the boxes, as a stack you control.
 *
 * Masks are cutouts: the app composites them `destination-in` over the frame
 * art, so toggling one here shows exactly the silhouette the renderer would
 * produce for that section.
 */
export function LayerPanel(props: LayerPanelProps): React.JSX.Element {
  const { layers, masks, enabled, enabledMasks, onToggle, onToggleMask } =
    props;

  return (
    <VStack align="stretch" gap="0" mt="3">
      <Text fontSize="10px" textTransform="uppercase" color="#9d9d9d" mb="1">
        Decorations
      </Text>
      {layers.length === 0 && (
        <Text fontSize="xs" color="#9d9d9d">
          This layout ships no crowns, nicknames or plates.
        </Text>
      )}
      {layers.map((layer) => (
        <Row
          key={layer.id}
          label={layer.id}
          on={enabled.has(layer.id)}
          onToggle={() => {
            onToggle(layer.id);
          }}
        />
      ))}

      {masks.length > 0 && (
        <>
          <Text
            fontSize="10px"
            textTransform="uppercase"
            color="#9d9d9d"
            mt="3"
            mb="1"
          >
            Masks
          </Text>
          {masks.map((mask) => (
            <Row
              key={mask.id}
              label={mask.id}
              on={enabledMasks.has(mask.id)}
              onToggle={() => {
                onToggleMask(mask.id);
              }}
            />
          ))}
          <Text fontSize="10px" color="#9d9d9d" mt="1">
            A mask cuts the art down to its shape, the way the renderer
            composites it.
          </Text>
        </>
      )}
    </VStack>
  );
}
