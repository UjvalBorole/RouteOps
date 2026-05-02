#!/usr/bin/env python3
"""Convert an OSM .pbf extract into the routing-engine CSV graph format.

Outputs:
  - nodes.csv: "node_id lat lon"
  - edges.csv: "source_id target_id distance maxWeight isOneWay"

The script is designed for large extracts such as India by using a temporary
SQLite database to keep track of the node IDs referenced by routable ways.
That avoids keeping the full node set in memory during conversion.

Example usage:
python tools\convert_osm_to_graph_csv.py data\india-260424.osm.pbf --output-dir routing-engine  --overwrite
 python tools\convert_osm_to_graph_csv.py data\india-260424.osm.pbf --output-dir data --bbox 18.89 72.77 19.30 72.99 --overwrite // only Mumbai area
"""

from __future__ import annotations

import argparse
import csv
import math
import re
import sqlite3
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import osmium


EARTH_RADIUS_METERS = 6_371_000.0
DRIVABLE_HIGHWAYS = {
    "motorway",
    "motorway_link",
    "trunk",
    "trunk_link",
    "primary",
    "primary_link",
    "secondary",
    "secondary_link",
    "tertiary",
    "tertiary_link",
    "unclassified",
    "residential",
    "living_street",
    "service",
    "road",
}
SQLITE_BATCH_SIZE = 10_000
PROGRESS_EVERY_WAYS = 50_000
PROGRESS_EVERY_NODES = 500_000


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Convert OSM PBF data into nodes.csv and edges.csv for the routing engine."
    )
    parser.add_argument(
        "input",
        type=Path,
        help="Path to the .osm.pbf file.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("routing-engine"),
        help="Directory where nodes.csv and edges.csv will be written.",
    )
    parser.add_argument(
        "--temp-db",
        type=Path,
        default=None,
        help="Optional path for the temporary SQLite file. Defaults to <output-dir>/graph_build.sqlite3",
    )
    parser.add_argument(
        "--bbox",
        type=float,
        nargs=4,
        metavar=("MIN_LAT", "MIN_LON", "MAX_LAT", "MAX_LON"),
        help="Optional bounding box to limit exported roads and nodes.",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Overwrite existing nodes.csv, edges.csv, and temp DB if they already exist.",
    )
    parser.add_argument(
        "--keep-temp-db",
        action="store_true",
        help="Keep the temporary SQLite index file after a successful run.",
    )
    return parser.parse_args()


def log(message: str) -> None:
    print(message, flush=True)


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    dlat = lat2_rad - lat1_rad
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2.0) ** 2
        + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2.0) ** 2
    )
    return 2.0 * EARTH_RADIUS_METERS * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))


def is_drivable_way(tags: osmium.osm.TagList) -> bool:
    highway = tags.get("highway")
    if highway not in DRIVABLE_HIGHWAYS:
        return False

    if tags.get("area") == "yes":
        return False

    if tags.get("access") in {"no", "private"} and tags.get("motor_vehicle") in {None, "no"}:
        return False

    if tags.get("motor_vehicle") == "no":
        return False

    if tags.get("vehicle") == "no":
        return False

    return True


def normalize_oneway(tags: osmium.osm.TagList) -> int:
    value = (tags.get("oneway") or "").strip().lower()
    if value in {"yes", "true", "1"}:
        return 1
    if value == "-1":
        return -1
    return 0


WEIGHT_RE = re.compile(r"[-+]?\d+(?:\.\d+)?")


def parse_max_weight(tags: osmium.osm.TagList) -> float:
    for key in ("maxweight", "maxgcweight", "maxweightrating"):
        raw = tags.get(key)
        if not raw:
            continue

        raw = raw.strip().lower()
        if raw in {"none", "signals", "unsigned"}:
            return 0.0

        match = WEIGHT_RE.search(raw)
        if not match:
            continue

        value = float(match.group(0))
        if "kg" in raw:
            value /= 1000.0
        return value

    return 0.0


def point_in_bbox(lat: float, lon: float, bbox: tuple[float, float, float, float] | None) -> bool:
    if bbox is None:
        return True
    min_lat, min_lon, max_lat, max_lon = bbox
    return min_lat <= lat <= max_lat and min_lon <= lon <= max_lon


def way_overlaps_bbox(way: osmium.osm.Way, bbox: tuple[float, float, float, float] | None) -> bool:
    if bbox is None:
        return True

    for node in way.nodes:
        if not node.location.valid():
            continue
        if point_in_bbox(node.location.lat, node.location.lon, bbox):
            return True
    return False


