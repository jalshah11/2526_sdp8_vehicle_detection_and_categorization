from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List

import cv2
import torch

# Fix for PyTorch 2.6+ compatibility with ultralytics
# PyTorch 2.6 changed torch.load default to weights_only=True for security
# We need to patch torch.load before ultralytics imports it
_original_torch_load = torch.load

def _patched_torch_load(*args, **kwargs):
    """Patched torch.load that sets weights_only=False by default for ultralytics compatibility."""
    # If weights_only is not explicitly set, default to False for backward compatibility
    # This is safe since we're loading trusted YOLO model weights from ultralytics
    if 'weights_only' not in kwargs:
        kwargs['weights_only'] = False
    return _original_torch_load(*args, **kwargs)

# Patch torch.load before importing ultralytics
torch.load = _patched_torch_load

from ultralytics import YOLO

from backend.vehicle_counting.line_counter import COCO_CLASS_TO_CATEGORY, Line, LineCrossingCounter, TrackObservation
from backend.vehicle_counting.simple_tracker import Detection, SimpleTracker


def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Detect + categorize vehicles and count crossings of a virtual line (in/out)."
    )
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
        "--invert-directions",
        action="store_true",
        help="Swap what we consider in vs out for line crossings.",
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
        "--output-video",
        default=str(Path("backend") / "output" / "annotated.mp4"),
        help="Where to write the annotated output video.",
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
        help="Show a preview window (press q to quit).",
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

    # Load YOLO model (torch.load is already patched at module level for PyTorch 2.6+ compatibility)
    model = YOLO(args.model)
    tracker = SimpleTracker()

    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise SystemExit(f"Failed to open video: {video_path}")

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
    if height <= 0:
        raise SystemExit("Could not determine video height")

    line_y_px = float(height) * float(args.line_y)
    counter = LineCrossingCounter(Line(y_px=line_y_px), invert_directions=args.invert_directions)

    out_video_path = Path(args.output_video)
    _ensure_parent_dir(out_video_path)

    fps = float(cap.get(cv2.CAP_PROP_FPS) or 0.0)
    if fps <= 0:
        fps = 30.0

    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(str(out_video_path), fourcc, fps, (width, height))
    if not writer.isOpened():
        raise SystemExit(f"Failed to open VideoWriter for: {out_video_path}")

    frame_idx = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break

        frame_idx += 1
        if args.max_frames and frame_idx > args.max_frames:
            break

        # We intentionally avoid Ultralytics' built-in trackers here because on Python 3.13
        # the optional 'lap' dependency may not be available.
        results = model.predict(frame, conf=args.conf, verbose=False)
        if not results:
            writer.write(frame)
            continue

        r = results[0]
        names: Dict[int, str] = getattr(r, "names", {})

        detections: List[Detection] = []
        boxes = getattr(r, "boxes", None)
        if boxes is not None:
            for i in range(len(boxes)):
                cls_id = int(boxes.cls[i].item())
                cls_name = names.get(cls_id, str(cls_id))

                # Only keep vehicle-ish COCO classes we know how to map.
                if cls_name not in COCO_CLASS_TO_CATEGORY:
                    continue

                conf = float(boxes.conf[i].item()) if boxes.conf is not None else 0.0
                xyxy = tuple(float(v) for v in boxes.xyxy[i].tolist())
                center = _center_xyxy(xyxy)
                detections.append(
                    Detection(xyxy=xyxy, center_xy=center, class_name=cls_name, conf=conf)
                )

        assignments = tracker.update(detections, frame_idx=frame_idx)

        observations: List[TrackObservation] = []
        for track_id, det in assignments:
            observations.append(
                TrackObservation(
                    track_id=int(track_id),
                    center_xy=det.center_xy,
                    coco_class_name=det.class_name,
                )
            )

            # Draw bbox + label
            x1, y1, x2, y2 = [int(v) for v in det.xyxy]
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 200, 0), 2)
            label = f"{det.class_name} #{track_id}"
            cv2.putText(
                frame,
                label,
                (x1, max(20, y1 - 7)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (0, 0, 0),
                3,
            )
            cv2.putText(
                frame,
                label,
                (x1, max(20, y1 - 7)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (255, 255, 255),
                1,
            )

        counter.update(observations)

        # Draw line
        cv2.line(frame, (0, int(line_y_px)), (width, int(line_y_px)), (0, 255, 255), 2)

        cj = counter.counts.to_jsonable()
        text1 = (
            f"total={cj['total']} in={cj['in']['total']} out={cj['out']['total']}"
        )
        text2 = (
            f"car={cj['by_category']['car']} bike={cj['by_category']['bike']} bus={cj['by_category']['bus']} "
            f"truck={cj['by_category']['truck']}"
        )
        cv2.putText(frame, text1, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 3)
        cv2.putText(frame, text1, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 1)
        cv2.putText(frame, text2, (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 3)
        cv2.putText(frame, text2, (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 1)

        writer.write(frame)

        if args.show:
            cv2.imshow("vehicle-count", frame)
            if cv2.waitKey(1) & 0xFF == ord("q"):
                break

    cap.release()
    writer.release()
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
