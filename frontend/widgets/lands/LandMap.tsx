"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Alert, Box, Button } from "@mui/material";
import Map, {
  AttributionControl,
  Marker,
  NavigationControl,
} from "react-map-gl/maplibre";
import type { MapProps, MapRef } from "react-map-gl/maplibre";
import type { LngLatBounds, StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { CitySuggestItemDto } from "@/entities/city";
import type { LandMarker } from "@/entities/land/types";
import type { GeocodedPoint, GeocodingSource } from "@/entities/geocoding/types";
import { addressPointAccuracy } from "@/entities/land/address-location";
import { landOfferCount } from "@/entities/land/catalog-query";

type Point = {
  latitude: number | null;
  longitude: number | null;
};

type Bounds = [west: number, south: number, east: number, north: number];

type Props = {
  markers?: LandMarker[];
  bbox?: string;
  onSearch?: (bbox: string) => void;
  onSelect?: (marker: LandMarker) => void;
  selectedNumber?: string;
  children?: ReactNode;
  point?: Point;
  addressPoint?: GeocodedPoint | null;
  previewCity?: CitySuggestItemDto | null;
  citySource?: GeocodingSource | null;
  fillHeight?: boolean;
  onPick?: (latitude: number, longitude: number) => void;
};

const RUSSIA_BOUNDS: Bounds = [19, 41, 180, 78];
const CITY_ZOOM = 10;

function sourceAttribution(source?: GeocodingSource | null) {
  if (!source || typeof document === "undefined") return undefined;
  const link = document.createElement("a");
  link.href = source.url;
  if (link.protocol !== "https:" && link.protocol !== "http:") return undefined;
  link.textContent = source.name;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  return link.outerHTML;
}

const mapStyle: StyleSpecification = {
  version: 8,
  sources: {
    basemap: {
      type: "raster",
      tiles: [
        process.env.NEXT_PUBLIC_LAND_MAP_TILE_URL ||
          "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution:
        process.env.NEXT_PUBLIC_LAND_MAP_ATTRIBUTION ||
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    },
  },
  layers: [{ id: "basemap", type: "raster", source: "basemap" }],
};

const locale = {
  "AttributionControl.ToggleAttribution": "Источники карты",
  "Map.Title": "Карта",
  "Marker.Title": "Отметка на карте",
  "NavigationControl.ZoomIn": "Приблизить",
  "NavigationControl.ZoomOut": "Отдалить",
};

function isValidPoint(
  point?: Point | null,
): point is { latitude: number; longitude: number } {
  return (
    typeof point?.latitude === "number" &&
    typeof point.longitude === "number" &&
    Math.abs(point.latitude) <= 85 &&
    Math.abs(point.longitude) <= 180
  );
}

function getInitialView(
  bbox: string | undefined,
  markers: readonly LandMarker[],
  point?: Point,
  pointZoom = 13,
): MapProps["initialViewState"] {
  const area = bbox?.split(",").map(Number);
  if (
    area?.length === 4 &&
    area.every(Number.isFinite) &&
    Math.abs(area[0]) <= 180 &&
    Math.abs(area[2]) <= 180 &&
    Math.abs(area[1]) <= 85 &&
    Math.abs(area[3]) <= 85 &&
    area[0] < area[2] &&
    area[1] < area[3]
  ) {
    return { bounds: [area[0], area[1], area[2], area[3]] };
  }
  if (isValidPoint(point)) {
    return {
      longitude: point.longitude,
      latitude: point.latitude,
      zoom: pointZoom,
    };
  }
  if (markers.length) {
    const longitudes = markers.map((marker) => marker.longitude);
    const latitudes = markers.map((marker) => marker.latitude);
    const bounds: Bounds = [
      Math.min(...longitudes),
      Math.min(...latitudes),
      Math.max(...longitudes),
      Math.max(...latitudes),
    ];
    if (bounds[0] === bounds[2] && bounds[1] === bounds[3]) {
      return { longitude: bounds[0], latitude: bounds[1], zoom: 12 };
    }
    return {
      bounds,
      fitBoundsOptions: {
        maxZoom: 12,
        padding: { top: 80, bottom: 60, left: 50, right: 50 },
      },
    };
  }
  return { bounds: RUSSIA_BOUNDS, fitBoundsOptions: { padding: 24 } };
}

function searchArea(bounds: LngLatBounds): string | null {
  const west = Math.max(-180, bounds.getWest());
  const south = Math.max(-85, bounds.getSouth());
  const east = Math.min(180, bounds.getEast());
  const north = Math.min(85, bounds.getNorth());
  if (west >= east || south >= north) return null;

  return [west, south, east, north].map((value) => value.toFixed(6)).join(",");
}

export function LandMap({
  markers = [],
  bbox,
  onSearch,
  onSelect,
  selectedNumber,
  children,
  point,
  addressPoint,
  previewCity,
  citySource,
  fillHeight = false,
  onPick,
}: Props) {
  const map = useRef<MapRef>(null);
  const lastSearchedArea = useRef<string | null>(null);
  const previousBbox = useRef(bbox);
  const cityCenter =
    onPick && isValidPoint(previewCity?.center)
      ? previewCity.center
      : undefined;
  const focus = cityCenter ?? addressPoint;
  const source = cityCenter ? citySource : addressPoint?.source;
  const attribution = useMemo(() => sourceAttribution(source), [source]);
  const target = focus ?? point;
  const markerPoint = cityCenter ?? point;
  const cityLabel = cityCenter && previewCity
    ? previewCity.mapSearchName || previewCity.name
    : null;
  const focusZoom = cityCenter ? CITY_ZOOM : addressPoint ? addressPointAccuracy(addressPoint).zoom : undefined;
  // Results can change after searching the area. Keep the user's camera in place.
  const [initialViewState] = useState(() =>
    getInitialView(bbox, markers, target, focusZoom ?? 13),
  );
  const [ready, setReady] = useState(false);
  const [moved, setMoved] = useState(false);
  const [failed, setFailed] = useState(false);
  const isPicker = Boolean(onPick);
  const catalog = Boolean(onSearch);
  const defaultHeight = catalog
    ? {
        xs: "clamp(380px, 66dvh, 600px)",
        md: "clamp(480px, 66dvh, 700px)",
      }
    : isPicker
      ? {
          xs: 156,
          tablet: 138,
        }
      : {
          xs: 420,
          md: 620,
        };
  const latitude = target?.latitude ?? null;
  const longitude = target?.longitude ?? null;

  useEffect(() => {
    const view = map.current;
    if (!catalog || !ready || !view || previousBbox.current === bbox) return;
    previousBbox.current = bbox;
    if (bbox === lastSearchedArea.current) return;
    const camera = getInitialView(bbox, markers);
    if (camera?.bounds) {
      view.fitBounds(camera.bounds, {
        ...camera.fitBoundsOptions,
        duration: 0,
      });
    } else if (camera?.longitude != null && camera.latitude != null) {
      view.jumpTo({
        center: [camera.longitude, camera.latitude],
        zoom: camera.zoom,
      });
    }
    lastSearchedArea.current = searchArea(view.getBounds());
    setMoved(false);
  }, [bbox, catalog, markers, ready]);

  useEffect(() => {
    const view = map.current;
    const coordinate = focus ?? { latitude, longitude };
    if (!ready || !isPicker || !view) return;

    if (isValidPoint(coordinate)) {
      view.jumpTo({
        center: [coordinate.longitude, coordinate.latitude],
        zoom: focusZoom ?? Math.max(12, view.getZoom()),
      });
    } else {
      view.fitBounds(RUSSIA_BOUNDS, { padding: 24, duration: 0 });
    }
  }, [ready, isPicker, previewCity, focus, focusZoom, latitude, longitude]);

  function searchVisibleArea() {
    const bounds = map.current?.getBounds();
    const area = bounds && searchArea(bounds);
    if (!area || !onSearch) return;
    lastSearchedArea.current = area;
    setMoved(false);
    onSearch(area);
  }

  return (
    <Box
      sx={fillHeight ? {
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
      } : undefined}
    >
      {failed ? (
        <Alert severity="warning">
          Подложка карты недоступна.
          {isPicker
            ? " Укажите координаты вручную."
            : onSearch
              ? " Можно продолжить поиск в списке."
              : null}
        </Alert>
      ) : null}
      <Box
        role="region"
        aria-label={
          isPicker ? "Выберите точку участка на карте" : "Карта предложений"
        }
        sx={{
          position: "relative",
          overflow: "hidden",
          ...(fillHeight
            ? {
                flex: 1,
                minHeight: {
                  xs: 220,
                  tablet: 260,
                },
              }
            : {
                height: defaultHeight,
                borderRadius: 2,
              }),
          bgcolor: "action.hover",
          zIndex: 0,
          "& .maplibregl-ctrl.maplibregl-ctrl-attrib": {
            backgroundColor: "transparent",
          },
          ...(catalog && {
            "& .maplibregl-ctrl-top-right": {
              top: selectedNumber ? { xs: 64, sm: "50%" } : "50%",
              transform: selectedNumber
                ? { xs: "none", sm: "translateY(-50%)" }
                : "translateY(-50%)",
            },
          }),
        }}
      >
        <Map
          ref={map}
          style={fillHeight ? {
            position: "absolute",
            inset: 0,
          } : undefined}
          mapStyle={mapStyle}
          initialViewState={initialViewState}
          maxZoom={18}
          maxPitch={0}
          renderWorldCopies={false}
          scrollZoom={false}
          dragRotate={false}
          attributionControl={false}
          cursor={isPicker ? "crosshair" : undefined}
          locale={locale}
          onLoad={({ target }) => {
            target.touchZoomRotate.disableRotation();
            lastSearchedArea.current = searchArea(target.getBounds());
            setReady(true);
          }}
          onMoveEnd={({ target }) => {
            if (onSearch) {
              const area = searchArea(target.getBounds());
              setMoved(Boolean(area) && area !== lastSearchedArea.current);
            }
          }}
          onError={() => setFailed(true)}
          onSourceData={(event) => {
            if (
              event.sourceId === "basemap" &&
              event.tile &&
              event.sourceDataType === "content"
            ) {
              setFailed(false);
            }
          }}
          onClick={({ lngLat }) => {
            const coordinate = { latitude: lngLat.lat, longitude: lngLat.lng };
            if (isValidPoint(coordinate)) {
              onPick?.(
                Number(coordinate.latitude.toFixed(6)),
                Number(coordinate.longitude.toFixed(6)),
              );
            }
          }}
        >
          <NavigationControl
            position={catalog ? "top-right" : "top-left"}
            showCompass={false}
          />
          <AttributionControl
            key={attribution ?? "basemap"}
            position="bottom-right"
            compact={false}
            customAttribution={attribution}
          />
          {markers.map((marker) => (
            <Marker
              key={marker.cadastralNumber}
              ref={(instance) =>
                instance?.getElement().setAttribute("role", "group")
              }
              latitude={marker.latitude}
              longitude={marker.longitude}
              anchor="center"
            >
              <Box
                component="button"
                type="button"
                title={`Участок ${marker.cadastralNumber}, предложений: ${marker.listingIds.length}`}
                aria-pressed={marker.cadastralNumber === selectedNumber}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelect?.(marker);
                }}
                sx={{
                  bgcolor:
                    marker.cadastralNumber === selectedNumber ||
                    marker.listingIds.length > 1
                      ? "primary.main"
                      : "background.paper",
                  color:
                    marker.cadastralNumber === selectedNumber ||
                    marker.listingIds.length > 1
                      ? "primary.contrastText"
                      : "text.primary",
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                  px: 1.25,
                  py: 0.75,
                  whiteSpace: "nowrap",
                  fontFamily: "inherit",
                  fontSize: "0.875rem",
                  fontWeight: 800,
                  boxShadow: 2,
                  cursor: "pointer",
                }}
              >
                {marker.listingIds.length > 1
                  ? landOfferCount(marker.listingIds.length)
                  : marker.label || "Участок"}
              </Box>
            </Marker>
          ))}
          {isValidPoint(markerPoint) && (
            <Marker
              latitude={markerPoint.latitude}
              longitude={markerPoint.longitude}
              anchor="center"
              style={{ pointerEvents: "none" }}
              ref={(instance) => {
                const marker = instance?.getElement();
                marker?.setAttribute("role", "img");
                marker?.setAttribute(
                  "aria-label",
                  cityLabel ? `Центр населённого пункта ${cityLabel}` : "Точка участка",
                );
              }}
            >
              <Box
                sx={{
                  position: "relative",
                  width: 20,
                  height: 20,
                  border: "2px solid white",
                  borderRadius: "50%",
                  bgcolor: "accent.main",
                  boxShadow: 2,
                }}
              >
                {cityLabel && (
                  <Box
                    component="span"
                    sx={{
                      position: "absolute",
                      bottom: "calc(100% + 5px)",
                      left: "50%",
                      transform: "translateX(-50%)",
                      borderRadius: 1,
                      px: 0.75,
                      bgcolor: "background.paper",
                      color: "text.primary",
                      boxShadow: 1,
                      whiteSpace: "nowrap",
                      typography: "caption",
                    }}
                  >
                    {cityLabel}
                  </Box>
                )}
              </Box>
            </Marker>
          )}
        </Map>
        {onSearch && ready ? (
          <Button
            variant="outlined"
            disabled={Boolean(bbox) && !moved}
            onClick={searchVisibleArea}
            sx={{
              position: "absolute",
              top: 16,
              left: "50%",
              transform: "translateX(-50%)",
              whiteSpace: "nowrap",
              zIndex: 1,
              bgcolor: "background.paper",
              color: "text.primary",
              "&:hover, &.Mui-disabled": { bgcolor: "background.paper" },
            }}
          >
            Искать в этой области
          </Button>
        ) : null}
        {children}
      </Box>
    </Box>
  );
}
