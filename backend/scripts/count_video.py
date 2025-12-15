from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List

import cv2
from ultralytics import YOLO

from backend.vehicle_counting.line_counter import Line, LineCrossingCounter, TrackObservation


def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Count vehicles uniquely by type using a virtual line.")
    p.add_argument("--video", required=True, help="Path to input video file")
    p.add_argument(
        "--model",
        default="yolov8n.pt",
        help="Ultralytics model to use (e.g. yolov8n.pt, yolov8s.pt).",
    )
    p.add_argument(
        "--line-y",
        type=float,
        default=0.5,
        help="Horizontal line position as fraction of frame height (0..1).",
    )
    p.add_argument(
        "--conf",
        type=float,
        default=0.25,
        help="Detection confidence threshold.",
    )
    p.add_argument(
        "--save-json",
        default=str(Path("backend") / "output" / "counts.json"),
        help="Where to write output JSON.",
    )
    p.add_argument(
        "--max-frames",
        type=int,
        default=0,
        help="Optional limit for faster testing (0 = no limit).",
    )
    p.add_argument(
        "--show",
        action="store_true",
        help="Show a preview window with the virtual line and live counts.",
    )
    return p.parse_args()


def _ensure_parent_dir(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def _center_xyxy(xyxy) -> tuple[float, float]:
    x1, y1, x2, y2 = [float(v) for v in xyxy]
    return ((x1 + x2) / 2.0, (y1 + y2) / 2.0)


def main() -> int:
    args = _parse_args()
    video_path = Path(args.video)
    if not video_path.exists():
        raise SystemExit(f"Video not found: {video_path}")

    model = YOLO(args.model)

    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise SystemExit(f"Failed to open video: {video_path}")

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
    if height <= 0:
        raise SystemExit("Could not determine video height")

    line_y_px = float(height) * float(args.line_y)
    counter = LineCrossingCounter(Line(y_px=line_y_px))

    frame_idx = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break

        frame_idx += 1
        if args.max_frames and frame_idx > args.max_frames:
            break

        # Use tracking so we get stable IDs per object.
        results = model.track(frame, persist=True, conf=args.conf, verbose=False)
        if not results:
            continue

        r = results[0]
        names: Dict[int, str] = getattr(r, "names", {})

        observations: List[TrackObservation] = []
        boxes = getattr(r, "boxes", None)
        if boxes is not None and boxes.id is not None:
            for i in range(len(boxes)):
                track_id = int(boxes.id[i].item())
                cls_id = int(boxes.cls[i].item())
                cls_name = names.get(cls_id, str(cls_id))
                center = _center_xyxy(boxes.xyxy[i])
                observations.append(
                    TrackObservation(track_id=track_id, center_xy=center, coco_class_name=cls_name)
                )

        counter.update(observations)

        if args.show:
            # Draw line
            cv2.line(frame, (0, int(line_y_px)), (width, int(line_y_px)), (0, 255, 255), 2)

            cj = counter.counts.to_jsonable()
            text = (
                f"total={cj['total']} car={cj['by_category']['car']} bike={cj['by_category']['bike']} "
                f"bus={cj['by_category']['bus']} truck={cj['by_category']['truck']}"
            )
            cv2.putText(frame, text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 3)
            cv2.putText(frame, text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 1)

            cv2.imshow("vehicle-count", frame)
            if cv2.waitKey(1) & 0xFF == ord("q"):
                break

    cap.release()
    if args.show:
        cv2.destroyAllWindows()

    out_path = Path(args.save_json)
    _ensure_parent_dir(out_path)

    payload = {
        "video": str(video_path),
        "model": args.model,
        "line_y": args.line_y,
        "counts": counter.counts.to_jsonable(),
        "counted_track_ids": sorted(counter.counted_track_ids),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }

    out_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps(payload, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
