def compute_direction_from_histories(histories, min_motion=10):
    """
    histories: dict obj_id -> list of (cx, cy) in chronological order
    Returns:
      - direction_str: one of 'left', 'right', 'top', 'bottom', 'stationary', or 'mixed'
    """
    vectors = []
    per_obj_dirs = []
    for oid, pos_list in histories.items():
        if len(pos_list) < 2:
            continue
        x0, y0 = pos_list[0]
        x1, y1 = pos_list[-1]
        dx = x1 - x0
        dy = y1 - y0
        vectors.append((dx, dy))

        if abs(dx) < min_motion and abs(dy) < min_motion:
            per_obj_dirs.append("stationary")
        elif abs(dx) >= abs(dy):
            per_obj_dirs.append("right" if dx > 0 else "left")
        else:
            per_obj_dirs.append("bottom" if dy > 0 else "top")

    if not vectors:
        return "stationary"

    sum_dx = sum(v[0] for v in vectors)
    sum_dy = sum(v[1] for v in vectors)
    n = len(vectors)
    avg_dx = sum_dx / n
    avg_dy = sum_dy / n

    if abs(avg_dx) < min_motion and abs(avg_dy) < min_motion:
        overall = "stationary"
    elif abs(avg_dx) >= abs(avg_dy):
        overall = "right" if avg_dx > 0 else "left"
    else:
        overall = "bottom" if avg_dy > 0 else "top"

    # Majority check
    counts = {}
    for d in per_obj_dirs:
        counts[d] = counts.get(d, 0) + 1
    
    if counts:
        majority_dir = max(counts.items(), key=lambda x: x[1])[0]
        if majority_dir != overall and counts[majority_dir] >= (0.6 * n):
            overall = majority_dir
        elif majority_dir != overall:
            overall = "mixed"

    return overall
