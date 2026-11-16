"""Leaky integrate-and-fire model of the adult fly brain, in plain numpy.

A reimplementation of the model in Shiu et al., Nature 2024
(https://github.com/philshiu/Drosophila_brain_model, MIT licence), which is
written for the Brian 2 simulator. Same equations, constants, time step and
update order; no Brian 2 install needed. The browser version in
src/flybrain/sim.ts follows this file line for line.
"""
from __future__ import annotations

from dataclasses import dataclass, asdict

import numpy as np


@dataclass(frozen=True)
class Params:
    """Constants from model.py in the Shiu et al. repository (millivolts, milliseconds)."""
    v_rest: float = -52.0      # resting potential
    v_reset: float = -52.0     # potential after a spike
    v_thresh: float = -45.0    # spike threshold
    tau_m: float = 20.0        # membrane time constant
    tau_syn: float = 5.0       # synaptic time constant
    t_refrac: float = 2.2      # refractory period
    t_delay: float = 1.8       # synaptic delay
    w_syn: float = 0.275       # mV per synapse
    poisson_factor: float = 250.0  # a Poisson event kicks v by w_syn * this
    dt: float = 0.1            # time step (Brian 2 default)

    def as_dict(self) -> dict:
        return asdict(self)


class Model:
    """The network: n neurons and a signed synapse count for every connection."""

    def __init__(self, n: int, pre: np.ndarray, post: np.ndarray, weight: np.ndarray, params: Params = Params()):
        order = np.argsort(pre, kind="stable")
        self.n = n
        self.p = params
        self.post = np.ascontiguousarray(post[order], dtype=np.int64)
        self.weight = np.ascontiguousarray(weight[order], dtype=np.float64)   # signed synapse counts
        # CSR row pointers: connections leaving neuron i are ptr[i]:ptr[i+1]
        self.ptr = np.searchsorted(pre[order], np.arange(n + 1))

    def run(self, stimulated, silenced=(), *, rate_hz=150.0, t_run_ms: float = 1000.0,
            seed: int = 0, record_times: bool = False):
        """One trial. Returns (spike counts, highest potential reached, spike times or None).

        `stimulated` neurons get Poisson input at `rate_hz` and have no refractory
        period. `rate_hz` is one number for all of them, or one per stimulated neuron
        (neurons given 0 are left alone). `silenced` neurons still integrate, but nothing they send arrives.
        """
        p, n = self.p, self.n
        rng = np.random.default_rng(seed)
        steps = int(round(t_run_ms / p.dt))
        delay = int(round(p.t_delay / p.dt))
        stimulated = np.asarray(stimulated, dtype=np.int64)
        rates = np.broadcast_to(np.asarray(rate_hz, dtype=float), stimulated.shape)
        stimulated, rates = stimulated[rates > 0], rates[rates > 0]
        mute = np.zeros(n, dtype=bool)
        mute[np.asarray(silenced, dtype=np.int64)] = True

        # exact solution of  dv/dt = (v_rest - v + g) / tau_m,  dg/dt = -g / tau_syn  over one step
        em, es = np.exp(-p.dt / p.tau_m), np.exp(-p.dt / p.tau_syn)
        a = p.tau_syn / (p.tau_syn - p.tau_m)

        v = np.full(n, p.v_rest)
        g = np.zeros(n)
        refrac_steps = np.full(n, int(round(p.t_refrac / p.dt)), dtype=np.int64)
        refrac_steps[stimulated] = 0
        free_at = np.zeros(n, dtype=np.int64)          # first step at which the neuron integrates again
        history = [np.empty(0, dtype=np.int64)] * delay  # spikes waiting out the synaptic delay
        counts = np.zeros(n, dtype=np.int64)
        v_peak = np.full(n, p.v_rest)
        times = [] if record_times else None
        kick = p.w_syn * p.poisson_factor
        p_event = rates * p.dt / 1000.0

        # Only neurons that have ever received input can be away from rest, so only
        # those are integrated. The result is identical and far faster: a taste
        # stimulus reaches a few thousand of the 139,000 neurons.
        touched = np.zeros(n, dtype=bool)
        touched[stimulated] = True
        live = np.flatnonzero(touched)
        grew = False

        for t in range(steps):
            if grew:
                live, grew = np.flatnonzero(touched), False

            # 1. integrate every neuron that is not refractory
            sel = live[free_at[live] <= t]
            ag = a * g[sel]
            v[sel] = p.v_rest + (v[sel] - p.v_rest - ag) * em + ag * es
            g[sel] *= es
            v_peak[sel] = np.maximum(v_peak[sel], v[sel])

            # 2. threshold
            spikes = sel[v[sel] > p.v_thresh]

            # 3. spikes from `delay` steps ago arrive now. Input that lands on a refractory
            #    neuron is dropped: Brian 2 does not let synapses write to a variable
            #    marked "unless refractory" while the neuron is refractory.
            slot = t % delay
            for s in history[slot]:
                lo, hi = self.ptr[s], self.ptr[s + 1]
                tg = self.post[lo:hi]
                ok = free_at[tg] <= t
                tg = tg[ok]
                np.add.at(g, tg, self.weight[lo:hi][ok] * p.w_syn)
                if not touched[tg].all():
                    touched[tg] = True
                    grew = True
            history[slot] = spikes[~mute[spikes]]

            # 4. Poisson input
            if stimulated.size:
                hit = stimulated[rng.random(stimulated.size) < p_event]
                v[hit] += kick

            # 5. reset
            if spikes.size:
                v[spikes] = p.v_reset
                g[spikes] = 0.0
                free_at[spikes] = t + np.maximum(refrac_steps[spikes], 1)
                counts[spikes] += 1
                if times is not None:
                    times.extend((t * p.dt, int(s)) for s in spikes)

        return counts, v_peak, times


def load_shiu(completeness_csv: str, connectivity_parquet: str, params: Params = Params()):
    """Build a Model from the two data files in the Shiu et al. repository.

    Returns (model, flywire_ids) where flywire_ids[i] is the FlyWire root ID of neuron i.
    """
    import pandas as pd

    ids = pd.read_csv(completeness_csv, index_col=0).index.to_numpy(dtype=np.int64)
    con = pd.read_parquet(connectivity_parquet,
                          columns=["Presynaptic_Index", "Postsynaptic_Index", "Excitatory x Connectivity"])
    model = Model(len(ids), con["Presynaptic_Index"].to_numpy(), con["Postsynaptic_Index"].to_numpy(),
                  con["Excitatory x Connectivity"].to_numpy(), params)
    return model, ids
