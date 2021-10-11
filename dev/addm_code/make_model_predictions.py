#!/usr/bin/python

"""
Usage:

python make_model_predictions.py --verbose --num-simulations 10000 --time-step 20

"""

import argparse
import matplotlib.pyplot as plt
import numpy as np
import sys

from addm import (FixationData, aDDMTrial, aDDM)
from util import (load_data_from_csv, convert_item_values,
                  get_empirical_distributions)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--num-simulations", type=int, default=100000,
                        help="Number of artificial data trials to be generated "
                        "per trial condition.")
    parser.add_argument("--time-step", type=int, default=10,
                        help="Time step.")
    parser.add_argument("--bin-size", type=int, default=20,
                        help="Size of the time bin.")
    parser.add_argument("--d-1", type=float,
                        default=0.0041, help="d for model 1.")
    parser.add_argument("--sigma-1", type=float,
                        default=0.063, help="sigma for model 1.")
    parser.add_argument("--theta-1", type=float,
                        default=0.36, help="theta for model 1.")
    parser.add_argument("--d-2", type=float,
                        default=0.0024, help="d for model 2.")
    parser.add_argument("--sigma-2", type=float,
                        default=0.062, help="sigma for model 2.")
    parser.add_argument("--theta-2", type=float,
                        default=1, help="theta for model 2.")
    parser.add_argument("--expdata-file-name", type=str, default="expdata.csv",
                        help="Name of experimental data file.")
    parser.add_argument("--fixations-file-name", type=str,
                        default="fixations.csv",
                        help="Name of fixations file.")
    parser.add_argument("--verbose", default=False, action="store_true",
                        help="Increase output verbosity.")

    args = parser.parse_args()

    trialConditions = [(0, 0), (0, 1), (0, 1), (0, 2), (0, 2), (0, 3),
                       (1, 0), (1, 0), (1, 1), (1, 2), (1, 2), (1, 3),
                       (2, 0), (2, 0), (2, 1), (2, 1), (2, 2), (2, 3),
                       (3, 0), (3, 1), (3, 2)
                      ]

    # Get trial conditions.
    trialGroups1 = {}
    for vLeft, vRight in set(trialConditions):
        for timeDiff in np.arange(-3000, 3000 + args.bin_size, args.bin_size):
            trialGroups1[(vLeft,vRight,timeDiff)] = []

    # Load experimental data from CSV file.
    if args.verbose:
        print("Loading experimental data...")
    data = load_data_from_csv(
        args.expdata_file_name, args.fixations_file_name,
        convertItemValues=convert_item_values)
    dataTrials = list()
    subjectIds = data.keys()
    for subjectId in subjectIds:
        dataTrials.extend(data[subjectId])

    # Get fixation distributions.
    if args.verbose:
        print("Getting fixation distributions from even trials...")
    fixationData = get_empirical_distributions(
        data, subjectIds=subjectIds, useOddTrials=True, useEvenTrials=True,
        maxFixTime=5000)

    # Generate simulations for aDDM conditioning on value left, value right and
    # net fixation time for left item.
    addmTrials = []
    if args.verbose:
        print("Generating aDDM simulations...")
    model = aDDM(args.d_1, args.sigma_1, args.theta_1)
    for c, trialCondition in enumerate(trialConditions):
        print("Trial condition %d / %d" % (c + 1, len(trialConditions)))
        vLeft = trialCondition[0]
        vRight = trialCondition[1]
        for _ in xrange(args.num_simulations):
            addmTrials.append(
                model.simulate_trial(vLeft, vRight, fixationData))

    # Group aDDM simulations.
    for trial in addmTrials:
        timeDiff = 0
        for loc, time in zip(trial.fixItem, trial.fixTime):
            if loc == 1:
                timeDiff += time
            elif loc == 2:
                timeDiff -= time
        timeDiff = timeDiff - (timeDiff % args.bin_size)
        timeDiff = max(-3000, timeDiff)
        timeDiff = min(3000, timeDiff)
        trialGroups1[(
            trial.valueLeft, trial.valueRight, timeDiff)].append(trial)
    del addmTrials

    correctChoiceADDM1 = 0
    sseRtADDM1 = 0
    denADDM1 = len(dataTrials)

    for trial in dataTrials:
        # Get aDDM prediction.
        timeDiff = 0
        for loc, time in zip(trial.fixItem, trial.fixTime):
            if loc == 1:
                timeDiff += time
            elif loc == 2:
                timeDiff -= time
        timeDiff = timeDiff - (timeDiff % args.bin_size)
        timeDiff = max(-3000, timeDiff)
        timeDiff = min(3000, timeDiff)

        numSimul = len(
            trialGroups1[(trial.valueLeft, trial.valueRight, timeDiff)])
        if numSimul < 1:
            denADDM -= 1
            print("ADDM EMPTY BUCKET: " + str(trial.valueLeft) + " " +
                str(trial.valueRight) + " " + str(timeDiff))
        else:
            idx = np.random.randint(numSimul)
            simul = trialGroups1[(
                trial.valueLeft, trial.valueRight, timeDiff)][idx]
            if trial.choice == simul.choice:
                correctChoiceADDM1 += 1
            sseRtADDM1 += ((trial.RT - simul.RT) / 1000.) ** 2

    probCorrectADDM1 = float(correctChoiceADDM1) / len(dataTrials)
    sseRtADDM1 = float(sseRtADDM1) / denADDM1

    correctChoiceADDM2 = 0
    sseRtADDM2 = 0

    # Generate simulations for aDDM using same fixations as the data trials.
    if args.verbose:
        print("Generating aDDM simulations...")
    model = aDDM(args.d_1, args.sigma_1, args.theta_1)
    for i, trial in enumerate(dataTrials):
        if args.verbose and i % 500 == 0:
            print("Trial %d / %d" % (i + 1, len(dataTrials)))
        simul = model.simulate_trial_2(trial.valueLeft, trial.valueRight,
            fixationData, initFixItem=trial.fixItem, initFixTime=trial.fixTime)
        if trial.choice == simul.choice:
            correctChoiceADDM2 += 1
        sseRtADDM2 += ((trial.RT - simul.RT) / 1000.) ** 2

    probCorrectADDM2 = float(correctChoiceADDM2) / len(dataTrials)
    sseRtADDM2 = float(sseRtADDM2) / len(dataTrials)

    correctChoiceDDM = 0
    sseRtDDM = 0

    # Generate simulations for DDM using same fixations as the data trials.
    if args.verbose:
        print("Generating DDM simulations...")
    model = aDDM(args.d_2, args.sigma_2, args.theta_2)
    for i, trial in enumerate(dataTrials):
        if args.verbose and i % 500 == 0:
            print("Trial %d / %d" % (i + 1, len(dataTrials)))
        simul = model.simulate_trial_2(trial.valueLeft, trial.valueRight,
            fixationData, initFixItem=trial.fixItem, initFixTime=trial.fixTime)
        if trial.choice == simul.choice:
            correctChoiceDDM += 1
        sseRtDDM += ((trial.RT - simul.RT) / 1000.) ** 2

    probCorrectDDM = float(correctChoiceDDM) / len (dataTrials)
    sseRtDDM = float(sseRtDDM) / len(dataTrials)

    print("Choice prediction score with aDDM 1: " + str(probCorrectADDM1))
    print("Choice prediction score with aDDM 2: " + str(probCorrectADDM2))
    print("Choice prediction score with DDM: " + str(probCorrectDDM))
    print("RT mean sum of squared errors with aDDM 1: " + str(sseRtADDM1))
    print("RT mean sum of squared errors with aDDM 2: " + str(sseRtADDM2))
    print("RT mean sum of squared errors with DDM: " + str(sseRtDDM))


if __name__ == "__main__":
    main()
