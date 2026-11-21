"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Divider,
  IconButton,
  Paper,
  Skeleton,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import ChevronLeftRounded from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import { SITE_HEADER_SPACER_PX } from "@/shared/config/site-layout";
import { resolveAccountKind } from "@/core/auth/authorization";
import { landApi, useLandData } from "@/entities/land/api";
import {
  CATEGORY_LABELS,
  DEAL_LABELS,
  FACT_LABELS,
  formatArea,
  formatMoney,
  landPrice,
  landAddress,
  landPriceCaption,
  PURPOSE_LABELS,
  RELATION_LABELS,
  RENT_PERIODS,
  landStatusLabel,
  UTILITY_LABELS,
  type LandListing,
} from "@/entities/land/types";
import { PublicServiceRequestForm } from "@/widgets/public-service/ui/PublicServiceRequestForm";
import { cadastralNspdMapUrl } from "@/entities/request/lib/cadastral-number";
import { LandMap } from "./LandMap";

function PhotoArrow({ previous = false, onClick }: { previous?: boolean; onClick: () => void }) {
  const theme = useTheme();
  const [touchPressed, setTouchPressed] = useState(false);
  const activeBackground = alpha(theme.palette.background.paper, 0.85);
  const background = touchPressed ? activeBackground : alpha(theme.palette.background.paper, 0.6);

  return (
    <IconButton
      aria-label={previous ? "Предыдущее фото" : "Следующее фото"}
      onClick={onClick}
      onPointerDown={(event) => setTouchPressed(event.pointerType !== "mouse")}
      onPointerUp={() => setTouchPressed(false)}
      onPointerCancel={() => setTouchPressed(false)}
      sx={{
        position: "absolute",
        bottom: 12,
        [previous ? "left" : "right"]: 12,
        borderRadius: "50%",
        bgcolor: background,
        color: "text.primary",
        boxShadow: 1,
        "&:hover": { bgcolor: background },
        "@media (hover: hover)": {
          "&:hover": { bgcolor: activeBackground },
        },
        "&:active": { bgcolor: activeBackground },
        "&.Mui-focusVisible": { outline: "2px solid currentColor", outlineOffset: 2 },
      }}
    >
      {previous ? <ChevronLeftRounded /> : <ChevronRightRounded />}
    </IconButton>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: {
          xs: 2,
          md: 3,
        },
        borderRadius: 2,
      }}
    >
      <Typography
        component="h2"
        variant="h6"
        sx={{
          mb: 2,
        }}
      >
        {title}
      </Typography>
      {children}
    </Paper>
  );
}
function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={1}
      sx={{
        py: 1.5,
        borderBottom: 1,
        borderColor: "divider",
        justifyContent: "space-between",
        overflowWrap: "anywhere",
      }}
    >
      <Typography
        variant="body2"
        color="text.secondary"
      >
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          fontWeight: 600,
          textAlign: {
            sm: "right",
          },
          maxWidth: {
            sm: "65%",
          },
          whiteSpace: "pre-wrap",
        }}
      >
        {value || "Не указано"}
      </Typography>
    </Stack>
  );
}
export function LandDetail({
  id,
  admin = false,
}: {
  id: string;
  admin?: boolean;
}) {
  const params = useSearchParams();
  const path = `/${id}${params.get("published") === "1" ? "?published=1" : ""}`;
  const { data, loadedPath, error, refresh } = useLandData<
    LandListing | { status: "UNAVAILABLE" }
  >(path);
  const { data: session } = useSession();
  const router = useRouter();
  const theme = useTheme();
  const fullScreenGallery = useMediaQuery(theme.breakpoints.down("md"));
  const mainPhotoRef = useRef<HTMLImageElement>(null);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false),
    [actionError, setActionError] = useState("");
  const [gallery, setGallery] = useState(false),
    [request, setRequest] = useState(false),
    [showPhone, setShowPhone] = useState(false),
    [saved, setSaved] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  useEffect(() => {
    setSaved(
      data && data.status !== "UNAVAILABLE" ? Boolean(data.favorite) : false,
    );
  }, [data]);
  const from = params.get("from");
  const back = from && /^\/lands(?:\?|$)/.test(from) ? from : "/lands";
  const detailPath = from === back ? `/lands/${id}?from=${encodeURIComponent(back)}` : `/lands/${id}`;
  if (loadedPath !== path && !error)
    return (
      <Skeleton
        variant="rounded"
        height={500}
        sx={{
          m: 3,
        }}
      />
    );
  if (error)
    return (
      <Alert
        severity="error"
        sx={{
          m: 3,
        }}
        action={<Button onClick={refresh}>Повторить</Button>}
      >
        {error}
      </Alert>
    );
  if (!data) return null;
  if (data.status === "UNAVAILABLE")
    return (
      <Stack
        spacing={2}
        sx={{
          p: 4,
        }}
      >
        <Typography variant="h4">Предложение больше не доступно</Typography>
        <Button
          component={Link}
          href={back}
        >
          Вернуться к поиску
        </Button>
      </Stack>
    );
  const row = data;
  const d = row.details;
  const photos = row.photos;
  const coverPhoto = photos[0];
  const photoIndex = Math.max(0, photos.findIndex((photo) => photo.id === selectedPhotoId));
  const currentPhoto = photos[photoIndex];

  function stepPhoto(offset: number) {
    const index = (photoIndex + offset + photos.length) % photos.length;
    setSelectedPhotoId(photos[index].id);
  }

  function showThumbnail(photoId: string) {
    setSelectedPhotoId(photoId);
    mainPhotoRef.current?.focus({ preventScroll: true });
    mainPhotoRef.current?.scrollIntoView({ block: "nearest" });
  }

  function discussSelection() {
    if (session?.user && resolveAccountKind(session.user) === "PROVIDER") {
      setActionError(
        "Для заявки на подбор переключитесь на «Клиент» в меню профиля.",
      );
      return;
    }
    setActionError("");
    setRequest(true);
  }
  async function contact() {
    if (!session?.user) {
      router.push(`/signin?returnTo=${encodeURIComponent(detailPath)}`);
      return;
    }
    setBusy(true);
    setActionError("");
    try {
      const { conversationId } = await landApi<{ conversationId: string }>(
        `/${id}/conversation`,
        { method: "POST", body: "{}" },
      );
      router.push(
        `${resolveAccountKind(session.user) === "PROVIDER" ? "/pro" : "/profile"}/chats/direct/${conversationId}`,
      );
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Не удалось открыть переписку",
      );
    } finally {
      setBusy(false);
    }
  }
  async function favorite() {
    if (!session?.user) {
      router.push(`/signin?returnTo=${encodeURIComponent(detailPath)}`);
      return;
    }
    if (favoriteBusy) return;
    setFavoriteBusy(true);
    setActionError("");
    try {
      await landApi(`/${id}/favorite`, {
        method: "POST",
        body: JSON.stringify({ enabled: !saved }),
      });
      setSaved(!saved);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Не удалось сохранить");
    } finally {
      setFavoriteBusy(false);
    }
  }
  return (
    <Stack
      spacing={3}
      sx={{
        maxWidth: 1200,
        mx: "auto",
        px: {
          xs: 2,
          md: 3,
        },
        py: 3,
      }}
    >
      <Stack
        direction="row"
        sx={{
          justifyContent: "space-between",
        }}
      >
        <Button
          component={Link}
          href={back}
        >
          ← Все предложения
        </Button>
        {row.status === "PUBLISHED" ? (
          <Button
            loading={favoriteBusy}
            onClick={() => void favorite()}
          >
            {saved ? "Убрать из избранного" : "В избранное"}
          </Button>
        ) : null}
      </Stack>
      {row.status !== "PUBLISHED" ? (
        <Alert severity="info">
          {landStatusLabel(row)}. {row.hasPublishedVersion
            ? "Покупатели видят последнюю одобренную версию объявления."
            : "Предложение не показывается в публичном каталоге."}
          {row.hasPublishedVersion && (
            <Box sx={{ mt: 0.5 }}>
              <Link href={{ pathname: `/lands/${id}`, query: { published: "1", ...(from === back && { from: back }) } }}>
                Открыть опубликованную версию
              </Link>
            </Box>
          )}
        </Alert>
      ) : null}
      <Box>
        <Stack
          direction="row"
          useFlexGap
          spacing={1}
          sx={{
            flexWrap: "wrap",
            mb: 1,
          }}
        >
          <Chip
            label={
              row.kind === "SELECTION"
                ? "Подбор участка"
                : DEAL_LABELS[row.dealType]
            }
          />
          {row.purposes.map((p) => (
            <Chip
              key={p}
              variant="outlined"
              label={PURPOSE_LABELS[p]}
            />
          ))}
        </Stack>
        <Typography
          variant="h4"
          component="h1"
          sx={{
            fontWeight: 800,
          }}
        >
          {row.title || "Без названия"}
        </Typography>
        <Typography
          color="text.secondary"
          sx={{
            mt: 1,
          }}
        >
          {row.kind === "SELECTION"
            ? d.allRussia
              ? "Вся Россия"
              : row.places.map((p) => p.name).join(", ")
            : landAddress(row)}
        </Typography>
      </Box>
      <Dialog
        open={gallery}
        onClose={() => setGallery(false)}
        maxWidth="md"
        fullWidth
        fullScreen={fullScreenGallery}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
            pr: 1,
          }}
        >
          <DialogTitle sx={{ px: { xs: 2, md: 3 } }}>Фотографии участка</DialogTitle>
          <IconButton aria-label="Закрыть галерею" onClick={() => setGallery(false)}>
            <CloseRounded />
          </IconButton>
        </Box>
        <DialogContent sx={{ pt: 0, px: { xs: 2, md: 3 } }}>
          <Stack spacing={2}>
            {photos.map((photo) => (
              <Box
                component="img"
                key={photo.id}
                src={photo.url}
                alt={photo.filename}
                sx={{
                  width: "100%",
                  borderRadius: 1,
                }}
              />
            ))}
          </Stack>
        </DialogContent>
      </Dialog>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            md: "minmax(0, 1fr) 320px",
          },
          gridTemplateAreas: {
            md: currentPhoto
              ? '"photo price" "details thumbnails" "details date"'
              : '"details price" "details date"',
          },
          gridTemplateRows: { md: currentPhoto ? "auto auto 1fr" : "auto 1fr" },
          columnGap: 3,
          rowGap: 2,
          alignItems: "start",
        }}
      >
        {currentPhoto ? (
          <Box
            sx={{
              gridArea: { md: "photo" },
              position: "relative",
              alignSelf: "stretch",
              minHeight: { md: 420 },
            }}
          >
            <Box
              component="img"
              ref={mainPhotoRef}
              tabIndex={-1}
              src={currentPhoto.url}
              alt={`${row.title || "Объявление"} — фото ${photoIndex + 1} из ${photos.length}`}
              sx={{
                display: "block",
                position: { md: "absolute" },
                inset: { md: 0 },
                width: "100%",
                height: {
                  xs: 260,
                  md: "100%",
                },
                objectFit: "cover",
                borderRadius: 2,
                scrollMarginTop: {
                  xs: `${SITE_HEADER_SPACER_PX.xs}px`,
                  sm: `${SITE_HEADER_SPACER_PX.sm}px`,
                },
              }}
            />
            {photos.length > 1 && (
              <>
                <PhotoArrow previous onClick={() => stepPhoto(-1)} />
                <PhotoArrow onClick={() => stepPhoto(1)} />
              </>
            )}
            <Button
              variant="contained"
              onClick={() => setGallery(true)}
              sx={{
                position: "absolute",
                right: 16,
                top: 16,
                bgcolor: alpha(theme.palette.primary.main, 0.2),
                "@media (hover: none)": {
                  "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.2) },
                },
                "@media (hover: hover)": {
                  "&:hover": { bgcolor: "primary.main" },
                },
                "&:active, &.Mui-focusVisible": { bgcolor: "primary.main" },
              }}
            >
              Все фото · {photos.length}
            </Button>
          </Box>
        ) : null}
        {photos.length > 0 && (
          <Box
            role="group"
            aria-label="Миниатюры фотографий объявления"
            sx={{
              gridArea: { md: "thumbnails" },
              display: { xs: "flex", md: "grid" },
              gridTemplateColumns: { md: "repeat(auto-fill, minmax(80px, 1fr))" },
              minWidth: 0,
              overflowX: { xs: "auto", md: "visible" },
              overscrollBehaviorX: "contain",
              gap: 1,
            }}
          >
            {photos.map((photo, index) => (
              <ButtonBase
                key={photo.id}
                aria-label={`Показать фото ${index + 1} из ${photos.length}`}
                aria-pressed={index === photoIndex}
                onClick={() => showThumbnail(photo.id)}
                sx={{
                  aspectRatio: "3 / 2",
                  flex: "0 0 96px",
                  overflow: "hidden",
                  borderRadius: 1,
                  border: "2px solid transparent",
                  '&[aria-pressed="true"]': {
                    borderColor: "text.primary",
                  },
                  "&.Mui-focusVisible": {
                    outline: "2px solid",
                    outlineColor: "text.primary",
                    outlineOffset: { xs: -2, md: 2 },
                  },
                }}
              >
                <Box
                  component="img"
                  src={photo.url}
                  alt=""
                  sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </ButtonBase>
            ))}
          </Box>
        )}
        <Paper
          elevation={0}
          sx={{
            gridArea: { md: "price" },
            alignSelf: { md: "stretch" },
            position: "relative",
            overflowWrap: "anywhere",
            p: 3,
            borderRadius: 2,
          }}
        >
          {coverPhoto && (
            <Box
              component="img"
              src={coverPhoto.url}
              alt=""
              sx={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                borderRadius: "inherit",
                opacity: 0.05,
                pointerEvents: "none",
              }}
            />
          )}
          <Stack spacing={2} sx={{ position: "relative" }}>
            <Typography
              sx={{
                fontSize: "2rem",
                fontWeight: 800,
              }}
            >
              {landPrice(row)}
            </Typography>
            <Typography color="text.secondary">
              {landPriceCaption(row)}
            </Typography>
            {d.negotiable ? (
              <Typography variant="body2">Возможен торг</Typography>
            ) : null}
            <Divider />
            <Typography
              sx={{
                fontWeight: 700,
              }}
            >
              {row.authorName}
            </Typography>
            {row.kind === "SALE" ? (
              <Typography
                variant="body2"
                color="text.secondary"
              >
                {RELATION_LABELS[row.sellerRelation]} ·{" "}
                {row.provider ? "Профиль исполнителя" : "Личный профиль"}
              </Typography>
            ) : null}
            {row.provider ? (
              <Button
                component={Link}
                href={`/providers/${row.provider.slug}`}
                variant="outlined"
              >
                Профиль исполнителя
              </Button>
            ) : null}
            {row.canManage ? (
              <Button
                component={Link}
                href={`/lands/${id}/edit`}
                variant="contained"
              >
                Редактировать объявление
              </Button>
            ) : !admin && row.status === "PUBLISHED" ? (
              <>
                <Button
                  variant="contained"
                  loading={busy}
                  onClick={() =>
                    row.kind === "SELECTION"
                      ? discussSelection()
                      : void contact()
                  }
                >
                  {row.kind === "SELECTION"
                    ? "Обсудить подбор"
                    : "Написать продавцу"}
                </Button>
                {row.showPhone && row.phone ? (
                  showPhone ? (
                    <Button
                      component="a"
                      href={`tel:${row.phone.replace(/[^+\d]/g, "")}`}
                      variant="outlined"
                    >
                      {row.phone}
                    </Button>
                  ) : (
                    <Button
                      variant="outlined"
                      onClick={() => setShowPhone(true)}
                    >
                      Показать телефон
                    </Button>
                  )
                ) : null}
              </>
            ) : null}
            {actionError ? (
              <Alert severity="error">{actionError}</Alert>
            ) : null}
          </Stack>
        </Paper>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ gridArea: { md: "date" } }}
        >
          {row.publishedAt
            ? `Опубликовано ${new Date(row.publishedAt).toLocaleDateString("ru-RU")}`
            : "Ещё не опубликовано"}
        </Typography>
        <Stack
          spacing={3}
          sx={{
            gridArea: { md: "details" },
          }}
        >
          {row.kind === "SALE" ? (
            <>
              <Section title="Об участке">
                <Fact
                  label={
                    row.dealType === "SHARE"
                      ? "Площадь всего участка"
                      : "Площадь"
                  }
                  value={`${formatArea(row.areaM2)}${row.areaM2 ? ` · ${row.areaM2.toLocaleString("ru-RU")} м²` : ""}`}
                />
                <Fact
                  label="Кадастровый номер"
                  value={row.cadastralNumber}
                />
                <Fact
                  label="Категория земли"
                  value={CATEGORY_LABELS[row.category]}
                />
                <Fact
                  label="Виды разрешённого использования"
                  value={row.permittedUses.join("; ")}
                />
                <Fact
                  label="Границы установлены"
                  value={FACT_LABELS[d.boundaries ?? "UNKNOWN"]}
                />
              </Section>
              {row.dealType === "SHARE" ? (
                <Section title="Условия продажи доли">
                  <Fact
                    label="Доля в праве"
                    value={`${d.shareNumerator}/${d.shareDenominator}`}
                  />
                  <Fact
                    label="Порядок пользования"
                    value={d.useAgreement}
                  />
                  <Fact
                    label="Уведомления сособственников"
                    value={d.coOwnerNotice}
                  />
                  <Alert
                    severity="info"
                    sx={{
                      mt: 2,
                    }}
                  >
                    Доля в праве не является выделенным участком. Площадь выше
                    относится ко всему кадастровому участку.
                  </Alert>
                </Section>
              ) : null}
              {row.dealType === "LEASE_ASSIGNMENT" ? (
                <Section title="Права и обязанности арендатора">
                  <Fact
                    label="Плата за уступку"
                    value={formatMoney(row.priceRubles)}
                  />
                  <Fact
                    label="Арендная плата отдельно"
                    value={`${formatMoney(d.rentRubles ?? null)} / ${RENT_PERIODS[d.rentPeriod ?? "MONTH"]}`}
                  />
                  <Fact
                    label="Срок договора"
                    value={
                      d.leaseIndefinite ? "Неопределённый срок" : d.leaseUntil
                    }
                  />
                  <Fact
                    label="Арендодатель"
                    value={d.landlord}
                  />
                  <Fact
                    label="Условия передачи"
                    value={d.transferConditions}
                  />
                  <Fact
                    label="Согласие / уведомление"
                    value={d.landlordConsent}
                  />
                  <Fact
                    label="Дополнительные платежи"
                    value={d.extraPayments}
                  />
                  <Fact
                    label="Задолженность"
                    value={d.arrears}
                  />
                </Section>
              ) : null}
              {row.latitude != null && row.longitude != null ? (
                <Section title="Расположение">
                  <Typography
                    sx={{
                      mb: 2,
                    }}
                  >
                    {landAddress(row)}
                  </Typography>
                  <LandMap
                    point={{ latitude: row.latitude, longitude: row.longitude }}
                  />
                  <Typography variant="caption">
                    Местоположение указано автором. Кадастровый контур не
                    подтверждён.
                  </Typography>
                  <Button
                    component="a"
                    href={cadastralNspdMapUrl(row.cadastralNumber)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Проверить в НСПД
                  </Button>
                </Section>
              ) : null}
              <Section title="Документы и ограничения">
                <Fact
                  label="Документы предоставлены"
                  value={
                    row.documentCount
                      ? `${row.documentCount} · хранятся непублично`
                      : "Не предоставлены"
                  }
                />
                <Fact
                  label="Известные автору ограничения"
                  value={FACT_LABELS[d.restrictions ?? "UNKNOWN"]}
                />
                {d.restrictionsDescription ? (
                  <Typography
                    sx={{
                      mt: 2,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {d.restrictionsDescription}
                  </Typography>
                ) : null}
                <Alert
                  severity={
                    row.documentStatus === "VERIFIED" ? "success" : "info"
                  }
                  sx={{
                    mt: 2,
                  }}
                >
                  {row.documentStatus === "VERIFIED"
                    ? `Модератор проверил документы ${row.documentReviewedAt ? new Date(row.documentReviewedAt).toLocaleDateString("ru-RU") : ""}. Предмет и результат: ${row.documentReviewScope}`
                    : "Проверка документов не подтверждена. Сведения об участке указаны автором."}
                </Alert>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mt: 2,
                  }}
                >
                  Возможность строительства зависит от ПЗЗ и ограничений
                  конкретного участка. Модерация объявления не подтверждает
                  право собственности.
                </Typography>
              </Section>
              <Section title="Коммуникации, подъезд и постройки">
                {Object.entries({
                  electricity: "Электричество",
                  gas: "Газ",
                  water: "Вода",
                  sewerage: "Канализация",
                }).map(([key, label]) => (
                  <Fact
                    key={key}
                    label={label}
                    value={
                      UTILITY_LABELS[
                        (d[key as keyof typeof d] as string) ?? "UNKNOWN"
                      ]
                    }
                  />
                ))}
                {d.powerKw != null ? (
                  <Fact
                    label="Мощность"
                    value={`${d.powerKw} кВт`}
                  />
                ) : null}
                <Fact
                  label="Подъезд"
                  value={d.access}
                />
                <Fact
                  label="Постройки"
                  value={FACT_LABELS[d.buildings ?? "UNKNOWN"]}
                />
                {d.buildingsDescription ? (
                  <Fact
                    label="Описание построек"
                    value={d.buildingsDescription}
                  />
                ) : null}
                <Fact
                  label="Входит в предложение"
                  value={d.included}
                />
              </Section>
            </>
          ) : (
            <>
              <Section title="Состав и результат подбора">
                <Fact
                  label="Состав работы"
                  value={d.scope}
                />
                <Fact
                  label="Результат для клиента"
                  value={d.result}
                />
                <Fact
                  label="Срок"
                  value={d.timeline}
                />
              </Section>
            </>
          )}
          <Section title="Описание">
            <Typography
              sx={{
                whiteSpace: "pre-wrap",
                overflowWrap: "anywhere",
              }}
            >
              {row.description || "Автор пока не добавил описание"}
            </Typography>
          </Section>
          {row.documents?.length ? (
            <Section title="Ваши непубличные документы">
              <Stack spacing={1}>
                {row.documents.map((doc) => (
                  <Button
                    key={doc.id}
                    component="a"
                    href={doc.url}
                  >
                    {doc.filename}
                  </Button>
                ))}
              </Stack>
              <Typography variant="caption">
                Файлы доступны автору и модератору. Покупатели их не видят.
              </Typography>
            </Section>
          ) : null}
        </Stack>
      </Box>
      <Dialog
        open={request}
        onClose={() => setRequest(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Обсудить подбор участка</DialogTitle>
        <DialogContent>
          {row.serviceId ? (
            <>
              <Typography
                sx={{
                  mb: 2,
                }}
              >
                В сообщении укажите цель покупки, район, бюджет участка и
                пожелания. Заявка будет связана с услугой «{row.title}».
              </Typography>
              <PublicServiceRequestForm
                serviceId={row.serviceId}
                isAuthenticated={Boolean(session?.user)}
                initialCustomerName={session?.user?.name}
                initialCustomerEmail={session?.user?.email}
              />
            </>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRequest(false)}>Закрыть</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
