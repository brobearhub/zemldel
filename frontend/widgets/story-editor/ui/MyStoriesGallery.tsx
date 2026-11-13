"use client";

import { useRef, useState, type ReactNode } from "react";
import AddIcon from "@mui/icons-material/Add";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import {
  Box,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  formatStoryRemaining,
  StoryFrame,
  StoryText,
  type StoryDto,
} from "@/entities/story";

import { PlanFeatureGate, BUSINESS_ONLY } from "@/shared/ui/PlanFeatureGate";
import { IMAGE_INPUT_ACCEPT } from "@/shared/lib/image/convert-to-webp";

const TILE_W = 200;
export const STORY_TILE_HEIGHT = 340;
const TILE_H = STORY_TILE_HEIGHT;

export type StoriesLane = "live" | "completed" | "saved";

type Props = {
  composing: boolean;
  completed: StoryDto[];
  lane: StoriesLane;
  busy: boolean;
  imageProcessing?: boolean;
  previewUrl: string | null;
  previewVideo?: boolean;
  allowVideo?: boolean;
  textFormat?: StoryDto["textFormat"];
  previewAuthor: string;
  previewText: string;
  onToggleCompose: () => void;
  onFile: (file: File | null) => void;
  onLane: (lane: "completed") => void;
  metrics?: ReactNode;
};

type StoryTileRowProps = {
  stories: StoryDto[];
  selectedId: string | null;
  busy: boolean;
  onSelect: (storyId: string) => void;
  onOpen: (storyId: string) => void;
  onRemove: (storyId: string) => void;
  saved?: boolean;
};

export function isLiveStory(story: StoryDto): boolean {
  return story.feedReason ? story.feedReason === "visible" : !story.expired;
}

export function MyStoriesGallery({
  composing,
  completed,
  lane,
  busy,
  imageProcessing,
  previewUrl,
  previewVideo,
  allowVideo,
  textFormat,
  previewAuthor,
  previewText,
  onToggleCompose,
  onFile,
  onLane,
  metrics,
}: Props) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "stretch",
        flexWrap: "wrap",
        gap: 2,
        flex: composing ? "0 0 auto" : "1 1 auto",
        width: composing ? "auto" : "100%",
      }}
    >
      <NewStoryTile
        composing={composing}
        busy={busy}
        imageProcessing={imageProcessing}
        previewUrl={previewUrl}
        previewVideo={previewVideo}
        allowVideo={allowVideo}
        textFormat={textFormat}
        previewAuthor={previewAuthor}
        previewText={previewText}
        onStart={onToggleCompose}
        onFile={onFile}
      />
      {!composing && metrics ? (
        <Box
          sx={{
            flex: "1 1 480px",
            minWidth: { xs: "100%", sm: 320 },
            height: { xs: "auto", sm: TILE_H },
          }}
        >
          {metrics}
        </Box>
      ) : null}
      {!composing && completed.length > 0 ? (
        <StatusTile
          label="Завершена"
          active={lane === "completed"}
          onClick={() => onLane("completed")}
        />
      ) : null}
    </Box>
  );
}

export function StoryTileRow({
  stories,
  selectedId,
  busy,
  onSelect,
  onOpen,
  onRemove,
  saved = false,
}: StoryTileRowProps) {
  const [menu, setMenu] = useState<{
    story: StoryDto;
    anchor: HTMLElement;
  } | null>(null);

  return (
    <Box
      sx={{
        display: "flex",
        gap: 2,
        overflowX: "auto",
        pb: 0.5,
        scrollbarWidth: "none",
        "&::-webkit-scrollbar": { display: "none" },
      }}
    >
      {stories.map((story) => (
        <OwnStoryTile
          key={story.id}
          story={story}
          busy={busy}
          selected={story.id === selectedId}
          onSelect={() => onSelect(story.id)}
          onMenu={(anchor) => setMenu({ story, anchor })}
        />
      ))}
      <Menu
        anchorEl={menu?.anchor ?? null}
        open={Boolean(menu)}
        onClose={() => setMenu(null)}
      >
        <MenuItem
          onClick={() => {
            const storyId = menu?.story.id;
            setMenu(null);
            if (storyId) onOpen(storyId);
          }}
        >
          Открыть
        </MenuItem>
        {menu && (saved || isLiveStory(menu.story)) ? (
          <MenuItem
            disabled={busy}
            onClick={() => {
              const storyId = menu.story.id;
              setMenu(null);
              onRemove(storyId);
            }}
          >
            {saved ? "Убрать из сохранённых" : "Убрать из показа"}
          </MenuItem>
        ) : null}
      </Menu>
    </Box>
  );
}

