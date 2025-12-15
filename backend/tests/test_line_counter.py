from backend.vehicle_counting.line_counter import Line, LineCrossingCounter, TrackObservation


def test_counts_only_on_crossing_once() -> None:
    c = LineCrossingCounter(Line(y_px=10))

    # First frame: above the line -> no count yet
    c.update([TrackObservation(track_id=1, center_xy=(5, 5), coco_class_name="car")])
    assert c.counts.total == 0

    # Cross line (downwards)
    c.update([TrackObservation(track_id=1, center_xy=(5, 15), coco_class_name="car")])
    assert c.counts.total == 1
    assert c.counts.to_jsonable()["by_category"]["car"] == 1

    # Cross again (upwards) should NOT increment because it's unique per track_id
    c.update([TrackObservation(track_id=1, center_xy=(5, 5), coco_class_name="car")])
    assert c.counts.total == 1


def test_bike_includes_bicycle_and_motorcycle() -> None:
    c = LineCrossingCounter(Line(y_px=10))

    # bicycle track crosses
    c.update([TrackObservation(track_id=2, center_xy=(0, 0), coco_class_name="bicycle")])
    c.update([TrackObservation(track_id=2, center_xy=(0, 20), coco_class_name="bicycle")])

    # motorcycle track crosses
    c.update([TrackObservation(track_id=3, center_xy=(0, 0), coco_class_name="motorcycle")])
    c.update([TrackObservation(track_id=3, center_xy=(0, 20), coco_class_name="motorcycle")])

    j = c.counts.to_jsonable()
    assert j["total"] == 2
    assert j["by_category"]["bike"] == 2


def test_ignores_non_vehicle_classes() -> None:
    c = LineCrossingCounter(Line(y_px=10))

    c.update([TrackObservation(track_id=9, center_xy=(0, 0), coco_class_name="person")])
    c.update([TrackObservation(track_id=9, center_xy=(0, 20), coco_class_name="person")])

    assert c.counts.total == 0
