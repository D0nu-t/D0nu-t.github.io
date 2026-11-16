"""Build the data files the fly brain page loads.

    python build_data.py RAW_DIR [--circuit ID] [--out ../../public/data/flybrain]

RAW_DIR holds the downloads listed in README.md. For each circuit in
circuits.json this runs the experiments on the whole brain, keeps the neurons
that take part, and writes a small self-contained copy of that sub-network:

    <out>/index.json           what exists: the background brain and the circuits
    <out>/brain.bin            background point cloud, Int16 x, y, z per point
    <out>/<circuit>/meta.json  neurons, stimuli, readouts, model constants
    <out>/<circuit>/pos.bin    Int16 x, y, z per circuit neuron (same space as brain.bin)
    <out>/<circuit>/edges.bin  Uint32 ptr[n+1], Uint16 target[m], Int16 synapses[m]

Neurons that never spike send nothing, so dropping them does not change the
runs the subset was chosen from. validate_subset() checks that claim.
"""
from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import numpy as np
import pandas as pd

from lif import Model, Params, load_shiu

FORMAT = 1
HERE = Path(__file__).resolve().parent
NM = np.array([4.0, 4.0, 40.0])   # annotation coordinates are 4 x 4 x 40 nm voxels
INT16_SPAN = 32000


def load_annotations(raw: Path) -> pd.DataFrame:
    cols = ["root_id", "pos_x", "pos_y", "pos_z", "soma_x", "soma_y", "soma_z", "super_class", "cell_class",
            "cell_sub_class", "cell_type", "hemibrain_type", "top_nt", "side", "vfb_id"]
    a = pd.read_csv(raw / "neuron_annotations.tsv", sep="\t", usecols=cols, low_memory=False)
    return a.drop_duplicates("root_id").set_index("root_id")


def positions_nm(a: pd.DataFrame) -> np.ndarray:
    """Soma position where one is recorded (sensory neurons have none in the brain), else the anchor point."""
    soma = a[["soma_x", "soma_y", "soma_z"]].to_numpy(dtype=float)
    anchor = a[["pos_x", "pos_y", "pos_z"]].to_numpy(dtype=float)
    return np.where(np.isnan(soma), anchor, soma) * NM


class Space:
    """Maps nanometres to the Int16 cube shared by brain.bin and every circuit's pos.bin."""

    def __init__(self, all_nm: np.ndarray):
        lo, hi = all_nm.min(axis=0), all_nm.max(axis=0)
        self.centre = (lo + hi) / 2
        self.scale = INT16_SPAN / ((hi - lo).max() / 2)

    def to_int16(self, nm: np.ndarray) -> np.ndarray:
        q = np.round((nm - self.centre) * self.scale)
        q[:, 1] *= -1   # image y runs downwards; flip so dorsal is up on screen
        return q.astype("<i2")

    def as_dict(self) -> dict:
        return {"centre_nm": self.centre.tolist(), "units_per_nm": self.scale}


def text(v) -> str:
    return "" if v is None or (isinstance(v, float) and np.isnan(v)) else str(v)


