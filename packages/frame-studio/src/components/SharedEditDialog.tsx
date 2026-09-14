import { Box, Button, HStack, Text, VStack } from "@chakra-ui/react";

import type { Impact } from "../api/types.js";

export interface SharedEditDialogProps {
  shared: readonly Impact[];
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Asks before moving a box that several layouts read.
 *
 * Frames spread one box set into many layouts, so a single literal often backs
 * a dozen of them. Applying silently would make an author think they had
 * changed one layout when they had changed twelve.
 */
export function SharedEditDialog(
  props: SharedEditDialogProps,
): React.JSX.Element {
  const { shared, onConfirm, onCancel } = props;

  return (
    <Box
      position="fixed"
      inset="0"
      bg="rgba(0,0,0,0.6)"
      display="grid"
      placeItems="center"
      zIndex="10"
    >
      <VStack
        align="stretch"
        gap="3"
        bg="bg.panel"
        borderWidth="1px"
        borderRadius="6px"
        p="4"
        maxW="520px"
        maxH="70vh"
      >
        <Text fontWeight="700">This value is shared</Text>
        <Text fontSize="xs" color="fg">
          {shared.length} other box{" "}
          {shared.length === 1 ? "set reads" : "sets read"} the same literal.
          Saving moves {shared.length === 1 ? "it" : "them all"}.
        </Text>

        <VStack
          align="stretch"
          gap="0"
          overflowY="auto"
          bg="bg"
          borderRadius="4px"
          p="2"
          maxH="240px"
        >
          {shared.map((impact) => (
            <Text
              key={`${impact.variant ?? "-"}/${impact.layout}/${impact.boxSet}`}
              fontSize="11px"
              color="fg.muted"
              truncate
            >
              {impact.variant === null ? "" : `${impact.variant} · `}
              {impact.layout} · {impact.boxSet}
            </Text>
          ))}
        </VStack>

        <Text fontSize="10px" color="fg.muted">
          To move only one layout, give it its own value in the source first.
        </Text>

        <HStack justify="flex-end" gap="2">
          <Button
            size="xs"
            variant="outline"
            color="fg"
            borderColor="border"
            _hover={{ bg: "bg.muted" }}
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button size="xs" onClick={onConfirm}>
            Apply to all {shared.length + 1}
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
}
