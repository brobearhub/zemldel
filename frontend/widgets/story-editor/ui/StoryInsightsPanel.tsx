"use client";

import { useState, type ReactNode } from "react";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { Avatar, Box, Paper, Stack, Typography } from "@mui/material";
import { AppDateField } from "@/shared/ui/date-field";
import { alpha, useTheme } from "@mui/material/styles";
import type { StoryInsightsDto, StoryReplyMessageDto } from "@/entities/story";
import {
  buildHourlyChart,
  buildInsightTiles,
  buildViewMix,
  HOURLY_RANGES,
  viewsWord,
  type HourlyChart,
  type HourlyRangeId,
  type InsightTileId,
  type ViewMix,
  type ViewMixSliceId,
} from "../lib/story-insights";
import { StoryReplyChat } from "./StoryReplyChat";

type Props = {
  insights: StoryInsightsDto | null;
  stories?: ReactNode;
  storyText?: string;
  storyPublishedAt?: string | null;
  replyMessages?: StoryReplyMessageDto[];
  replySending?: boolean;
  onOpenReply?: (replyId: string) => void;
  onCloseReply?: () => void;
  onSendReply?: (text: string) => void;
};

const AXIS_HOURS = new Set([0, 6, 12, 18, 23]);
const CHART_HEIGHT = 112;

/** Высота ряда задаётся левым списком; справа карточка только заполняет её. */
const rightPaneSx = {
  height: { xs: "auto", md: 0 },
  minHeight: { md: "100%" },
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
  overflow: "auto",
} as const;

export function StoryInsightsPanel({ insights, stories, ...replyChat }: Props) {
  return (
    <Stack spacing={2}>
      <Typography variant="h6" sx={{ fontWeight: 700, color: "primary.dark" }}>
        Статистика
      </Typography>
      {stories}
      {insights ? <InsightsFigures insights={insights} {...replyChat} /> : null}
    </Stack>
  );
}

function InsightsFigures({
  insights,
  storyText = "",
  storyPublishedAt = null,
  replyMessages = [],
  replySending = false,
  onOpenReply,
  onCloseReply,
  onSendReply,
}: { insights: StoryInsightsDto } & Omit<Props, "insights" | "stories">) {
  const [openId, setOpenId] = useState<InsightTileId | null>(null);
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [range, setRange] = useState<HourlyRangeId>("today");
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const tiles = buildInsightTiles(insights, new Date());
  const hourly = buildHourlyChart(insights.hourly, range, new Date(), { from: rangeFrom, to: rangeTo });
  const maxBar = Math.max(...hourly.bars.map((bar) => bar.count), 1);
  const selectedTileId = openId ?? tiles[0]?.id ?? null;
  const openTile = tiles.find((tile) => tile.id === selectedTileId) ?? null;
  const viewMix = buildViewMix(insights);

  function selectTile(id: InsightTileId) {
    setOpenId(id);
    setActiveReplyId(null);
    onCloseReply?.();
  }

  const activeReply = openTile?.id === "replies" ? insights.replies.find((reply) => reply.id === activeReplyId) ?? null : null;

  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, bgcolor: "common.white" }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "minmax(240px, 300px) minmax(0, 1fr)" },
            gap: { xs: 3, md: 4 },
            alignItems: "start",
          }}
        >
          <ViewsMix mix={viewMix} periodLabel={hourly.periodLabel} />
          <HourlyViews
            hourly={hourly}
            range={range}
            rangeFrom={rangeFrom}
            rangeTo={rangeTo}
            maxBar={maxBar}
            onRange={setRange}
            onRangeFrom={setRangeFrom}
            onRangeTo={setRangeTo}
          />
        </Box>
      </Paper>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: openTile ? { xs: "1fr", md: "minmax(240px, 340px) minmax(0, 1fr)" } : "1fr",
          gap: 1.5,
          alignItems: "stretch",
        }}
      >
        <Paper variant="outlined" sx={{ p: 1, borderRadius: 3, bgcolor: (theme) => alpha(theme.palette.common.white, 0.72) }}>
          {tiles.map((tile) => {
            const open = tile.id === selectedTileId;
            return (
              <Box
                key={tile.id}
                component="button"
                type="button"
                aria-pressed={open}
                onClick={() => selectTile(tile.id)}
                sx={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1,
                  px: 1.5,
                  py: 1.5,
                  border: 0,
                  borderRadius: 2,
                  cursor: "pointer",
                  font: "inherit",
                  textAlign: "left",
                  color: "primary.dark",
                  bgcolor: open ? "common.white" : "transparent",
                }}
              >
                <Typography sx={{ fontWeight: open ? 700 : 500 }}>{tile.label}</Typography>
                <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", color: "primary.dark" }}>
                  <Typography sx={{ fontWeight: 700 }}>{tile.count}</Typography>
                  <ChevronRightIcon fontSize="small" />
                </Stack>
              </Box>
            );
          })}
        </Paper>

        {openTile && activeReply ? (
          <Box sx={rightPaneSx}>
            <StoryReplyChat
              name={activeReply.name}
              initial={activeReply.name.trim().charAt(0).toLocaleUpperCase("ru-RU") || "?"}
              replyText={activeReply.text}
              replyAt={activeReply.createdAt}
              storyText={storyText}
              storyPublishedAt={storyPublishedAt}
              messages={replyMessages}
              sending={replySending}
              onBack={() => {
                setActiveReplyId(null);
                onCloseReply?.();
              }}
              onSend={(text) => onSendReply?.(text)}
            />
          </Box>
        ) : null}

        {openTile && !activeReply ? (
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, bgcolor: "common.white", ...rightPaneSx }}>
            <Typography sx={{ fontWeight: 700, color: "primary.dark", mb: 1 }}>
              {openTile.label} · {openTile.count}
            </Typography>
            <Stack divider={<Box sx={{ borderBottom: 1, borderColor: "divider" }} />}>
              {openTile.rows.map((row) => {
                const replyRow = openTile.id === "replies";
                return (
                  <Stack
                    key={row.key}
                    component={replyRow ? "button" : "div"}
                    type={replyRow ? "button" : undefined}
                    direction="row"
                    spacing={1.5}
                    onClick={
                      replyRow
                        ? () => {
                            setActiveReplyId(row.key);
                            onOpenReply?.(row.key);
                          }
                        : undefined
                    }
                    sx={{
                      alignItems: "center",
                      py: 1.5,
                      width: "100%",
                      border: 0,
                      bgcolor: "transparent",
                      textAlign: "left",
                      font: "inherit",
                      color: "inherit",
                      cursor: replyRow ? "pointer" : "default",
                    }}
                  >
                    <Avatar
                      sx={{
                        width: 36,
                        height: 36,
                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.16),
                        color: "primary.dark",
                        fontSize: 14,
                        fontWeight: 700,
                      }}
                    >
                      {row.initial}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 700 }}>{row.name}</Typography>
                      {row.detail ? (
                        <Typography variant="body2" sx={{ color: "text.secondary" }}>
                          {row.detail}
                        </Typography>
                      ) : null}
                    </Box>
                    <Typography variant="body2" sx={{ color: "text.secondary", flexShrink: 0 }}>
                      {row.when}
                    </Typography>
                  </Stack>
                );
              })}
            </Stack>
          </Paper>
        ) : null}
      </Box>
    </Stack>
  );
}

