"""Check lif.py against the reference run shipped with the Shiu et al. repository.

Their results/example/sugarR.parquet holds 30 one-second trials of the sugar
neurons driven on FlyWire version 630. This runs the same experiment here and
compares firing rates.

    python validate.py RAW_DIR [trials]
"""
import sys
import time

import numpy as np
import pandas as pd

from lif import load_shiu

SUGAR = [720575940624963786, 720575940630233916, 720575940637568838, 720575940638202345, 720575940617000768,
         720575940630797113, 720575940632889389, 720575940621754367, 720575940621502051, 720575940640649691,
         720575940639332736, 720575940616885538, 720575940639198653, 720575940620900446, 720575940617937543,
         720575940632425919, 720575940633143833, 720575940612670570, 720575940628853239, 720575940629176663,
         720575940611875570]
MN9 = 720575940660219265

raw = sys.argv[1]
trials = int(sys.argv[2]) if len(sys.argv) > 2 else 3
model, ids = load_shiu(f"{raw}/2023_03_23_completeness_630_final.csv", f"{raw}/2023_03_23_connectivity_630_final.parquet")
index = {int(f): i for i, f in enumerate(ids)}

ref = pd.read_parquet(f"{raw}/sugarR.parquet")
ref_rate = np.zeros(model.n)
for fid, c in ref.groupby("flywire_id").size().items():
    ref_rate[index[int(fid)]] = c / (ref["trial"].max() + 1)
# the reference sensory neurons fire at about this rate, which is the Poisson rate that was used
rate_hz = float(np.round(np.mean([ref_rate[index[s]] for s in SUGAR])))

total = np.zeros(model.n)
t0 = time.time()
for k in range(trials):
    counts, _, _ = model.run([index[s] for s in SUGAR], rate_hz=rate_hz, seed=k)
    total += counts
mine = total / trials
print(f"{trials} trials in {time.time() - t0:.0f} s, Poisson rate {rate_hz:.0f} Hz")
print(f"active neurons   reference {np.count_nonzero(ref_rate)}   here {np.count_nonzero(mine)}")
print(f"MN9 rate (Hz)    reference {ref_rate[index[MN9]]:.1f}   here {mine[index[MN9]]:.1f}")
both = (ref_rate > 0) | (mine > 0)
print(f"rate correlation over {both.sum()} neurons active in either: {np.corrcoef(ref_rate[both], mine[both])[0, 1]:.4f}")
print(f"largest rate difference: {np.abs(ref_rate - mine).max():.1f} Hz; mean over active: {np.abs(ref_rate - mine)[both].mean():.2f} Hz")
