import { Box, HStack, Text, VStack } from "@chakra-ui/react";

import type { CardShape } from "@cardanvil/frame-kit/layout";

import type { FrameColor } from "../lib/cardShape.js";

const COLORS: { code: FrameColor; label: string; swatch: string }[] = [
  { code: "w", label: "White", swatch: "#f8f6d8" },
  { code: "u", label: "Blue", swatch: "#c1d7e9" },
  { code: "b", label: "Black", swatch: "#bab1ab" },
  { code: "r", label: "Red", swatch: "#e49977" },
  { code: "g", label: "Green", swatch: "#a3c095" },
];

const TOGGLES: {
  key: keyof CardShape;
  label: string;
  hint: string;
}[] = [
  {
    key: "isArtifact",
    label: "artifact",
    hint: "Artifact body, colour in the pinlines",
  },
  {
    key: "isVehicle",
    label: "vehicle",
    hint: "Vehicle body; overrides artifact",
  },
  { key: "isLand", label: "land", hint: "Draws from the land frames" },
  {
    key: "isEnchantment",
    label: "enchantment",
    hint: "Draws from the nyx frames when nyx borders are on",
  },
  {
    key: "isHybrid",
    label: "hybrid",
    hint: "Two colours paid with hybrid mana: splits the frame down the middle",
  },
  {
    key: "isDevoid",
    label: "devoid",
    hint: "Coloured by identity but framed colourless",
  },
  {
    key: "isColorless",
    label: "colourless",
    hint: "No colours at all — Eldrazi and friends",
  },
];

export interface CardShapePanelProps {
  shape: CardShape;
  useNyxBorder: boolean;
  /** What the shape resolved to, for the line under the controls. */
  summary: string;
  onChange: (shape: CardShape) => void;
  onNyxBorderChange: (on: boolean) => void;
}

/**
 * The card, reduced to what changes its frame.
 *
 * The studio has no card to read, so these stand in for the facts Card Anvil
 * would parse out of one. Everything the frame logic branches on is here,
 * including the awkward cases — devoid, vehicles, hybrid pairs — which are
 * exactly the ones a frame author is most likely to get wrong and least
 * likely to have a test card for.
 */
export function CardShapePanel(props: CardShapePanelProps): React.JSX.Element {
  const { shape, useNyxBorder, summary, onChange, onNyxBorderChange } = props;
  const colors = shape.colors ?? [];

  const toggleColor = (code: FrameColor) => {
    const next = colors.includes(code)
      ? colors.filter((color) => color !== code)
      : [...colors, code];
    onChange({ ...shape, colors: next });
  };

  return (
    <VStack align="stretch" gap="2" p="3" borderBottom="1px solid #3c3c3c">
      <Text fontSize="10px" textTransform="uppercase" color="#9d9d9d">
        Card
      </Text>

      <HStack gap="1">
        {COLORS.map((color) => {
          const on = colors.includes(color.code);
          return (
            <Box
              as="button"
              key={color.code}
              flex="1"
              py="1"
              borderRadius="4px"
              border="1px solid"
              borderColor={on ? color.swatch : "#3c3c3c"}
              bg={on ? color.swatch : "transparent"}
              color={on ? "#1e1e1e" : "#9d9d9d"}
              fontSize="11px"
              fontWeight="600"
              title={color.label}
              onClick={() => {
                toggleColor(color.code);
              }}
            >
              {color.code.toUpperCase()}
            </Box>
          );
        })}
      </HStack>

      <HStack gap="1" flexWrap="wrap">
        {TOGGLES.map((toggle) => {
          const on = shape[toggle.key] === true;
          return (
            <Box
              as="button"
              key={toggle.key}
              px="2"
              py="0.5"
              borderRadius="4px"
              border="1px solid"
              borderColor={on ? "#4ec9b0" : "#3c3c3c"}
              color={on ? "#4ec9b0" : "#9d9d9d"}
              fontSize="10px"
              title={toggle.hint}
              onClick={() => {
                onChange({ ...shape, [toggle.key]: !on });
              }}
            >
              {toggle.label}
            </Box>
          );
        })}
        <Box
          as="button"
          px="2"
          py="0.5"
          borderRadius="4px"
          border="1px solid"
          borderColor={useNyxBorder ? "#4ec9b0" : "#3c3c3c"}
          color={useNyxBorder ? "#4ec9b0" : "#9d9d9d"}
          fontSize="10px"
          title="The app's nyx-border setting, which decides whether enchantments use nyx art"
          onClick={() => {
            onNyxBorderChange(!useNyxBorder);
          }}
        >
          nyx borders
        </Box>
      </HStack>

      <Text fontSize="10px" color="#9d9d9d">
        {summary}
      </Text>
    </VStack>
  );
}