function NewStoryTile({
  composing,
  busy,
  imageProcessing,
  previewUrl,
  previewVideo,
  allowVideo,
  textFormat,
  previewAuthor,
  previewText,
  onStart,
  onFile,
}: {
  composing: boolean;
  busy: boolean;
  imageProcessing?: boolean;
  previewUrl: string | null;
  previewVideo?: boolean;
  allowVideo?: boolean;
  textFormat?: StoryDto["textFormat"];
  previewAuthor: string;
  previewText: string;
  onStart: () => void;
  onFile: (file: File | null) => void;
}) {
  const photoInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  if (!composing) {
    return (
      <Box
        component="button"
        type="button"
        onClick={onStart}
        sx={{
          width: TILE_W,
          height: 120,
          alignSelf: "center",
          flex: "0 0 auto",
          borderRadius: "20px",
          border: "1.5px dashed",
          borderColor: "primary.main",
          bgcolor: "transparent",
          color: "text.primary",
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 1.5,
          font: "inherit",
          "&:hover": {
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
          },
        }}
      >
        <AddIcon sx={{ fontSize: 40 }} />
        <Typography
          component="span"
          sx={{ fontWeight: 700, fontSize: "1.125rem" }}
        >
          Новая
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      component="label"
      sx={{
        width: TILE_W,
        height: TILE_H,
        flex: "0 0 auto",
        borderRadius: "20px",
        overflow: "hidden",
        border: previewUrl ? 0 : "1.5px dashed",
        borderColor: "primary.main",
        bgcolor: previewUrl ? "grey.900" : "transparent",
        color: "text.primary",
        cursor: busy ? "default" : "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 1.5,
        position: "relative",
      }}
    >
      {previewUrl ? (
        <StoryFrame
          imageUrl={previewVideo ? null : previewUrl}
          videoUrl={previewVideo ? previewUrl : null}
          imageAlt="Превью фото"
          sx={{ width: "100%", height: "100%" }}
        >
          <Box
            sx={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: previewVideo ? 48 : 0,
              px: 1.75,
              pt: 4,
              pb: 1.75,
              background: "linear-gradient(transparent, rgba(0,0,0,0.72))",
            }}
          >
            {previewAuthor ? (
              <Typography
                sx={{
                  fontWeight: 700,
                  fontSize: "1rem",
                  lineHeight: 1.5,
                  color: "common.white",
                }}
              >
                {previewAuthor}
              </Typography>
            ) : null}
            {previewText.trim() ? (
              <Typography
                sx={{
                  mt: 0.5,
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  fontWeight: 600,
                  fontSize: "1rem",
                  lineHeight: 1.5,
                  color: "common.white",
                  whiteSpace: "pre-wrap",
                }}
              >
                <StoryText
                  text={previewText}
                  format={textFormat}
                  interactive={false}
                />
              </Typography>
            ) : null}
          </Box>
        </StoryFrame>
      ) : (
        <>
          <AddIcon sx={{ fontSize: 40 }} />
          <Typography
            component="span"
            sx={{
              fontWeight: 700,
              fontSize: "1.125rem",
              textAlign: "center",
              px: 2,
            }}
          >
            {allowVideo ? "Загрузить фото или видео" : "Загрузить фото"}
          </Typography>
        </>
      )}
      <Box
        sx={{
          position: "absolute",
          top: 8,
          left: 8,
          right: 8,
          display: "flex",
          gap: 1,
          bgcolor: "background.paper",
          borderRadius: 1,
          p: 0.5,
        }}
      >
        <Button
          size="small"
          disabled={busy}
          loading={imageProcessing}
          onClick={() => photoInput.current?.click()}
        >
          Фото
        </Button>
        <PlanFeatureGate
          message={!allowVideo ? BUSINESS_ONLY : null}
          label="Видео"
        >
          <Button
            size="small"
            disabled={busy}
            onClick={() => videoInput.current?.click()}
          >
            Видео
          </Button>
        </PlanFeatureGate>
      </Box>
      <Box
        component="input"
        ref={photoInput}
        type="file"
        accept={IMAGE_INPUT_ACCEPT}
        aria-label="Добавить фото"
        disabled={busy}
        onChange={(event) => {
          onFile(event.target.files?.[0] ?? null);
          event.target.value = "";
        }}
        sx={{ display: "none" }}
      />
      <Box
        component="input"
        ref={videoInput}
        type="file"
        accept="video/mp4,video/quicktime,video/webm"
        aria-label="Добавить видео"
        disabled={busy || !allowVideo}
        onChange={(event) => {
          onFile(event.target.files?.[0] ?? null);
          event.target.value = "";
        }}
        sx={{ display: "none" }}
      />
    </Box>
  );
}