def build_circuit(cfg: dict, model: Model, ids: np.ndarray, a: pd.DataFrame, space: Space, out: Path) -> dict:
    index = {int(f): i for i, f in enumerate(ids)}
    missing = [f for g in cfg["stimuli"] + cfg["readouts"] for f in g["neurons"] if int(f) not in index]
    if missing:
        print(f"  not in this connectome version, skipped: {missing}")
    group = lambda g: np.array([index[int(f)] for f in g["neurons"] if int(f) in index], dtype=np.int64)
    stimuli = [(s, group(s)) for s in cfg["stimuli"]]
    readouts = [(r, group(r)) for r in cfg["readouts"]]
    trials, t0 = cfg.get("trials", 3), time.time()

    def experiment(stim_idx, rate, silenced=(), n_trials=trials):
        """Mean rates, highest potential, and each trial's readout rates. Trial k always uses seed k,
        so a silencing run sees the same taste input as the baseline trial it is compared with."""
        total, peak, per_trial = np.zeros(model.n), np.full(model.n, -np.inf), []
        for k in range(n_trials):
            c, vp, _ = model.run(stim_idx, silenced, rate_hz=rate, seed=k)
            total += c
            np.maximum(peak, vp, out=peak)
            per_trial.append({r["id"]: float(c[i].mean()) for r, i in readouts})
        return total / n_trials, peak, per_trial

    # 1. every stimulus on its own
    runs = []          # (label, stimulated, rate_hz, silenced, rates)
    ever, peak = np.zeros(model.n, dtype=bool), np.full(model.n, -np.inf)
    for s, idx in stimuli:
        rates, vp, base_trials = experiment(idx, s["rate_hz"])
        runs.append((s["id"], idx, s["rate_hz"], (), rates))
        if s is stimuli[0][0]:
            first_trials = base_trials
        ever |= rates > 0
        np.maximum(peak, vp, out=peak)
        print(f"  {s['id']}: {np.count_nonzero(rates)} neurons active, "
              + ", ".join(f"{r['id']} {rates[i].mean():.1f} Hz" for r, i in readouts) + f"  ({time.time() - t0:.0f} s)")

    # 1b. the same stimuli at other strengths (`extra_rates`). The page's foraging fly drives
    #     the taste neurons harder or softer depending on how sweet a node is, so the subset
    #     has to hold for those strengths too. The measured curve goes into meta.json.
    rate_runs, curve = [], {}
    n_extra = min(trials, cfg.get("extra_trials", trials))
    for (s, idx), run in zip(stimuli, list(runs)):
        points = [(s["rate_hz"], run[4])]
        for rate in s.get("extra_rates", []):
            rates, vp, _ = experiment(idx, rate, n_trials=n_extra)
            rate_runs.append((f"{s['id']} at {rate} Hz", idx, rate, (), rates))
            ever |= rates > 0
            np.maximum(peak, vp, out=peak)
            points.append((rate, rates))
            print(f"  {s['id']} at {rate} Hz: {np.count_nonzero(rates)} neurons active, "
                  + ", ".join(f"{r['id']} {rates[i].mean():.1f} Hz" for r, i in readouts) + f"  ({time.time() - t0:.0f} s)")
        curve[s["id"]] = [{"rate_hz": rate, "active_neurons": int(np.count_nonzero(rates)),
                           "readout_hz": {r["id"]: float(rates[i].mean()) for r, i in readouts}}
                          for rate, rates in sorted(points, key=lambda p: p[0])]

    # 2. the first stimulus again with each of the busiest relay neurons silenced in turn.
    #    Every one of these runs counts towards the subset; the page lists the few
    #    whose silencing moved the first readout most.
    s0, idx0 = stimuli[0]
    base = runs[0][4]
    fixed = np.concatenate([i for _, i in stimuli] + [i for _, i in readouts])
    fixed_set = set(fixed.tolist())
    candidates = [int(i) for i in np.argsort(-base) if base[i] > 0 and i not in fixed_set][: cfg.get("silencing_runs", 0)]
    n_sil = min(trials, cfg.get("silencing_trials", trials))
    key = readouts[0][0]["id"]
    silencing = []
    for c in candidates:
        rates, vp, per_trial = experiment(idx0, s0["rate_hz"], [c], n_sil)
        runs.append((f"{s0['id']} without {c}", idx0, s0["rate_hz"], (c,), rates))
        ever |= rates > 0
        np.maximum(peak, vp, out=peak)
        with_it = {r["id"]: float(np.mean([t[r["id"]] for t in first_trials[:n_sil]])) for r, _ in readouts}
        without = {r["id"]: float(np.mean([t[r["id"]] for t in per_trial])) for r, _ in readouts}
        silencing.append((c, with_it, without))
        print(f"  silenced {ids[c]}: {key} {with_it[key]:.1f} -> {without[key]:.1f} Hz  ({time.time() - t0:.0f} s)")
    silencing.sort(key=lambda s: -abs(s[2][key] - s[1][key]))
    listed = silencing[: cfg.get("silencing_listed", 6)]

    # 3. the subset: everything that fired, everything that came close, and the named neurons
    near = peak > model.p.v_thresh - cfg.get("margin_mv", 2.0)
    keep_mask = ever | near
    keep_mask[fixed] = True
    keep = np.flatnonzero(keep_mask)
    if len(keep) > 65535:
        raise SystemExit(f"{len(keep)} neurons need 32-bit indexes; raise the format before building this circuit")
    new = np.full(model.n, -1, dtype=np.int64)
    new[keep] = np.arange(len(keep))
    pre = np.repeat(np.arange(model.n), np.diff(model.ptr))
    inside = keep_mask[pre] & keep_mask[model.post]
    sub = Model(len(keep), new[pre[inside]], new[model.post[inside]], model.weight[inside], model.p)
    print(f"  subset: {len(keep)} neurons ({np.count_nonzero(ever)} fired, {np.count_nonzero(near & ~ever)} came close), "
          f"{len(sub.post)} connections")
    validate_subset(model, sub, new, keep, runs[0], *rate_runs, runs[-1])

    # 4. write
    d = out / cfg["id"]
    d.mkdir(parents=True, exist_ok=True)
    rows = a.reindex(ids[keep])
    nm = positions_nm(rows)
    nm[np.isnan(nm).any(axis=1)] = space.centre   # the few neurons with no annotation row sit at the centre
    space.to_int16(nm).tofile(d / "pos.bin")
    with open(d / "edges.bin", "wb") as f:
        f.write(sub.ptr.astype("<u4").tobytes())
        f.write(sub.post.astype("<u2").tobytes())
        f.write(np.clip(sub.weight, -32768, 32767).astype("<i2").tobytes())
    name = [text(t) or text(h) for t, h in zip(rows["cell_type"], rows["hemibrain_type"])]
    kind = [" / ".join(x for x in (text(sc), text(cc), text(sub_c)) if x)
            for sc, cc, sub_c in zip(rows["super_class"], rows["cell_class"], rows["cell_sub_class"])]
    meta = {
        "format": FORMAT,
        "id": cfg["id"], "title": cfg["title"], "summary": cfg["summary"],
        "source": {"connectome": "FlyWire FAFB v783", "model": "Shiu et al. 2024", "whole_brain_neurons": int(model.n)},
        "params": model.p.as_dict(),
        "n": int(len(keep)), "m": int(len(sub.post)), "index_bits": 16,
        "files": {"positions": "pos.bin", "edges": "edges.bin"},
        "neurons": {
            "flywire_id": [str(int(f)) for f in ids[keep]],
            "name": name, "kind": kind,
            "transmitter": [text(t) for t in rows["top_nt"]],
            "side": [text(s) for s in rows["side"]],
            "vfb_id": [text(v) for v in rows["vfb_id"]],
        },
        "stimuli": [{"id": s["id"], "label": s["label"], "rate_hz": s["rate_hz"], "neurons": new[i].tolist()} for s, i in stimuli],
        "readouts": [{"id": r["id"], "label": r["label"], "neurons": new[i].tolist()} for r, i in readouts],
        "forage": cfg.get("forage"),
        # whole-brain results, so the page (and its tests) can be compared with them
        "reference": {
            "trials": trials,
            "rate_curve": curve,
            "baseline": [{"stimulus": s["id"], "active_neurons": int(np.count_nonzero(run[4])),
                          "readout_hz": {r["id"]: float(run[4][i].mean()) for r, i in readouts}}
                         for (s, _), run in zip(stimuli, runs)],
            "silencing": [{"neuron": int(new[c]), "stimulus": s0["id"], "trials": n_sil, "with_hz": w, "readout_hz": wo}
                          for c, w, wo in listed],
        },
    }
    (d / "meta.json").write_text(json.dumps(meta, separators=(",", ":")), encoding="utf-8", newline="\n")
    size = sum(p.stat().st_size for p in d.iterdir())
    print(f"  wrote {d} ({size / 1024:.0f} KB)")
    return {"id": cfg["id"], "title": cfg["title"], "summary": cfg["summary"], "meta": f"{cfg['id']}/meta.json", "neurons": int(len(keep))}