const DONUT_SIZE = 156;
const DONUT_STROKE = 18;

const SLICE_COLOR: Record<ViewMixSliceId, "success" | "primary" | "soft"> = {
  users: "success",
  guests: "primary",
  repeats: "soft",
};

function ViewsMix({ mix, periodLabel }: { mix: ViewMix; periodLabel: string }) {
  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "baseline", gap: 1 }}>
        <Typography sx={{ fontWeight: 700, color: "primary.dark" }}>Просмотры</Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {periodLabel}
        </Typography>
      </Stack>
      <ViewDonut mix={mix} />
      <Stack>
        {mix.slices.map((slice) => (
          <Stack
            key={slice.id}
            direction="row"
            spacing={1}
            sx={{
              alignItems: "center",
              py: 1,
              borderTop: 1,
              borderColor: "divider",
            }}
          >
            <MixDot kind={slice.id} />
            <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }}>
              {slice.label}
            </Typography>
            <Typography variant="body2" sx={{ width: 44, textAlign: "right", color: "text.secondary" }}>
              {slice.percent}%
            </Typography>
            <Typography variant="body2" sx={{ width: 28, textAlign: "right", fontWeight: 700 }}>
              {slice.count}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
}

function ViewDonut({ mix }: { mix: ViewMix }) {
  const theme = useTheme();
  const colorOf = (id: ViewMixSliceId) => {
    if (id === "users") return theme.palette.success.main;
    if (id === "guests") return theme.palette.primary.main;
    return alpha(theme.palette.primary.main, 0.35);
  };
  const radius = (DONUT_SIZE - DONUT_STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const visible = mix.slices.filter((slice) => slice.count > 0);
  const gap = visible.length > 1 ? 4 : 0;
  let cursor = 0;
  const arcs = visible.map((slice) => {
    const span = (slice.count / Math.max(mix.total, 1)) * circumference;
    const arc = { id: slice.id, dash: gap === 0 ? circumference : Math.max(span - gap, 1), offset: cursor };
    cursor += span;
    return arc;
  });
  const summary = mix.slices.map((slice) => `${slice.label} ${slice.count}`).join(", ");

  return (
    <Box
      role="img"
      aria-label={`${mix.total} ${viewsWord(mix.total)}. ${summary}`}
      sx={{ position: "relative", width: DONUT_SIZE, height: DONUT_SIZE, mx: "auto" }}
    >
      <Box
        component="svg"
        viewBox={`0 0 ${DONUT_SIZE} ${DONUT_SIZE}`}
        aria-hidden
        sx={{ display: "block", transform: "rotate(-90deg)" }}
      >
        <circle
          cx={DONUT_SIZE / 2}
          cy={DONUT_SIZE / 2}
          r={radius}
          fill="none"
          stroke={alpha(theme.palette.primary.main, 0.16)}
          strokeWidth={DONUT_STROKE}
        />
        {arcs.map((arc) => (
          <circle
            key={arc.id}
            cx={DONUT_SIZE / 2}
            cy={DONUT_SIZE / 2}
            r={radius}
            fill="none"
            stroke={colorOf(arc.id)}
            strokeWidth={DONUT_STROKE}
            strokeDasharray={`${arc.dash} ${circumference}`}
            strokeDashoffset={-arc.offset}
          />
        ))}
      </Box>
      <Stack
        sx={{
          position: "absolute",
          inset: 0,
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <Typography sx={{ fontSize: 40, fontWeight: 700, lineHeight: 1, color: "text.primary" }}>
          {mix.total}
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.25 }}>
          {viewsWord(mix.total)}
        </Typography>
      </Stack>
    </Box>
  );
}

function MixDot({ kind }: { kind: ViewMixSliceId }) {
  const tone = SLICE_COLOR[kind];
  return (
    <Box
      sx={{
        width: 8,
        height: 8,
        borderRadius: "50%",
        flexShrink: 0,
        boxSizing: "border-box",
        bgcolor: tone === "success" ? "success.main" : tone === "primary" ? "primary.main" : "transparent",
        border: tone === "soft" ? "1.5px solid" : 0,
        borderColor: (theme) => alpha(theme.palette.primary.main, 0.7),
      }}
    />
  );
}

function HourlyViews({
  hourly,
  range,
  rangeFrom,
  rangeTo,
  maxBar,
  onRange,
  onRangeFrom,
  onRangeTo,
}: {
  hourly: HourlyChart;
  range: HourlyRangeId;
  rangeFrom: string;
  rangeTo: string;
  maxBar: number;
  onRange: (range: HourlyRangeId) => void;
  onRangeFrom: (value: string) => void;
  onRangeTo: (value: string) => void;
}) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        sx={{ justifyContent: "space-between", alignItems: { sm: "center" }, mb: 1.5 }}
      >
        <Typography sx={{ fontWeight: 700, color: "primary.dark" }}>Просмотры по часам</Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {hourly.caption}
        </Typography>
      </Stack>
      <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", mb: range === "custom" ? 1.5 : 2 }}>
        {HOURLY_RANGES.map((item) => {
          const selected = item.id === range;
          return (
            <Box
              key={item.id}
              component="button"
              type="button"
              aria-pressed={selected}
              onClick={() => onRange(item.id)}
              sx={{
                border: 0,
                borderRadius: 999,
                px: 1.5,
                py: 0.75,
                cursor: "pointer",
                font: "inherit",
                fontSize: 14,
                bgcolor: selected ? "primary.main" : (theme) => alpha(theme.palette.primary.main, 0.12),
                color: selected ? "common.white" : "primary.dark",
              }}
            >
              {item.label}
            </Box>
          );
        })}
      </Stack>
      {range === "custom" ? (
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 2 }}>
          <AppDateField label="С" value={rangeFrom} onChange={onRangeFrom} />
          <AppDateField label="По" value={rangeTo} onChange={onRangeTo} />
        </Stack>
      ) : null}
      <Box sx={{ position: "relative", height: CHART_HEIGHT + 22 }}>
        <Box
          sx={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 22,
            borderTop: "1px dashed",
            borderColor: "divider",
          }}
        />
        <Box sx={{ display: "flex", alignItems: "flex-end", height: CHART_HEIGHT, gap: "2px" }}>
          {hourly.bars.map((bar) => (
            <Box key={bar.hour} sx={{ flex: 1, minWidth: 0, height: "100%", display: "flex", alignItems: "flex-end" }}>
              {bar.count > 0 ? (
                <Box
                  title={`${String(bar.hour).padStart(2, "0")}:00 · ${bar.count}`}
                  sx={{
                    width: "70%",
                    mx: "auto",
                    height: `${Math.max(4, (bar.count / maxBar) * CHART_HEIGHT)}px`,
                    borderRadius: "3px 3px 0 0",
                    bgcolor: bar.peak ? "primary.main" : (theme) => alpha(theme.palette.primary.main, 0.35),
                  }}
                />
              ) : null}
            </Box>
          ))}
        </Box>
        <Box sx={{ display: "flex", mt: 0.5 }}>
          {hourly.bars.map((bar) => (
            <Typography
              key={bar.hour}
              variant="caption"
              sx={{ flex: 1, textAlign: "center", color: "text.secondary", minWidth: 0 }}
            >
              {AXIS_HOURS.has(bar.hour) ? String(bar.hour).padStart(2, "0") : ""}
            </Typography>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
