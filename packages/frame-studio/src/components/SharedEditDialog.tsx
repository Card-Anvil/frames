import { Button, Text, VStack } from "@chakra-ui/react";

import type { Impact } from "../api/types.js";
import {
  DialogActionTrigger,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "./ui/dialog.js";

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
 *
 * An `alertdialog` rather than a plain one: it interrupts a save the author
 * already asked for and needs an answer before anything is written. Escape and
 * the backdrop both cancel, which is the safe direction — nothing has been
 * written at this point.
 */
export function SharedEditDialog(
  props: SharedEditDialogProps,
): React.JSX.Element {
  const { shared, onConfirm, onCancel } = props;
  const many = shared.length !== 1;

  return (
    <DialogRoot
      open
      role="alertdialog"
      placement="center"
      size="sm"
      onOpenChange={(event) => {
        if (!event.open) {
          onCancel();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>This value is shared</DialogTitle>
        </DialogHeader>

        <DialogBody>
          <VStack align="stretch" gap="3">
            <DialogDescription>
              {shared.length} other box {many ? "sets read" : "set reads"} the
              same literal. Saving moves {many ? "them all" : "it"}.
            </DialogDescription>

            <VStack align="stretch" gap="0" overflowY="auto" p="2" maxH="240px">
              {shared.map((impact) => (
                <Text
                  key={`${impact.variant ?? "-"}/${impact.layout}/${impact.boxSet}`}
                  fontSize="xs"
                  color="fg.muted"
                  truncate
                >
                  {impact.variant === null ? "" : `${impact.variant} · `}
                  {impact.layout} · {impact.boxSet}
                </Text>
              ))}
            </VStack>

            <Text fontSize="xs" color="fg.muted">
              To move only one layout, give it its own value in the source
              first.
            </Text>
          </VStack>
        </DialogBody>

        <DialogFooter>
          <DialogActionTrigger asChild>
            <Button size="xs" variant="outline">
              Cancel
            </Button>
          </DialogActionTrigger>
          <Button size="xs" onClick={onConfirm}>
            Apply to all {shared.length + 1}
          </Button>
        </DialogFooter>

        <DialogCloseTrigger />
      </DialogContent>
    </DialogRoot>
  );
}
