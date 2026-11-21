import { useMemo, useRef, useState, type ClipboardEvent } from "react";
import CloseRounded from "@mui/icons-material/CloseRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import {
  Box,
  Button,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
  type CheckboxProps,
} from "@mui/material";
import { SimpleTreeView } from "@mui/x-tree-view/SimpleTreeView";
import { TreeItem, treeItemClasses } from "@mui/x-tree-view/TreeItem";
import {
  findPermittedUse,
  getPermittedUseTree,
  mergePastedPermittedUses,
  permittedUseAncestors,
  type PermittedUseNode,
} from "@/entities/land/permitted-uses";

// A selected descendant is a separate documented use, so its parent's box stays empty.
const checkboxProps = {
  indeterminate: false,
  size: "small",
  tabIndex: -1,
} satisfies CheckboxProps;

function UseItem({
  node,
  selected,
  onToggle,
}: {
  node: PermittedUseNode;
  selected: string[];
  onToggle: (code: string) => void;
}) {
  const branch = node.children.length > 0;
  return (
    <TreeItem
      itemId={node.code}
      aria-label={`${node.code} ${node.name}`}
      aria-checked={selected.includes(node.code)}
      slotProps={{
        label: { onClick: branch ? undefined : () => onToggle(node.code) },
        checkbox: checkboxProps,
      }}
      label={
        <>
          <Box
            component="span"
            sx={{
              alignSelf: "baseline",
              flexShrink: 0,
              whiteSpace: "nowrap",
              px: 0.75,
              py: 0.125,
              borderRadius: 0.75,
              bgcolor: "action.hover",
              color: "text.secondary",
              fontSize: "0.8125rem",
              fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {node.code}
          </Box>
          <span>{node.name}</span>
        </>
      }
    >
      {branch &&
        node.children.map((child) => (
          <UseItem
            key={child.code}
            node={child}
            selected={selected}
            onToggle={onToggle}
          />
        ))}
    </TreeItem>
  );
}

type Props = {
  values: string[];
  onChange: (values: string[]) => boolean;
  onCustom: (query: string) => void;
};

export function LandPermittedUseTree({ values, onChange, onCustom }: Props) {
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [browseExpanded, setBrowseExpanded] = useState(() =>
    permittedUseAncestors(values),
  );
  const [searchExpanded, setSearchExpanded] = useState<string[]>();
  const tree = useMemo(() => getPermittedUseTree(query), [query]);
  const searching = Boolean(query.trim());
  const selected = values
    .map((value) => findPermittedUse(value)?.code)
    .filter((code): code is string => Boolean(code && tree.visible.has(code)));

  function search(text: string) {
    setQuery(text);
    setSearchExpanded(undefined);
  }

  function select(codes: string[]) {
    const keep = values.filter((value) => {
      const code = findPermittedUse(value)?.code;
      return !code || !tree.visible.has(code) || codes.includes(code);
    });
    onChange(mergePastedPermittedUses(keep, codes));
  }

  function toggle(code: string) {
    select(
      selected.includes(code)
        ? selected.filter((item) => item !== code)
        : [...selected, code],
    );
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const lines = event.clipboardData.getData("text/plain").split(/\r\n|\r|\n/);
    if (lines.length < 2) return;
    event.preventDefault();
    if (onChange(mergePastedPermittedUses(values, lines))) search("");
  }

  return (
    <>
      <Box
        sx={{
          px: { xs: 2, sm: 3 },
          py: 1.5,
        }}
      >
        <TextField
          fullWidth
          size="small"
          inputRef={searchRef}
          placeholder="Код, название или сокращение"
          value={query}
          onChange={(event) => search(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.preventDefault();
          }}
          slotProps={{
            htmlInput: {
              "aria-label": "Поиск по классификатору ВРИ",
              onPaste: handlePaste,
            },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRounded fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: query && (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="Очистить поиск"
                    edge="end"
                    size="small"
                    onClick={() => {
                      search("");
                      searchRef.current?.focus();
                    }}
                  >
                    <CloseRounded fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: "auto",
          overscrollBehavior: "contain",
          px: { xs: 1, sm: 2 },
          pb: 1.5,
        }}
      >
        {tree.roots.length ? (
          <SimpleTreeView
            aria-label="Виды разрешённого использования"
            multiSelect
            checkboxSelection
            itemChildrenIndentation={14}
            expandedItems={
              searching ? (searchExpanded ?? tree.expanded) : browseExpanded
            }
            onExpandedItemsChange={(_, codes) =>
              searching ? setSearchExpanded(codes) : setBrowseExpanded(codes)
            }
            selectedItems={selected}
            onSelectedItemsChange={(_, codes) => select(codes)}
            sx={{
              [`& .${treeItemClasses.content}`]: {
                minHeight: 44,
                gap: 0.75,
                borderRadius: 1,
              },
              [`& .${treeItemClasses.label}`]: {
                display: "flex",
                alignItems: "center",
                gap: 1,
                fontSize: "0.9375rem",
                lineHeight: 1.4,
                overflowWrap: "anywhere",
              },
              [`& > .${treeItemClasses.root} > .${treeItemClasses.content} .${treeItemClasses.label}`]:
                { fontWeight: 700 },
              [`& .${treeItemClasses.checkbox}`]: {
                p: 0.5,
                color: "text.secondary",
                "&.Mui-checked": { color: "text.primary" },
              },
              [`& .${treeItemClasses.content}[data-focused]`]: {
                outline: "2px solid",
                outlineColor: "text.secondary",
                outlineOffset: -2,
              },
            }}
          >
            {tree.roots.map((node) => (
              <UseItem
                key={node.code}
                node={node}
                selected={selected}
                onToggle={toggle}
              />
            ))}
          </SimpleTreeView>
        ) : (
          <Box
            sx={{
              py: 3,
              textAlign: "center",
            }}
          >
            <Typography
              role="status"
              variant="body2"
            >
              Совпадений в классификаторе нет
            </Typography>
            <Button onClick={() => onCustom(query.trim())}>
              Добавить свой ВРИ
            </Button>
          </Box>
        )}
      </Box>
    </>
  );
}
