import { createListCollection } from "@chakra-ui/react";
import { useMemo } from "react";

import {
  SelectContent,
  SelectItem,
  SelectRoot,
  SelectTrigger,
  SelectValueText,
} from "./ui/select.js";

export interface ToolbarSelectOption {
  readonly value: string;
  readonly label: string;
}

export interface ToolbarSelectProps {
  readonly label: string;
  readonly value: string;
  readonly options: readonly ToolbarSelectOption[];
  readonly width: string;
  readonly placeholder?: string;
  readonly onChange: (value: string) => void;
}

/**
 * One toolbar dropdown.
 *
 * Chakra v3's `Select` is a composed component over a collection, so this
 * wraps the assembly once rather than repeating it per control — and keeps
 * the array-shaped value the collection API uses from leaking into the app,
 * which only ever selects one thing.
 */
export function ToolbarSelect(props: ToolbarSelectProps): React.JSX.Element {
  const { label, value, options, width, placeholder, onChange } = props;

  const collection = useMemo(
    () =>
      createListCollection({
        items: [...options],
        itemToString: (item) => item.label,
        itemToValue: (item) => item.value,
      }),
    [options],
  );

  return (
    <SelectRoot
      collection={collection}
      size="xs"
      width={width}
      // An empty array is "nothing selected", which is what an unknown value
      // should show rather than a stale label.
      value={options.some((option) => option.value === value) ? [value] : []}
      onValueChange={(event) => {
        const [next] = event.value;
        if (next !== undefined) {
          onChange(next);
        }
      }}
    >
      <SelectTrigger aria-label={label}>
        <SelectValueText placeholder={placeholder ?? label} />
      </SelectTrigger>
      <SelectContent>
        {collection.items.map((item) => (
          <SelectItem item={item} key={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </SelectRoot>
  );
}
