import { Box, HStack, Input, Text, VStack } from "@chakra-ui/react";

import type { BorderState } from "@cardanvil/frame-kit";
import type {
  SettingValue,
  TemplateSettingValues,
} from "@cardanvil/frame-kit/layout";

import type { SettingEntry } from "../lib/frameSettings.js";
import { ToolbarSelect } from "./ToolbarSelect.js";

/**
 * Card Anvil's border color presets — the finishes printed cards actually
 * come in. These are real border colours rather than the theme's, which is why
 * they are literals.
 */
const BORDER_COLORS = [
  "#000000",
  "#ffffff",
  "#a2adb6",
  "#808080",
  "#a6874a",
  "#f6c113",
];

export interface SettingsPanelProps {
  entries: readonly SettingEntry[];
  /** The settings in effect, in the stored shape: frame-level plus layouts. */
  values: TemplateSettingValues;
  layout: string;
  borderColor: string | null;
  borderState: BorderState;
  onBorderColorChange: (color: string | null) => void;
  onChange: (entry: SettingEntry, value: SettingValue) => void;
}

function Chip(props: {
  on: boolean;
  label: string;
  title?: string;
  onClick: () => void;
}): React.JSX.Element {
  const { on, label, title, onClick } = props;
  return (
    <Box
      as="button"
      px="2"
      py="0.5"
      borderRadius="sm"
      border="1px solid"
      borderColor={on ? "teal.fg" : "border"}
      color={on ? "teal.fg" : "fg.muted"}
      fontSize="xs"
      title={title}
      onClick={onClick}
    >
      {label}
    </Box>
  );
}

function SettingControl(props: {
  entry: SettingEntry;
  value: SettingValue | undefined;
  onChange: (value: SettingValue) => void;
}): React.JSX.Element {
  const { entry, value, onChange } = props;
  const { config } = entry;
  if (config.type === "boolean") {
    const on = value === true;
    return (
      <Chip
        on={on}
        label={config.label}
        title={config.helperText}
        onClick={() => {
          onChange(!on);
        }}
      />
    );
  }
  return (
    <HStack gap="2" w="full" title={config.helperText}>
      <Text fontSize="xs" color="fg.muted" w="80px" truncate>
        {config.label}
      </Text>
      {config.type === "select" ? (
        <ToolbarSelect
          label={config.label}
          width="150px"
          value={String(value ?? config.defaultValue)}
          options={config.options.map((option) => ({
            value: option,
            label: option,
          }))}
          onChange={onChange}
        />
      ) : (
        <Input
          size="xs"
          value={String(value ?? config.defaultValue)}
          onChange={(event) => {
            onChange(event.target.value);
          }}
        />
      )}
    </HStack>
  );
}

/**
 * The template settings the frame declares, and Card Anvil's border color.
 *
 * Together they decide the border a card is drawn with — cut away, recolored,
 * or as shipped — and so the border state text boxes' `overrides` match on,
 * along with any setting an override names.
 */
export function SettingsPanel(props: SettingsPanelProps): React.JSX.Element {
  const {
    entries,
    values,
    layout,
    borderColor,
    borderState,
    onBorderColorChange,
    onChange,
  } = props;

  const valueOf = (entry: SettingEntry): SettingValue | undefined => {
    const holder = entry.scope === "frame" ? values : values[layout];
    const value = typeof holder === "object" ? holder[entry.key] : undefined;
    return typeof value === "object" ? undefined : value;
  };
  const byScope = (scope: SettingEntry["scope"]) =>
    entries.filter((entry) => entry.scope === scope);
  const controls = (scoped: readonly SettingEntry[]) => (
    <HStack gap="1" flexWrap="wrap">
      {scoped.map((entry) => (
        <SettingControl
          key={`${entry.scope}.${entry.key}`}
          entry={entry}
          value={valueOf(entry)}
          onChange={(value) => {
            onChange(entry, value);
          }}
        />
      ))}
    </HStack>
  );

  return (
    <VStack align="stretch" gap="2" p="3" borderBottomWidth="1px">
      <Text fontSize="xs" textTransform="uppercase" color="fg.muted">
        Settings
      </Text>

      <HStack gap="1" flexWrap="wrap">
        <Text fontSize="xs" color="fg.muted" w="80px">
          border color
        </Text>
        <Chip
          on={borderColor === null}
          label="none"
          title="No border color: the ring as the frame ships it"
          onClick={() => {
            onBorderColorChange(null);
          }}
        />
        {BORDER_COLORS.map((color) => (
          <Box
            as="button"
            key={color}
            w="18px"
            h="18px"
            borderRadius="sm"
            border="2px solid"
            borderColor={borderColor === color ? "teal.fg" : "border"}
            bg={color}
            title={color}
            onClick={() => {
              onBorderColorChange(color);
            }}
          />
        ))}
        <Input
          type="color"
          size="xs"
          w="28px"
          p="0"
          title="Any other color"
          value={borderColor ?? "#000000"}
          onChange={(event) => {
            onBorderColorChange(event.target.value);
          }}
        />
      </HStack>

      {entries.length === 0 ? (
        <Text fontSize="xs" color="fg.muted">
          The frame declares no settings for this layout.
        </Text>
      ) : (
        <>
          {controls(byScope("frame"))}
          {byScope("layout").length > 0 && (
            <>
              <Text fontSize="xs" color="fg.muted">
                {layout} only
              </Text>
              {controls(byScope("layout"))}
            </>
          )}
        </>
      )}

      <Text fontSize="xs" color="fg.muted">
        Border: <b>{borderState}</b> — what text boxes&apos;{" "}
        <code>overrides</code> match on. Frame variant, nyx borders and UB
        crowns have their own controls.
      </Text>
    </VStack>
  );
}