def ensure_paths(args: argparse.Namespace) -> tuple[Path, Path, Path]:
    output_dir = args.output_dir
    output_dir.mkdir(parents=True, exist_ok=True)

    nodes_path = output_dir / "nodes.csv"
    edges_path = output_dir / "edges.csv"
    temp_db = args.temp_db or output_dir / "graph_build.sqlite3"

    for path in (nodes_path, edges_path, temp_db):
        if path.exists() and not args.overwrite:
            raise FileExistsError(
                f"{path} already exists. Re-run with --overwrite to replace it."
            )

    if args.overwrite:
        for path in (nodes_path, edges_path, temp_db):
            if path.exists():
                path.unlink()

    return nodes_path, edges_path, temp_db


def open_temp_db(path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(path)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=OFF")
    conn.execute("PRAGMA temp_store=MEMORY")
    conn.execute("PRAGMA cache_size=-200000")
    conn.execute("CREATE TABLE IF NOT EXISTS relevant_nodes (id INTEGER PRIMARY KEY)")
    return conn


class RelevantNodeCollector(osmium.SimpleHandler):
    def __init__(self, conn: sqlite3.Connection, bbox: tuple[float, float, float, float] | None):
        super().__init__()
        self.conn = conn
        self.bbox = bbox
        self.pending: list[tuple[int]] = []
        self.way_count = 0
        self.accepted_way_count = 0
        self.segment_count = 0

    def flush(self) -> None:
        if not self.pending:
            return
        self.conn.executemany(
            "INSERT OR IGNORE INTO relevant_nodes(id) VALUES (?)",
            self.pending,
        )
        self.conn.commit()
        self.pending.clear()

    def way(self, way: osmium.osm.Way) -> None:
        self.way_count += 1
        if self.way_count % PROGRESS_EVERY_WAYS == 0:
            log(
                f"[pass 1/3] scanned {self.way_count:,} ways, kept {self.accepted_way_count:,}, "
                f"segments {self.segment_count:,}"
            )

        if not is_drivable_way(way.tags):
            return
        if len(way.nodes) < 2:
            return
        if not way_overlaps_bbox(way, self.bbox):
            return

        self.accepted_way_count += 1

        for node in way.nodes:
            if node.ref <= 0:
                continue
            self.pending.append((node.ref,))

        self.segment_count += max(len(way.nodes) - 1, 0)

        if len(self.pending) >= SQLITE_BATCH_SIZE:
            self.flush()


class RelevantNodeWriter(osmium.SimpleHandler):
    def __init__(
        self,
        conn: sqlite3.Connection,
        nodes_path: Path,
        bbox: tuple[float, float, float, float] | None,
    ):
        super().__init__()
        self.conn = conn
        self.nodes_file = nodes_path.open("w", newline="", encoding="utf-8")
        self.writer = csv.writer(self.nodes_file, delimiter=" ", lineterminator="\n")
        self.bbox = bbox
        self.node_count = 0
        self.written_count = 0

    def close(self) -> None:
        self.nodes_file.close()

    def node(self, node: osmium.osm.Node) -> None:
        self.node_count += 1
        if self.node_count % PROGRESS_EVERY_NODES == 0:
            log(f"[pass 2/3] scanned {self.node_count:,} nodes, wrote {self.written_count:,}")

        if not node.location.valid():
            return

        lat = node.location.lat
        lon = node.location.lon
        if not point_in_bbox(lat, lon, self.bbox):
            return

        exists = self.conn.execute(
            "SELECT 1 FROM relevant_nodes WHERE id = ?",
            (node.id,),
        ).fetchone()
        if not exists:
            return

        self.writer.writerow((node.id, f"{lat:.7f}", f"{lon:.7f}"))
        self.written_count += 1


@dataclass(frozen=True)
class EdgeRow:
    source: int
    target: int
    distance_meters: float
    max_weight_tons: float
    is_one_way: int


class EdgeWriter(osmium.SimpleHandler):
    def __init__(self, edges_path: Path, bbox: tuple[float, float, float, float] | None):
        super().__init__()
        self.edges_file = edges_path.open("w", newline="", encoding="utf-8")
        self.writer = csv.writer(self.edges_file, delimiter=" ", lineterminator="\n")
        self.bbox = bbox
        self.way_count = 0
        self.edge_count = 0

    def close(self) -> None:
        self.edges_file.close()

    def way(self, way: osmium.osm.Way) -> None:
        self.way_count += 1
        if self.way_count % PROGRESS_EVERY_WAYS == 0:
            log(f"[pass 3/3] scanned {self.way_count:,} ways, wrote {self.edge_count:,} edges")

        if not is_drivable_way(way.tags):
            return
        if len(way.nodes) < 2:
            return
        if not way_overlaps_bbox(way, self.bbox):
            return

        oneway = normalize_oneway(way.tags)
        max_weight = parse_max_weight(way.tags)
        nodes = list(way.nodes)

        for first, second in zip(nodes, nodes[1:]):
            if not first.location.valid() or not second.location.valid():
                continue

            distance = haversine_distance(
                first.location.lat,
                first.location.lon,
                second.location.lat,
                second.location.lon,
            )

            if oneway == -1:
                row = EdgeRow(second.ref, first.ref, distance, max_weight, 1)
                self.writer.writerow(
                    (
                        row.source,
                        row.target,
                        f"{row.distance_meters:.2f}",
                        f"{row.max_weight_tons:.1f}",
                        row.is_one_way,
                    )
                )
                self.edge_count += 1
                continue

            row = EdgeRow(first.ref, second.ref, distance, max_weight, 1 if oneway == 1 else 0)
            self.writer.writerow(
                (
                    row.source,
                    row.target,
                    f"{row.distance_meters:.2f}",
                    f"{row.max_weight_tons:.1f}",
                    row.is_one_way,
                )
            )
            self.edge_count += 1


def run_passes(
    input_path: Path,
    nodes_path: Path,
    edges_path: Path,
    temp_db_path: Path,
    bbox: tuple[float, float, float, float] | None,
    keep_temp_db: bool,
) -> None:
    conn = open_temp_db(temp_db_path)
    try:
        start = time.time()
        log("[pass 1/3] collecting node IDs referenced by routable roads...")
        collector = RelevantNodeCollector(conn, bbox)
        collector.apply_file(str(input_path), locations=True)
        collector.flush()
        relevant_count = conn.execute("SELECT COUNT(*) FROM relevant_nodes").fetchone()[0]
        log(
            f"[pass 1/3] done in {time.time() - start:.1f}s, "
            f"kept {collector.accepted_way_count:,} ways and {relevant_count:,} unique nodes"
        )

        start = time.time()
        log("[pass 2/3] writing nodes.csv...")
        node_writer = RelevantNodeWriter(conn, nodes_path, bbox)
        try:
            node_writer.apply_file(str(input_path), locations=False)
        finally:
            node_writer.close()
        log(
            f"[pass 2/3] done in {time.time() - start:.1f}s, wrote {node_writer.written_count:,} nodes"
        )

        start = time.time()
        log("[pass 3/3] writing edges.csv...")
        edge_writer = EdgeWriter(edges_path, bbox)
        try:
            edge_writer.apply_file(str(input_path), locations=True)
        finally:
            edge_writer.close()
        log(
            f"[pass 3/3] done in {time.time() - start:.1f}s, wrote {edge_writer.edge_count:,} edges"
        )
    finally:
        conn.close()
        if not keep_temp_db and temp_db_path.exists():
            temp_db_path.unlink()


def main() -> int:
    args = parse_args()

    if not args.input.exists():
        print(f"Input file does not exist: {args.input}", file=sys.stderr)
        return 1

    bbox = tuple(args.bbox) if args.bbox else None
    try:
        nodes_path, edges_path, temp_db_path = ensure_paths(args)
    except FileExistsError as exc:
        print(exc, file=sys.stderr)
        return 1

    log(f"Input: {args.input}")
    log(f"Output directory: {args.output_dir}")
    if bbox is not None:
        log(f"Bounding box: {bbox}")

    try:
        run_passes(
            input_path=args.input,
            nodes_path=nodes_path,
            edges_path=edges_path,
            temp_db_path=temp_db_path,
            bbox=bbox,
            keep_temp_db=args.keep_temp_db,
        )
    except KeyboardInterrupt:
        print("Conversion cancelled.", file=sys.stderr)
        return 130
    except Exception as exc:  # pragma: no cover - surfaced to the terminal
        print(f"Conversion failed: {exc}", file=sys.stderr)
        return 1

    log(f"Done. Wrote {nodes_path} and {edges_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
