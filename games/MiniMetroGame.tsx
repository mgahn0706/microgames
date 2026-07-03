"use client";

import Image from "next/image";
import type { Microgame } from "@/data/microgames";
import type {
  MiniMetroLinePoint,
  MiniMetroStation,
  MiniMetroStationShape,
} from "@/games/useMiniMetroGame";
import { useMiniMetroGame } from "@/games/useMiniMetroGame";

const BACKGROUND_SRC = "/games/mini-metro/images/background.png";
const LINE_COLOR = "#00A84D";
const DEFAULT_STATION_STROKE = "#171717";

function getLinePath(points: readonly MiniMetroLinePoint[]) {
  const firstPoint = points[0];

  if (!firstPoint) {
    return "";
  }

  return points
    .map((point, index) =>
      index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`,
    )
    .join(" ");
}

function getLinePoints(
  connectedStationIds: readonly MiniMetroStationShape[],
  stations: readonly MiniMetroStation[],
  previewLinePoint: MiniMetroLinePoint | null,
  isDragging: boolean,
) {
  const connectedStationPoints = connectedStationIds
    .map((stationId) => stations.find((station) => station.id === stationId))
    .filter((station): station is MiniMetroStation => Boolean(station))
    .map(
      (station) =>
        ({
          x: station.x,
          y: station.y,
        }) satisfies MiniMetroLinePoint,
    );

  if (
    isDragging &&
    previewLinePoint &&
    connectedStationPoints.length > 0 &&
    connectedStationPoints.length < stations.length
  ) {
    const lastConnectedStationPoint =
      connectedStationPoints[connectedStationPoints.length - 1];

    if (
      lastConnectedStationPoint &&
      Math.hypot(
        lastConnectedStationPoint.x - previewLinePoint.x,
        lastConnectedStationPoint.y - previewLinePoint.y,
      ) > 0.5
    ) {
      return [...connectedStationPoints, previewLinePoint];
    }
  }

  return connectedStationPoints;
}

function StationShape({
  isConnected,
  station,
}: Readonly<{
  isConnected: boolean;
  station: MiniMetroStation;
}>) {
  const shapeProps = {
    fill: "#ffffff",
    stroke: isConnected ? LINE_COLOR : DEFAULT_STATION_STROKE,
    strokeLinejoin: "round",
    strokeWidth: 8,
  } as const;

  if (station.id === "circle") {
    return <circle cx="50" cy="50" r="28" {...shapeProps} />;
  }

  if (station.id === "triangle") {
    return <polygon points="50,17 84,79 16,79" {...shapeProps} />;
  }

  return <rect height="56" width="56" x="22" y="22" {...shapeProps} />;
}

export function MiniMetroGame({
  microgame,
}: Readonly<{ microgame: Microgame }>) {
  void microgame;

  const {
    connectedStationIds,
    containerRef,
    handlePointerCancel,
    handlePointerDown,
    handlePointerLeave,
    handlePointerMove,
    handlePointerUp,
    isDragging,
    previewLinePoint,
    stations,
  } = useMiniMetroGame();
  const linePath = getLinePath(
    getLinePoints(connectedStationIds, stations, previewLinePoint, isDragging),
  );

  return (
    <div
      className="relative h-screen w-screen touch-none select-none overflow-hidden bg-[#f7f7f2]"
      onPointerCancel={handlePointerCancel}
      onPointerDown={handlePointerDown}
      onPointerLeave={handlePointerLeave}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      ref={containerRef}
    >
      <Image
        alt=""
        className="object-cover"
        draggable={false}
        fill
        priority
        sizes="100vw"
        src={BACKGROUND_SRC}
        unoptimized
      />
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 h-full w-full"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        {linePath ? (
          <path
            d={linePath}
            fill="none"
            stroke={LINE_COLOR}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="14"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}
      </svg>
      {stations.map((station) => {
        const isConnected = connectedStationIds.includes(station.id);

        return (
          <svg
            aria-label={`${station.id} 역`}
            className={`pointer-events-none absolute z-20 size-[clamp(4.5rem,8vw,6.5rem)] -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_4px_0_rgba(0,0,0,0.08)] transition duration-150 ${
              isConnected
                ? "scale-110 drop-shadow-[0_0_18px_rgba(0,168,77,0.48)]"
                : isDragging
                  ? "scale-100"
                  : "scale-95"
            }`}
            key={station.id}
            role="img"
            style={{
              left: `${station.x}%`,
              top: `${station.y}%`,
            }}
            viewBox="0 0 100 100"
          >
            <StationShape isConnected={isConnected} station={station} />
          </svg>
        );
      })}
    </div>
  );
}
