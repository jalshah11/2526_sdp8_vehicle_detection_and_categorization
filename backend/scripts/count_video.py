from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List

# If invoked as a script (python backend/scripts/count_video.py), ensure project root is on sys.path
# so imports like `from backend...` work. When invoked with `python -m backend.scripts.count_video`,
# this is already handled by Python.
_project_root = Path(__file__).resolve().parents[2]
if str(_project_root) not in sys.path:
    sys.path.insert(0, str(_project_root))

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

from backend.vehicle_counting.line_counter import (
    COCO_CLASS_TO_CATEGORY,
    Line,
    LineCrossingCounter,
    TrackObservation,
)


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
        help="Detection confidence threshold (used as HIGH threshold for tracking).",
    )
    p.add_argument(
        "--frame-stride",
        type=int,
        default=1,
        help="Process every Nth frame (speeds up a lot, but too high can miss crossings).",
    )
    p.add_argument(
        "--scale",
        type=float,
        default=1.0,
        help="Downscale factor for processing (e.g. 0.75). Speeds up YOLO tracking.",
    )
    p.add_argument(
        "--roi-band",
        type=float,
        default=0.0,
        help="Optional vertical band (fraction of frame height) around the line to track/count within (0 = disabled).",
    )
    p.add_argument(
        "--skip-video",
        action="store_true",
        help="Do not write annotated.mp4 (much faster).",
    )
    p.add_argument(
        "--anchor",
        choices=["center", "bottom"],
        default="bottom",
        help="Point used for line crossing (center is noisier; bottom is often more stable).",
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


def _anchor_xyxy(xyxy, *, anchor: str) -> tuple[float, float]:
    x1, y1, x2, y2 = [float(v) for v in xyxy]
    cx = (x1 + x2) / 2.0
    if anchor == "bottom":
        return (cx, y2)
    # default: center
    return (cx, (y1 + y2) / 2.0)


def main() -> int:
    args = _parse_args()
    video_path = Path(args.video)
    if not video_path.exists():
        raise SystemExit(f"Video not found: {video_path}")

    # Load YOLO model (torch.load is already patched at module level for PyTorch 2.6+ compatibility)
    model = YOLO(args.model)
    use_gpu_yolo = bool(getattr(torch, "cuda", None) is not None and torch.cuda.is_available())

    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise SystemExit(f"Failed to open video: {video_path}")

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
    if height <= 0:
        raise SystemExit("Could not determine video height")

    scale = float(args.scale)
    if scale <= 0.0 or scale > 1.0:
        raise SystemExit("--scale must be within (0, 1]")

    proc_width = int(round(width * scale))
    proc_height = int(round(height * scale))
    if proc_width <= 0 or proc_height <= 0:
        raise SystemExit("Invalid processing size after scaling")

    line_y_px = float(proc_height) * float(args.line_y)
    # A small margin around the line makes counting less sensitive to bbox jitter.
    line_margin_px = float(max(2.0, 0.01 * float(proc_height)))
    counter = LineCrossingCounter(
        Line(y_px=line_y_px),
        invert_directions=args.invert_directions,
        line_margin_px=line_margin_px,
    )

    out_video_path = Path(args.output_video)
    _ensure_parent_dir(out_video_path)

    fps = float(cap.get(cv2.CAP_PROP_FPS) or 0.0)
    if fps <= 0:
        fps = 30.0

    # Tracker configuration
    # We use ByteTrack which is built-in to Ultralytics.
    tracker_config = "bytetrack.yaml"

    # If showing preview, we must render frames.
    if args.show:
        args.skip_video = False

    writer = None
    if not args.skip_video:
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        writer = cv2.VideoWriter(str(out_video_path), fourcc, fps, (proc_width, proc_height))
        if not writer.isOpened():
            raise SystemExit(f"Failed to open VideoWriter for: {out_video_path}")

    frame_idx = 0
    frames_total = 0
    frames_used = 0
    detections_total = 0
    detections_vehicle = 0

    while True:
        ok, frame = cap.read()
        if not ok:
            break

        frame_idx += 1
        frames_total += 1
        if args.max_frames and frame_idx > args.max_frames:
            break

        # Downscale for faster processing if requested.
        if scale != 1.0:
            frame = cv2.resize(frame, (proc_width, proc_height), interpolation=cv2.INTER_AREA)

        stride = int(max(1, args.frame_stride))
        if stride > 1 and (frame_idx % stride) != 0:
            if writer is not None:
                writer.write(frame)
            continue

        frames_used += 1

        # Use model.track instead of predict for native tracking
        results = model.track(
            frame,
            persist=True,
            tracker=tracker_config,
            conf=float(args.conf),
            verbose=False,
            device=0 if use_gpu_yolo else "cpu",
        )

        if not results:
            writer.write(frame)
            continue

        r = results[0]
        names: Dict[int, str] = getattr(r, "names", {})
        boxes = getattr(r, "boxes", None)

        observations: List[TrackObservation] = []

        if boxes is not None:
            # Check if we have IDs (only tracked objects have IDs)
            if boxes.id is not None:
                detections_total += int(len(boxes))
                
                # Get boxes, classes, confidences, and track IDs
                # boxes.xyxy is (N, 4), boxes.conf is (N,), boxes.cls is (N,), boxes.id is (N,)
                xyxys = boxes.xyxy.tolist()
                confs = boxes.conf.tolist()
                clss = boxes.cls.tolist()
                track_ids = boxes.id.tolist()

                for xyxy, conf, cls_id, track_id in zip(xyxys, confs, clss, track_ids):
                    cls_name = names.get(int(cls_id), str(int(cls_id)))
                    
                    if cls_name not in COCO_CLASS_TO_CATEGORY:
                        continue
                        
                    detections_vehicle += 1
                    
                    _x1, _y1, _x2, _y2 = xyxy
                    # Optional ROI band
                    anchor_pt = _anchor_xyxy(xyxy, anchor=args.anchor)
                    if float(args.roi_band) > 0.0:
                        band_h = float(proc_height) * float(args.roi_band)
                        half_band = band_h / 2.0
                        if not ((line_y_px - half_band) <= anchor_pt[1] <= (line_y_px + half_band)):
                            continue

                    observations.append(
                        TrackObservation(
                            track_id=int(track_id),
                            center_xy=anchor_pt,
                            coco_class_name=cls_name,
                            is_confirmed=True, # ByteTrack native results are generally confirmed tracks
                        )
                    )

                    if writer is not None or args.show:
                        # Draw bbox + label
                        x1, y1, x2, y2 = [int(v) for v in xyxy]
                        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 200, 0), 2)
                        label = f"{cls_name} #{int(track_id)}"
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

        if writer is not None or args.show:
            # Draw line
            cv2.line(
                frame,
                (0, int(line_y_px)),
                (proc_width, int(line_y_px)),
                (0, 255, 255),
                2,
            )

            cj = counter.counts.to_jsonable()
            text1 = f"total={cj['total']} in={cj['in']['total']} out={cj['out']['total']}"
            text2 = (
                f"car={cj['by_category']['car']} bike={cj['by_category']['bike']} bus={cj['by_category']['bus']} "
                f"truck={cj['by_category']['truck']}"
            )
            cv2.putText(frame, text1, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 3)
            cv2.putText(frame, text1, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 1)
            cv2.putText(frame, text2, (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 3)
            cv2.putText(frame, text2, (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 1)

            if writer is not None:
                writer.write(frame)

            if args.show:
                cv2.imshow("vehicle-count", frame)
                if cv2.waitKey(1) & 0xFF == ord("q"):
                    break

    cap.release()
    if writer is not None:
        writer.release()
    if args.show:
        cv2.destroyAllWindows()

    out_path = Path(args.save_json)
    _ensure_parent_dir(out_path)

    payload = {
        "video": str(video_path),
        "model": args.model,
        "line_y": args.line_y,
        "anchor": args.anchor,
        "tracking": {
            "tracker": "bytetrack",
            "conf": float(args.conf),
            "frame_stride": int(max(1, args.frame_stride)),
            "scale": float(args.scale),
            "roi_band": float(args.roi_band),
            "skip_video": bool(args.skip_video),
        },
        "debug": {
            "frames_total": int(frames_total),
            "frames_used": int(frames_used),
            "raw_detections_total": int(detections_total),
            "vehicle_detections_total": int(detections_vehicle),
        },
        "counts": counter.counts.to_jsonable(),
        "counted_track_ids": sorted(counter.counted_track_ids),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }

    out_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps(payload, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
