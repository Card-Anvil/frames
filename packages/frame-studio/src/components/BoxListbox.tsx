import {
  Box,
  HStack,
  Listbox,
  Text,
  VStack,
  createListCollection,
} from "@chakra-ui/react";
import { useMemo } from "react";

import type { TextBox } from "../api/types.js";
import { boxColor } from "../lib/hues.js";

export interface BoxListboxProps {
  readonly boxes: readonly { key: string; box: TextBox }[];
  readonly selected: string | undefined;
  readonly hidden: ReadonlySet<string>;
  /** Overflow in canvas pixels, by box key, for the boxes that do not fit. */
  readonly overflow: Readonly<Record<string, number>>;
  readonly onSelect: (key: string) => void;
  readonly onToggleHidden: (key: string) => void;
}

/**
 * The boxes in the current set, as a real listbox.
 *
 * Chakra's Listbox brings the `listbox`/`option` roles, the selection state
 * and arrow-key navigation, none of which a stack of clickable rows had.
 * `selectOnHighlight` makes arrowing select as it goes, so the canvas lights
 * up the box you are moving through rather than waiting for Enter.
 *
 * There is no CLI snippet for it, so this composes the primitive directly.
 */
export function BoxListbox(props: BoxListboxProps): React.JSX.Element {
  const { boxes, selected, hidden, overflow, onSelect, onToggleHidden } = props;

  const collection = useMemo(
    () =>
      createListCollection({
        items: boxes.map((entry, index) => ({ ...entry, index })),
        itemToString: (item) => item.key,
        itemToValue: (item) => item.key,
      }),
    [boxes],
  );

  return (
    <Listbox.Root
      collection={collection}
      selectionMode="single"
      // Arrowing through the list should light the box up on the canvas, not
      // wait for Enter — the point of the list is to find a box visually.
      selectOnHighlight
      typeahead
      value={selected === undefined ? [] : [selected]}
      onValueChange={(event) => {
        const [next] = event.value;
        if (next !== undefined) {
          onSelect(next);
        }
      }}
    >
      <Listbox.Label
        fontSize="sm"
        textTransform="uppercase"
        color="fg.muted"
        mb="1"
      >
        Boxes
      </Listbox.Label>

      <Listbox.Content
        bg="transparent"
        borderWidth="0"
        p="0"
        gap="0"
        // Chakra caps the content at a scrollable 384px, which would nest a
        // second scrollbar inside the panel that already scrolls.
        maxH="none"
        h="auto"
        overflow="visible"
      >
        {collection.items.map((item) => {
          const { key, box, index } = item;
          return (
            <Listbox.Item
              item={item}
              key={key}
              px="2"
              py="1"
              borderRadius="4px"
              opacity={hidden.has(key) ? 0.4 : 1}
            >
              <HStack gap="2" flex="1" minW="0">
                <Box
                  as="button"
                  aria-label={`${hidden.has(key) ? "Show" : "Hide"} ${key}`}
                  w="12px"
                  h="12px"
                  flex="none"
                  borderRadius="3px"
                  bg={boxColor(index)}
                  onClick={(event) => {
                    // The swatch toggles visibility; it must not also select.
                    event.stopPropagation();
                    onToggleHidden(key);
                  }}
                />
                <VStack align="stretch" gap="0" flex="1" minW="0">
                  <Listbox.ItemText fontWeight="600" truncate>
                    {key}
                  </Listbox.ItemText>
                  <Text fontSize="10px" color="fg.muted" truncate>
                    {box.x},{box.y} · {box.width}×{box.height}
                    {box.fontSize === undefined
                      ? ""
                      : ` · ${String(box.fontSize)}pt`}
                  </Text>
                  {overflow[key] !== undefined && (
                    <Text fontSize="10px" color="fg.error">
                      overflows by {overflow[key]}px
                    </Text>
                  )}
                </VStack>
              </HStack>
            </Listbox.Item>
          );
        })}

        <Listbox.Empty fontSize="xs" color="fg.muted">
          No boxes in this set.
        </Listbox.Empty>
      </Listbox.Content>
    </Listbox.Root>
  );
}
