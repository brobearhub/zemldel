import { useId, useRef, useState } from "react";
import AccountTreeOutlined from "@mui/icons-material/AccountTreeOutlined";
import CloseRounded from "@mui/icons-material/CloseRounded";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogTitle,
  IconButton,
  Tab,
  Tabs,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { mergePastedPermittedUses } from "@/entities/land/permitted-uses";
import { LandPermittedUseChips } from "./LandPermittedUseChips";
import { LandPermittedUseTree } from "./LandPermittedUseTree";

const MAX_VALUES = 20;
const MAX_LENGTH = 300;

type Props = {
  initialValue: string[];
  onApply: (values: string[]) => void;
  onClose: () => void;
};

export function LandPermittedUsesDialog({
  initialValue,
  onApply,
  onClose,
}: Props) {
  const id = useId();
  const customRef = useRef<HTMLTextAreaElement>(null);
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"), {
    noSsr: true,
  });
  const [draft, setDraft] = useState(initialValue);
  const [tab, setTab] = useState<"tree" | "custom">("tree");
  const [custom, setCustom] = useState("");
  const [error, setError] = useState("");

  function update(next: string[]) {
    if (
      next.length > MAX_VALUES ||
      next.some((value) => value.length > MAX_LENGTH)
    ) {
      setError("Можно добавить до 20 ВРИ, каждый до 300 символов.");
      return false;
    }
    setDraft(next);
    setError("");
    return true;
  }

  function commitCustom() {
    const next = mergePastedPermittedUses(draft, custom.split(/\r\n|\r|\n/));
    if (!update(next)) return;
    setCustom("");
    return next;
  }

  function changeTab(next: "tree" | "custom") {
    setError("");
    setTab(next);
  }

  return (
    <Dialog
      open
      fullWidth
      fullScreen={fullScreen}
      maxWidth={false}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-hint`}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            maxWidth: fullScreen ? "100%" : 736,
            height: fullScreen ? "100%" : "min(720px, calc(100dvh - 64px))",
            borderRadius: fullScreen ? 0 : 3,
            overflow: "hidden",
          },
        },
      }}
    >
      <Box
        sx={{
          px: { xs: 2, sm: 3 },
          pt: { xs: 2, sm: 2.5 },
          display: "flex",
          gap: 1.5,
          alignItems: "flex-start",
        }}
      >
        <Box
          sx={{
            display: { xs: "none", sm: "grid" },
            placeItems: "center",
            width: 44,
            height: 44,
            borderRadius: 2,
            bgcolor: "action.selected",
            flexShrink: 0,
          }}
        >
          <AccountTreeOutlined />
        </Box>
        <Box sx={{ flex: 1 }}>
          <DialogTitle
            id={`${id}-title`}
            sx={{ p: 0 }}
          >
            Классификатор ВРИ
          </DialogTitle>
          <Typography
            id={`${id}-hint`}
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.5 }}
          >
            Выберите один или несколько ВРИ, указанных в документах участка.
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          aria-label="Закрыть классификатор"
          edge="end"
        >
          <CloseRounded />
        </IconButton>
      </Box>
      <Tabs
        value={tab}
        onChange={(_, next) => changeTab(next)}
        aria-label="Способ указать ВРИ"
        sx={{
          px: { xs: 2, sm: 3 },
          mt: 1,
          borderBottom: 1,
          borderColor: "divider",
          "& .MuiTab-root": { color: "text.secondary" },
          "& .Mui-selected": { color: "text.primary" },
        }}
      >
        <Tab
          id={`${id}-tree-tab`}
          aria-controls={`${id}-tree`}
          value="tree"
          label="Справочник"
        />
        <Tab
          id={`${id}-custom-tab`}
          aria-controls={`${id}-custom`}
          value="custom"
          label="Свой ВРИ"
        />
      </Tabs>
      <Box
        id={`${id}-tree`}
        role="tabpanel"
        aria-labelledby={`${id}-tree-tab`}
        hidden={tab !== "tree"}
        sx={{
          display: tab === "tree" ? "flex" : "none",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
        }}
      >
        <LandPermittedUseTree
          values={draft}
          onChange={update}
          onCustom={(text) => {
            setCustom(text);
            changeTab("custom");
            requestAnimationFrame(() => customRef.current?.focus());
          }}
        />
      </Box>
      <Box
        id={`${id}-custom`}
        role="tabpanel"
        aria-labelledby={`${id}-custom-tab`}
        hidden={tab !== "custom"}
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: "auto",
          px: { xs: 2, sm: 3 },
          py: 2,
        }}
      >
        <TextField
          fullWidth
          multiline
          minRows={2}
          maxRows={6}
          size="small"
          inputRef={customRef}
          label="Формулировка из документов"
          helperText="Если видов несколько, введите каждый с новой строки."
          value={custom}
          onChange={(event) => {
            setCustom(event.target.value);
            setError("");
          }}
        />
        <Button
          variant="outlined"
          disabled={!custom.trim()}
          onClick={commitCustom}
          sx={{
            mt: 1.5,
            color: "text.primary",
          }}
        >
          Добавить
        </Button>
      </Box>
      {error && (
        <Typography
          role="alert"
          color="error"
          variant="body2"
          sx={{
            px: { xs: 2, sm: 3 },
            py: 1,
          }}
        >
          {error}
        </Typography>
      )}
      {draft.length > 0 && (
        <Box
          sx={{
            px: { xs: 2, sm: 3 },
            py: 1.25,
            bgcolor: "action.hover",
            maxHeight: "18dvh",
            overflowY: "auto",
            flexShrink: 0,
          }}
        >
          <LandPermittedUseChips
            values={draft}
            onRemove={(value) => update(draft.filter((item) => item !== value))}
          />
        </Box>
      )}
      <DialogActions
        sx={{
          flexWrap: "wrap",
          gap: 1,
          px: { xs: 2, sm: 3 },
          py: 1.5,
          borderTop: 1,
          borderColor: "divider",
          "& > :not(style) ~ :not(style)": { ml: 0 },
          "@media (max-width: 359px)": {
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            "& > .MuiTypography-root": { gridColumn: "1 / -1" },
          },
        }}
      >
        <Typography
          aria-live="polite"
          variant="body2"
          color="text.secondary"
          sx={{
            flex: 1,
            whiteSpace: "nowrap",
          }}
        >
          Выбрано {draft.length} из {MAX_VALUES}
        </Typography>
        <Button
          onClick={onClose}
          sx={{ color: "text.primary" }}
        >
          Отмена
        </Button>
        <Button
          variant="contained"
          onClick={() => {
            const next = tab === "custom" ? commitCustom() : draft;
            if (next) onApply(next);
          }}
        >
          Применить
        </Button>
      </DialogActions>
    </Dialog>
  );
}