def validate_subset(full: Model, sub: Model, new: np.ndarray, keep: np.ndarray, *runs) -> None:
    """With the same random seed the subset must fire exactly like the whole brain did."""
    for label, stim, rate, silenced, _ in runs:
        a, _, _ = full.run(stim, silenced, rate_hz=rate, seed=7, t_run_ms=400)
        b, _, _ = sub.run(new[stim], new[list(silenced)], rate_hz=rate, seed=7, t_run_ms=400)
        same = np.array_equal(a[keep], b) and a.sum() == b.sum()
        print(f"  subset check, {label}: {'identical spike counts' if same else 'DIFFERENT'} ({int(b.sum())} spikes in 400 ms)")
        if not same:
            raise SystemExit("subset does not reproduce the whole-brain run; raise margin_mv or add trials")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("raw", type=Path)
    ap.add_argument("--circuit", help="build only this circuit id (default: all)")
    ap.add_argument("--out", type=Path, default=HERE / "../../public/data/flybrain")
    ap.add_argument("--refresh-config", action="store_true",
                    help="only copy title, summary and forage settings from circuits.json into existing meta.json files")
    args = ap.parse_args()
    cfg = json.loads((HERE / "circuits.json").read_text(encoding="utf-8"))
    out = args.out.resolve()
    out.mkdir(parents=True, exist_ok=True)

    if args.refresh_config:
        for c in cfg["circuits"]:
            path = out / c["id"] / "meta.json"
            if path.exists() and (not args.circuit or c["id"] == args.circuit):
                meta = json.loads(path.read_text(encoding="utf-8"))
                meta.update(title=c["title"], summary=c["summary"], forage=c.get("forage"))
                path.write_text(json.dumps(meta, separators=(",", ":")), encoding="utf-8", newline="\n")
                print(f"refreshed {path}")
        return

    a = load_annotations(args.raw)
    all_nm = positions_nm(a)
    space = Space(all_nm)
    pick = np.random.default_rng(783).choice(len(a), size=cfg["background_points"], replace=False)
    space.to_int16(all_nm[np.sort(pick)]).tofile(out / "brain.bin")

    model, ids = load_shiu(str(args.raw / "Completeness_783.csv"), str(args.raw / "Connectivity_783.parquet"), Params())
    print(f"whole brain: {model.n} neurons, {len(model.post)} connections")

    index_path = out / "index.json"
    index = json.loads(index_path.read_text(encoding="utf-8")) if index_path.exists() else {"circuits": []}
    entries = {c["id"]: c for c in index.get("circuits", [])}
    for c in cfg["circuits"]:
        if args.circuit and c["id"] != args.circuit:
            continue
        print(f"circuit {c['id']}")
        entries[c["id"]] = build_circuit(c, model, ids, a, space, out)
    order = [c["id"] for c in cfg["circuits"] if c["id"] in entries]
    index = {
        "format": FORMAT,
        "brain": {"file": "brain.bin", "points": cfg["background_points"], "space": space.as_dict(), "total_neurons": int(len(a))},
        "circuits": [entries[i] for i in order],
    }
    index_path.write_text(json.dumps(index, indent=1), encoding="utf-8", newline="\n")
    print(f"wrote {index_path}")


if __name__ == "__main__":
    main()
