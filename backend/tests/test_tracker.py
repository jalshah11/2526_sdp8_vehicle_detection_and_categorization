from backend.vehicle_counting.simple_tracker import Detection, SimpleTracker


def test_tracker_keeps_id_across_short_gap() -> None:
    t = SimpleTracker(max_age_frames=3, max_match_distance_px=200.0, high_conf=0.5, low_conf=0.1)

    # Frame 1: create track
    a1 = t.update(
        [Detection(xyxy=(0, 0, 10, 10), center_xy=(5.0, 5.0), class_name="car", conf=0.99)],
        frame_idx=1,
    )
    assert len(a1) == 1
    tid = a1[0].track_id

    # Frame 2: missed detection (occlusion)
    a2 = t.update([], frame_idx=2)
    assert a2 == []

    # Frame 3: detection returns nearby -> should match same ID
    a3 = t.update(
        [Detection(xyxy=(2, 0, 12, 10), center_xy=(7.0, 5.0), class_name="car", conf=0.99)],
        frame_idx=3,
    )
    assert len(a3) == 1
    assert a3[0].track_id == tid


def test_tracker_predicts_through_gap_for_fast_motion() -> None:
    t = SimpleTracker(max_age_frames=5, max_match_distance_px=250.0, high_conf=0.5, low_conf=0.1)

    # Frame 1
    a1 = t.update(
        [Detection(xyxy=(0, 0, 10, 10), center_xy=(5.0, 5.0), class_name="car", conf=0.99)],
        frame_idx=1,
    )
    tid = a1[0].track_id

    # Frame 2: fast movement to the right
    a2 = t.update(
        [Detection(xyxy=(20, 0, 30, 10), center_xy=(25.0, 5.0), class_name="car", conf=0.99)],
        frame_idx=2,
    )
    assert a2[0].track_id == tid

    # Frame 3: occluded
    t.update([], frame_idx=3)

    # Frame 4: reappears where prediction expects (25 + 20*2 = 65)
    a4 = t.update(
        [Detection(xyxy=(60, 0, 70, 10), center_xy=(65.0, 5.0), class_name="car", conf=0.99)],
        frame_idx=4,
    )
    assert len(a4) == 1
    assert a4[0].track_id == tid
