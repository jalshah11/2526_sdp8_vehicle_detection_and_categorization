from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, Iterable, Optional, Set, Tuple


class VehicleCategory(str, Enum):
    car = "car"
    bike = "bike"  # bicycle + motorcycle
    bus = "bus"
    truck = "truck"


class CrossingDirection(str, Enum):
    in_lane = "in"
    out_lane = "out"


COCO_CLASS_TO_CATEGORY: Dict[str, VehicleCategory] = {
    "car": VehicleCategory.car,
    "bus": VehicleCategory.bus,
    "truck": VehicleCategory.truck,
    "motorcycle": VehicleCategory.bike,
    "bicycle": VehicleCategory.bike,
}


@dataclass
class Line:
    # Horizontal line only for now: y = y_px
    y_px: float


@dataclass
class TrackObservation:
    track_id: int
    center_xy: Tuple[float, float]
    coco_class_name: str


@dataclass
class Counts:
    total: int = 0
    by_category: Dict[VehicleCategory, int] = field(
        default_factory=lambda: {
            VehicleCategory.car: 0,
            VehicleCategory.bike: 0,
            VehicleCategory.bus: 0,
            VehicleCategory.truck: 0,
        }
    )

    # Directional totals (interpreting the line as separating "in" vs "out")
    total_in: int = 0
    total_out: int = 0
    by_category_in: Dict[VehicleCategory, int] = field(
        default_factory=lambda: {
            VehicleCategory.car: 0,
            VehicleCategory.bike: 0,
            VehicleCategory.bus: 0,
            VehicleCategory.truck: 0,
        }
    )
    by_category_out: Dict[VehicleCategory, int] = field(
        default_factory=lambda: {
            VehicleCategory.car: 0,
            VehicleCategory.bike: 0,
            VehicleCategory.bus: 0,
            VehicleCategory.truck: 0,
        }
    )

    def to_jsonable(self) -> dict:
        return {
            "total": self.total,
            "by_category": {k.value: v for k, v in self.by_category.items()},
            "in": {
                "total": self.total_in,
                "by_category": {k.value: v for k, v in self.by_category_in.items()},
            },
            "out": {
                "total": self.total_out,
                "by_category": {k.value: v for k, v in self.by_category_out.items()},
            },
        }


class LineCrossingCounter:
    """Counts unique tracked objects when they cross a horizontal virtual line.

    - Only counts COCO classes present in COCO_CLASS_TO_CATEGORY.
    - Each track_id is counted at most once (first time it crosses).
    - Category is chosen as the most frequently observed mapped category for that track.

    Direction:
    - We also keep simple directional counters.
    - By default, motion from top -> bottom across the line is counted as "in".
      Motion from bottom -> top is counted as "out".
    - Set invert_directions=True if your camera orientation is opposite.
    """

    def __init__(self, line: Line, *, invert_directions: bool = False):
        self._line = line
        self._invert_directions = invert_directions
        self._last_y_by_track: Dict[int, float] = {}
        self._counted_track_ids: Set[int] = set()
        self._category_votes: Dict[int, Dict[VehicleCategory, int]] = {}
        self.counts = Counts()

    @property
    def counted_track_ids(self) -> Set[int]:
        return set(self._counted_track_ids)

    def _vote_category(self, track_id: int, coco_class_name: str) -> Optional[VehicleCategory]:
        category = COCO_CLASS_TO_CATEGORY.get(coco_class_name)
        if category is None:
            return None
        votes = self._category_votes.setdefault(track_id, {})
        votes[category] = votes.get(category, 0) + 1
        return category

    def _best_category(self, track_id: int) -> Optional[VehicleCategory]:
        votes = self._category_votes.get(track_id)
        if not votes:
            return None
        return max(votes.items(), key=lambda kv: kv[1])[0]

    def _crossed(self, prev_y: float, y: float) -> bool:
        # Count any crossing (either direction).
        line_y = self._line.y_px
        return (prev_y < line_y <= y) or (prev_y > line_y >= y)

    def _direction(self, prev_y: float, y: float) -> CrossingDirection:
        # y increasing means object moving down in the image.
        is_in = y > prev_y
        if self._invert_directions:
            is_in = not is_in
        return CrossingDirection.in_lane if is_in else CrossingDirection.out_lane

    def update(self, observations: Iterable[TrackObservation]) -> None:
        for obs in observations:
            self._vote_category(obs.track_id, obs.coco_class_name)

            y = float(obs.center_xy[1])
            prev_y = self._last_y_by_track.get(obs.track_id)
            self._last_y_by_track[obs.track_id] = y

            if prev_y is None:
                continue
            if obs.track_id in self._counted_track_ids:
                continue
            if not self._crossed(prev_y, y):
                continue

            category = self._best_category(obs.track_id)
            if category is None:
                continue

            # Count this track once.
            self._counted_track_ids.add(obs.track_id)
            self.counts.total += 1
            self.counts.by_category[category] += 1

            direction = self._direction(prev_y, y)
            if direction == CrossingDirection.in_lane:
                self.counts.total_in += 1
                self.counts.by_category_in[category] += 1
            else:
                self.counts.total_out += 1
                self.counts.by_category_out[category] += 1
