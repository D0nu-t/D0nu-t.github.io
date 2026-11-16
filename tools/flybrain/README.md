# Fly brain data build

Builds the data files behind `projects/fly-brain.html`. The page code reads
whatever is in `public/data/flybrain/`, so adding a circuit means adding data,
not changing TypeScript.

## Files here

| File | What it does |
| --- | --- |
| `lif.py` | The whole-brain model of Shiu et al. (2024) in plain numpy. `src/flybrain/sim.ts` is the same algorithm. |
| `circuits.json` | One entry per circuit: which neurons to stimulate, which to measure, how many silencing runs. |
| `build_data.py` | Runs each circuit's experiments on the whole brain, keeps the neurons involved, writes the data files. |
| `validate.py` | Compares `lif.py` with the reference results published in the model's repository. |

## Sources

All external. Download into one folder (called `RAW` below), outside this repository.

| File | From | Licence |
| --- | --- | --- |
| `Completeness_783.csv`, `Connectivity_783.parquet` | https://github.com/philshiu/Drosophila_brain_model | MIT |
| `2023_03_23_completeness_630_final.csv`, `2023_03_23_connectivity_630_final.parquet`, `results/example/sugarR.parquet` (saved as `sugarR.parquet`); only `validate.py` needs these | same repository | MIT |
| `supplemental_files/Supplemental_file1_neuron_annotations.tsv` (saved as `neuron_annotations.tsv`) | https://github.com/flyconnectome/flywire_annotations | No licence file in the repository; it asks for citation of Schlegel et al. 2024 and Dorkenwald et al. 2024 |

The connection tables derive from FlyWire FAFB v783 (CC BY 4.0, https://zenodo.org/records/10676866).

```bash
RAW=/path/to/raw
B=https://raw.githubusercontent.com/philshiu/Drosophila_brain_model/main
curl -L -o $RAW/Completeness_783.csv $B/Completeness_783.csv
curl -L -o $RAW/Connectivity_783.parquet $B/Connectivity_783.parquet
curl -L -o $RAW/neuron_annotations.tsv https://raw.githubusercontent.com/flyconnectome/flywire_annotations/main/supplemental_files/Supplemental_file1_neuron_annotations.tsv
```

## Build

Needs Python 3.10 or later with `numpy`, `pandas` and `pyarrow`.

```bash
python build_data.py $RAW                  # every circuit
python build_data.py $RAW --circuit sugar  # one circuit
python validate.py $RAW 6                  # optional: check lif.py against the published run
```

A trial of one second of brain time takes about 9 s. The sugar circuit (3 baseline
trials, 4 extra rates and 24 silencing runs of 2 trials each) builds in about 9 minutes.

## How a circuit is cut out

1. Drive each stimulus on the whole brain for `trials` one-second trials.
2. Take the `silencing_runs` busiest neurons that are neither stimulated nor measured,
   and repeat the first stimulus with each one silenced. Trial `k` always uses random
   seed `k`, so a silencing run gets the same input as the baseline trial it is compared with.
3. Keep every neuron that fired in any run, every neuron that came within `margin_mv`
   of threshold, and the stimulated and measured neurons.
4. Keep the connections among those neurons.

A neuron that never fires sends nothing, so removing it changes nothing for the runs
above. The build checks this: with the same seed, the subset must give exactly the same
spike counts as the whole brain, or the build stops. Experiments outside the ones that
were run (silencing some other neuron, say) are approximations in the browser.

The `silencing_listed` neurons whose silencing changed the first readout most are
written to `meta.json` and shown on the page as "Neurons to try silencing".

## Stimulus strengths and the foraging fly

On the page a fly forages over the skills graph (`src/flybrain/forage.ts`). When it lands
on a node it drives the circuit's first stimulus at a rate set by the node's sweetness and
picks the node up once the first readout has fired enough. Two things in `circuits.json`
support that:

- `extra_rates` on a stimulus: other drive rates (Hz) to run on the whole brain. They count
  towards the subset and its exactness check, and the measured results are written to
  `meta.json` as `reference.rate_curve`. Run `extra_trials` trials of each.
- `forage` on a circuit: `min_rate_hz` and `max_rate_hz` (drive for the least and most sweet
  node), `spikes_to_eat` and `give_up_ms`. Keep the rates inside the range covered by
  `rate_hz` and `extra_rates`. A circuit without `forage` shows no foraging panel.

Changing only `forage`, `title` or `summary` does not need a whole-brain run:

```bash
python build_data.py $RAW --refresh-config
```

For the sugar circuit the curve is 0 Hz at a 25 Hz drive, 14 Hz at 50, 68 Hz at 100, 79 Hz
at 150 and 85 Hz at 200. With 12 spikes to eat and 400 ms to give up, a node driven at about
60 Hz is a coin flip and anything below is left.

## Adding a circuit

1. Add an entry to `circuits.json` with an `id`, a `title`, a `summary`, one or more
   `stimuli` (FlyWire root IDs from version 783, with a `rate_hz`) and one or more
   `readouts`. The annotation table's `cell_class` and `cell_sub_class` columns are a
   quick way to find IDs, for example the bitter or water taste neurons.
2. Run `python build_data.py $RAW --circuit <id>`.
3. Reload the page. A circuit picker appears once `index.json` lists more than one circuit.

## Data format (version 1)

```
index.json            { format, brain: { file, points, space, total_neurons }, circuits: [{ id, title, summary, meta, neurons }] }
brain.bin             Int16 x, y, z per background point
<id>/meta.json        format, params (model constants), n, m, index_bits, neurons (parallel arrays),
                      stimuli, readouts, forage (optional), reference (whole-brain results: baseline,
                      rate_curve, silencing)
<id>/pos.bin          Int16 x, y, z per circuit neuron, same space as brain.bin
<id>/edges.bin        Uint32 ptr[n+1], then Uint16 target[m], then Int16 synapses[m] (signed: negative inhibits)
```

Coordinates are centred and scaled so the longest axis spans about -32000 to 32000;
`index.json` records the transform back to nanometres. Indexes are 16-bit, which allows
65,535 neurons per circuit. A larger circuit needs `index_bits: 32` written by the build;
the page already reads both widths.

The page refuses data whose `format` it does not know, so a breaking change to these
files should raise the number in `build_data.py` and `src/flybrain/index.ts` together.

## Things the build taught

- Brian 2 drops synaptic input that arrives while the target neuron is refractory,
  because the model marks its variables "unless refractory". Keeping that input makes
  busy neurons fire up to twice as fast. `lif.py` and `sim.ts` both drop it.
- Only neurons that have received input can be away from rest. Integrating just those
  gives identical results about five times faster.