function StatusTile({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      aria-pressed={active}
      sx={{
        width: TILE_W,
        height: TILE_H,
        flex: "0 0 auto",
        border: 0,
        borderRadius: "20px",
        boxShadow: active
          ? (theme) =>
              `inset 0 0 0 2px ${alpha(theme.palette.text.primary, 0.35)}`
          : "none",
        bgcolor: (theme) =>
          alpha(theme.palette.common.black, active ? 0.1 : 0.055),
        color: "text.secondary",
        cursor: "pointer",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        pb: 2.5,
        font: "inherit",
        fontSize: "1rem",
        "&:hover": {
          bgcolor: (theme) => alpha(theme.palette.common.black, 0.09),
        },
      }}
    >
      {label}
    </Box>
  );
}

function OwnStoryTile({
  story,
  busy,
  selected,
  onSelect,
  onMenu,
}: {
  story: StoryDto;
  busy: boolean;
  selected: boolean;
  onSelect: () => void;
  onMenu?: (anchor: HTMLElement) => void;
}) {
  const badge = isLiveStory(story)
    ? formatStoryRemaining(story.expiresAt)
    : null;

  return (
    <Box
      className="story-tile"
      sx={{
        position: "relative",
        width: TILE_W,
        height: TILE_H,
        flex: "0 0 auto",
        opacity: 1,
        filter: selected ? "none" : "saturate(0.7)",
      }}
    >
      <Box
        component="button"
        type="button"
        onClick={onSelect}
        aria-label={story.text}
        aria-current={selected ? "true" : undefined}
        sx={{
          width: "100%",
          height: "100%",
          p: 0,
          border: 0,
          borderRadius: "20px",
          overflow: "hidden",
          cursor: "pointer",
          display: "block",
          bgcolor: "transparent",
          color: "common.white",
          textAlign: "left",
        }}
      >
        <StoryFrame
          imageUrl={story.imageUrl}
          sx={{ width: "100%", height: "100%" }}
        >
          {badge ? (
            <Box
              sx={{
                position: "absolute",
                top: 10,
                left: 10,
                zIndex: 1,
                px: 1,
                py: 0.25,
                borderRadius: 999,
                bgcolor: (theme) =>
                  alpha(theme.palette.background.default, 0.92),
                color: "text.primary",
                fontSize: "1rem",
                fontWeight: 600,
                lineHeight: 1.5,
              }}
            >
              {badge}
            </Box>
          ) : null}
          <Box
            sx={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              px: 1.75,
              pt: 4,
              pb: 1.75,
              background: story.imageUrl
                ? "linear-gradient(transparent, rgba(0,0,0,0.72))"
                : "transparent",
            }}
          >
            <Typography
              component="span"
              sx={{
                display: "-webkit-box",
                WebkitLineClamp: 4,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                fontWeight: 700,
                fontSize: "1rem",
                lineHeight: 1.5,
                color: "common.white",
                whiteSpace: "pre-wrap",
              }}
            >
              <StoryText
                text={story.text}
                format={story.textFormat}
                interactive={false}
              />
            </Typography>
          </Box>
        </StoryFrame>
      </Box>
      {onMenu ? (
        <IconButton
          aria-label={`Действия: ${story.text}`}
          size="small"
          disabled={busy}
          onClick={(event) => onMenu(event.currentTarget)}
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            zIndex: 2,
            color: "common.white",
            bgcolor: "rgba(0,0,0,0.35)",
            opacity: 0,
            pointerEvents: "none",
            ".story-tile:hover &": { opacity: 1, pointerEvents: "auto" },
            ".story-tile:focus-within &": { opacity: 1, pointerEvents: "auto" },
            "&:hover": { bgcolor: "rgba(0,0,0,0.55)" },
          }}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
      ) : null}
    </Box>
  );
}
