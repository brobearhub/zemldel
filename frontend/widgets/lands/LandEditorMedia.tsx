import { useState, type ChangeEvent } from "react";
import {
  Box,
  Button,
  ButtonBase,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from "@mui/material";
import AddRounded from "@mui/icons-material/AddRounded";
import MoreHorizRounded from "@mui/icons-material/MoreHorizRounded";
import UploadFileOutlined from "@mui/icons-material/UploadFileOutlined";
import CloseRounded from "@mui/icons-material/CloseRounded";
import type { LandPhoto } from "@/entities/land/types";

const MAX_PHOTOS = 6;
const MAX_PHOTO_MB = 10;

type Props = {
  files: LandPhoto[];
  disabled: boolean;
  onUpload: (files: File[]) => void;
  onRemove: (id: string) => void;
};

function selectedFiles(event: ChangeEvent<HTMLInputElement>) {
  const files = Array.from(event.currentTarget.files ?? []);
  event.currentTarget.value = "";
  return files;
}

export function LandPhotos({
  files,
  disabled,
  onUpload,
  onRemove,
  onCover,
}: Props & {
  onCover: (id: string) => void;
}) {
  const [menu, setMenu] = useState<{ anchor: HTMLElement; id: string } | null>(
    null,
  );
  const [uploadError, setUploadError] = useState("");
  const uploadDisabled = disabled || files.length >= MAX_PHOTOS;

  function selectPhotos(event: ChangeEvent<HTMLInputElement>) {
    const photos = selectedFiles(event);
    if (files.length + photos.length > MAX_PHOTOS) {
      setUploadError(`К объявлению можно добавить до ${MAX_PHOTOS} фотографий.`);
      return;
    }
    const oversized = photos.find((file) => file.size > MAX_PHOTO_MB * 1024 * 1024);
    if (oversized) {
      setUploadError(`Размер файла «${oversized.name}» превышает ${MAX_PHOTO_MB} МБ.`);
      return;
    }
    setUploadError("");
    onUpload(photos);
  }

  function choose(action: (id: string) => void) {
    if (menu) action(menu.id);
    setMenu(null);
  }

  return (
    <Stack spacing={1}>
      <Typography
        variant="body2"
        sx={{ fontWeight: 700 }}
      >
        Фотографии
      </Typography>
      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        sx={{
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {files.map((photo, index) => (
          <ButtonBase
            key={photo.id}
            type="button"
            disabled={disabled}
            aria-label={`Действия с фото ${photo.filename}${index === 0 ? ", обложка" : ""}`}
            aria-haspopup="menu"
            aria-expanded={menu?.id === photo.id}
            onClick={(event) =>
              setMenu({ anchor: event.currentTarget, id: photo.id })
            }
            sx={{
              position: "relative",
              borderRadius: 1,
              "&.Mui-focusVisible": {
                outline: "2px solid",
                outlineColor: "primary.main",
              },
            }}
          >
            <Box
              component="img"
              src={photo.url}
              alt=""
              sx={{
                display: "block",
                width: 88,
                height: 60,
                borderRadius: 1,
                objectFit: "cover",
              }}
            />
            <Box
              component="span"
              sx={{
                position: "absolute",
                top: 2,
                right: 2,
                display: "grid",
                placeItems: "center",
                width: 22,
                height: 22,
                borderRadius: 1,
                bgcolor: "background.paper",
              }}
            >
              <MoreHorizRounded sx={{ fontSize: 16 }} />
            </Box>
          </ButtonBase>
        ))}
        <Button
          component="label"
          variant="outlined"
          size="small"
          startIcon={<AddRounded />}
          disabled={uploadDisabled}
        >
          Добавить фото
          <input
            hidden
            type="file"
            multiple
            disabled={uploadDisabled}
            accept="image/jpeg,image/png,image/webp"
            onChange={selectPhotos}
          />
        </Button>
      </Stack>
      <Typography
        variant="caption"
        color="text.secondary"
      >
        Первая фотография станет обложкой. До {MAX_PHOTOS} фото в JPEG, PNG или
        WebP, до {MAX_PHOTO_MB} МБ каждое.
      </Typography>
      {uploadError && (
        <Typography variant="caption" color="error" role="alert">
          {uploadError}
        </Typography>
      )}
      <Menu
        anchorEl={menu?.anchor}
        open={Boolean(menu)}
        onClose={() => setMenu(null)}
      >
        <MenuItem
          disabled={menu?.id === files[0]?.id}
          onClick={() => choose(onCover)}
        >
          Сделать обложкой
        </MenuItem>
        <MenuItem onClick={() => choose(onRemove)}>Удалить фото</MenuItem>
      </Menu>
    </Stack>
  );
}

export function LandDocuments({ files, disabled, onUpload, onRemove }: Props) {
  return (
    <Stack
      spacing={1}
      sx={{ alignItems: "flex-start" }}
    >
      <Typography
        variant="body2"
        sx={{ fontWeight: 750 }}
      >
        Документы для проверки
      </Typography>
      <Typography
        variant="caption"
        color="text.secondary"
      >
        Если у вас есть выписка из ЕГРН на участок, приложите её. Документы
        увидят только вы, менеджеры профиля и модератор.
      </Typography>
      {files.map((doc) => (
        <Stack
          key={doc.id}
          direction="row"
          sx={{
            maxWidth: "100%",
            alignItems: "center",
          }}
        >
          <Button
            component="a"
            href={doc.url}
            target="_blank"
            rel="noreferrer"
            size="small"
            sx={{ overflowWrap: "anywhere" }}
          >
            {doc.filename}
          </Button>
          <IconButton
            type="button"
            size="small"
            disabled={disabled}
            aria-label={`Удалить документ ${doc.filename}`}
            onClick={() => onRemove(doc.id)}
          >
            <CloseRounded fontSize="small" />
          </IconButton>
        </Stack>
      ))}
      <Button
        component="label"
        size="small"
        variant="outlined"
        startIcon={<UploadFileOutlined />}
        disabled={disabled}
      >
        Добавить документ
        <input
          hidden
          type="file"
          multiple
          accept="application/pdf,image/jpeg,image/png,image/webp"
          onChange={(event) => onUpload(selectedFiles(event))}
        />
      </Button>
    </Stack>
  );
}
