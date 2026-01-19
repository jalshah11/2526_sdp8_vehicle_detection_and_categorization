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
    # If False, we record positions/votes but do not count crossings yet.
    # This helps avoid early false counts from unstable track IDs.
    is_confirmed: bool = True


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

    Robustness notes:
    - `line_margin_px` creates a "dead zone" around the line.
    - Vehicles inside the margin are ignored (we maintain their previous state).
    - Crossing is triggered only when a vehicle moves from cleanly ABOVE to cleanly BELOW (or vice-versa).
    """

    def __init__(
        self,
        line: Line,
        *,
        invert_directions: bool = False,
        line_margin_px: float = 0.0,
    ):
        self._line = line
        self._invert_directions = invert_directions
        self._margin_px = float(max(0.0, line_margin_px))
        
        # Track state: True if ABOVE line, False if BELOW line. None if unknown/in-margin initially.
        self._is_above_by_track: Dict[int, bool] = {}
        
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

    def _get_current_state(self, y: float) -> Optional[bool]:
        """Returns True if ABOVE, False if BELOW, None if in MARGIN."""
        line_y = float(self._line.y_px)
        m = float(self._margin_px)
        
        if y < (line_y - m):
            return True  # Above
        if y > (line_y + m):
            return False # Below
        return None      # In margin

    def update(self, observations: Iterable[TrackObservation]) -> None:
        for obs in observations:
            self._vote_category(obs.track_id, obs.coco_class_name)

            y = float(obs.center_xy[1])
            current_is_above = self._get_current_state(y)

            # If inside margin, do nothing. We wait for it to emerge.
            if current_is_above is None:
                continue

            prev_is_above = self._is_above_by_track.get(obs.track_id)
            
            # Update state for next time
            self._is_above_by_track[obs.track_id] = current_is_above

            # If we didn't have a previous state, we can't detect a crossing yet.
            if prev_is_above is None:
                continue

            # If state hasn't changed, no crossing.
            if prev_is_above == current_is_above:
                continue

            # State changed (Above -> Below OR Below -> Above)
            if obs.track_id in self._counted_track_ids:
                continue

            category = self._best_category(obs.track_id)
            if category is None:
                continue

            # Count this track
            self._counted_track_ids.add(obs.track_id)
            self.counts.total += 1
            self.counts.by_category[category] += 1

            # Determine direction
            # If default (not inverted): Top(low y) -> Bottom(high y) is IN.
            # So Above(True) -> Below(False) is IN.
            moved_in = (prev_is_above is True) and (current_is_above is False)
            
            if self._invert_directions:
                moved_in = not moved_in

            if moved_in:
                self.counts.total_in += 1
                self.counts.by_category_in[category] += 1
            else:
                self.counts.total_out += 1
                self.counts.by_category_out[category] += 1
