from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple


@dataclass
class Detection:
    xyxy: Tuple[float, float, float, float]
    center_xy: Tuple[float, float]
    class_name: str
    conf: float


@dataclass
class Track:
    track_id: int
    center_xy: Tuple[float, float]
    class_name: str
    last_seen_frame: int


class SimpleTracker:
    """Tiny tracker using greedy nearest-neighbor matching.

    This is intentionally basic so it works without extra native deps (e.g. 'lap').
    It is good enough for a basic demo / prototype.
    """

    def __init__(
        self,
        *,
        max_age_frames: int = 30,
        max_match_distance_px: float = 60.0,
    ):
        self._next_id = 1
        self._tracks: Dict[int, Track] = {}
        self._max_age_frames = int(max_age_frames)
        self._max_match_distance_px = float(max_match_distance_px)

    @staticmethod
    def _dist(a: Tuple[float, float], b: Tuple[float, float]) -> float:
        dx = a[0] - b[0]
        dy = a[1] - b[1]
        return (dx * dx + dy * dy) ** 0.5

    def update(self, detections: List[Detection], *, frame_idx: int) -> List[Tuple[int, Detection]]:
        # Drop old tracks
        to_delete = [
            tid
            for tid, t in self._tracks.items()
            if (frame_idx - t.last_seen_frame) > self._max_age_frames
        ]
        for tid in to_delete:
            del self._tracks[tid]

        assignments: List[Tuple[int, Detection]] = []
        used_track_ids = set()

        # Greedy matching: for each det, pick nearest existing track of same class.
        for det in detections:
            best_tid: Optional[int] = None
            best_dist = 1e18
            for tid, trk in self._tracks.items():
                if tid in used_track_ids:
                    continue
                if trk.class_name != det.class_name:
                    continue
                d = self._dist(trk.center_xy, det.center_xy)
                if d < best_dist:
                    best_dist = d
                    best_tid = tid

            if best_tid is not None and best_dist <= self._max_match_distance_px:
                # Update matched track
                trk = self._tracks[best_tid]
                trk.center_xy = det.center_xy
                trk.last_seen_frame = frame_idx
                assignments.append((best_tid, det))
                used_track_ids.add(best_tid)
            else:
                # Create new track
                tid = self._next_id
                self._next_id += 1
                self._tracks[tid] = Track(
                    track_id=tid,
                    center_xy=det.center_xy,
                    class_name=det.class_name,
                    last_seen_frame=frame_idx,
                )
                assignments.append((tid, det))
                used_track_ids.add(tid)

        return assignments
