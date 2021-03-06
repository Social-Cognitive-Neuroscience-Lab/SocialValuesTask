#!/usr/bin/python

"""
util.py
Author: Gabriela Tavares, gtavares@caltech.edu

Utility functions for the aDDM toolbox.
"""

import matplotlib.cm as cm
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from datetime import datetime
from matplotlib.backends.backend_pdf import PdfPages

from addm import FixationData, aDDMTrial, aDDM


def convert_item_values(value):
    return np.absolute((np.absolute(value) - 15) / 5)


def load_data_from_csv(expdataFileName, fixationsFileName,
                       convertItemValues=None):
    """
    Loads experimental data from two CSV files: an experimental data file and a
    fixations file. If angular distances are used, they are expected to be from
    the set [-15, -10, -5, 0, 5, 10, 15] and will be converted into values in
    [0, 1, 2, 3]. Format expected for experimental data file: parcode, trial,
    rt, choice, item_left, item_right. Format expected for fixations file:
    parcode, trial, fix_item, fix_time.
    Args:
      expdataFileName: string, name of experimental data file.
      fixationsFileName: string, name of fixations file.
      convertItemValues: handle to a function that converts item values.
    Returns:
      A dict, indexed by subjectId, where each entry is a list of aDDMTrial
          objects.
    """
    # Load experimental data from CSV file.
    try:
        df = pd.DataFrame.from_csv(expdataFileName, header=0, sep=",",
                                   index_col=None)
    except:
        print("Error while reading experimental data file " + expdataFileName)
        raise

    if ("parcode" not in df.columns or "trial" not in df.columns or
        "rt" not in df.columns or "choice" not in df.columns or
        "item_left" not in df.columns or "item_right" not in df.columns):
        raise RuntimeError("Missing field in experimental data file. Fields "
                           "required: parcode, trial, rt, choice, item_left "
                           "item_right")

    data = dict()
    subjectIds = df.parcode.unique()
    for subjectId in subjectIds:
        data[subjectId] = list()
        dataSubject = np.array(
            df.loc[df["parcode"]==subjectId,
            ["trial", "rt", "choice", "item_left", "item_right"]])
        trialIds = np.unique(dataSubject[:,0]).tolist()
        for trialId in trialIds:
            dataTrial = np.array(
                df.loc[(df["trial"]==trialId) & (df["parcode"]==subjectId),
                ["rt", "choice", "item_left", "item_right"]])
            itemLeft = dataTrial[0,2]
            itemRight = dataTrial[0,3]
            if convertItemValues:
                data[subjectId].append(
                    aDDMTrial(RT=dataTrial[0,0], choice=dataTrial[0,1],
                              valueLeft=convertItemValues(itemLeft),
                              valueRight=convertItemValues(itemRight)))
            else:
                data[subjectId].append(
                    aDDMTrial(RT=dataTrial[0,0], choice=dataTrial[0,1],
                              valueLeft=itemLeft, valueRight=itemRight))

    # Load fixation data from CSV file.
    try:
        df = pd.DataFrame.from_csv(
            fixationsFileName, header=0, sep=",", index_col=None)
    except:
        print("Error while reading fixations file " + fixationsFileName)
        raise

    if ("parcode" not in df.columns or "trial" not in df.columns or
        "fix_item" not in df.columns or "fix_time" not in df.columns):
        raise RuntimeError("Missing field in fixations file. Fields required: "
                           "parcode, trial, fix_item, fix_time")

    subjectIds = df.parcode.unique()
    for subjectId in subjectIds:
        if not subjectId in data:
            continue
        dataSubject = np.array(
            df.loc[df["parcode"]==subjectId,
            ["trial", "fix_item", "fix_time"]])
        trialIds = np.unique(dataSubject[:,0]).tolist()
        for t, trialId in enumerate(trialIds):
            dataTrial = np.array(
                df.loc[(df["trial"]==trialId) & (df["parcode"]==subjectId),
                ["fix_item", "fix_time"]])
            data[subjectId][t].fixItem = dataTrial[:,0]
            data[subjectId][t].fixTime = dataTrial[:,1]

    return data


def get_empirical_distributions(data, timeStep=10, maxFixTime=3000,
                                numFixDists=3, fixDistType="fixation",
                                valueDiffs=range(-3,4,1), subjectIds=None,
                                useOddTrials=True, useEvenTrials=True,
                                useCisTrials=True, useTransTrials=True):
    """
    Creates empirical distributions from the data to be used when generating
    model simulations.
    Args:
      data: a dict, indexed by subjectId, where each entry is a list of
          aDDMTrial objects.
      timeStep: integer, minimum duration of a fixation to be considered, in
          miliseconds.
      maxFixTime: integer, maximum duration of a fixation to be considered, in
          miliseconds.
      numFixDists: integer, number of fixation types to use in the fixation
          distributions. For instance, if numFixDists equals 3, then 3 separate
          fixation types will be used, corresponding to the 1st, 2nd and other
          (3rd and up) fixations in each trial.
      fixDistType: string, one of {'simple', 'difficulty', 'fixation'}, used to
          determine how the fixation distributions should be indexed. If
          'simple', then fixation distributions will be indexed only by type
          (1st, 2nd, etc). If 'difficulty', they will be indexed by type and by
          trial difficulty, i.e., the absolute value for the trial's value
          difference. If 'fixation', they will be indexed by type and by the
          value difference between the fixated and unfixated items.
      valueDiffs: list of integers. If fixDistType is 'difficulty' or
          'fixation', valueDiffs is a range correspoding to the item values to
          be used when indexing the fixation distributions.
      subjectIds: list of strings corresponding to the subjects whose data
          should be used. If not provided, all existing subjects will be used.
      useOddTrials: boolean, whether or not to use odd trials when creating the
          distributions.
      useEvenTrials: boolean, whether or not to use even trials when creating
          the distributions.
      useCisTrials: boolean, whether or not to use cis trials when creating the
          distributions (for perceptual decisions only).
      useTransTrials: boolean, whether or not to use trans trials when creating
          the distributions (for perceptual decisions only).
    Returns:
      A FixationData object.
    """
    if (fixDistType is not "simple" and fixDistType is not "difficulty" and
        fixDistType is not "fixation"):
        raise RuntimeError("fixDistType must be one of {simple, difficulty, "
                           "fixation}")

    countLeftFirst = 0
    countTotalTrials = 0
    latenciesList = list()
    transitionsList = list()
    fixationsList = dict()
    for fixNumber in xrange(1, numFixDists + 1):
        if fixDistType == "simple":
            fixationsList[fixNumber] = list()
        else:
            fixationsList[fixNumber] = dict()
            for valueDiff in valueDiffs:
                fixationsList[fixNumber][valueDiff] = list()

    if not subjectIds:
        subjectIds = data.keys()

    for subjectId in subjectIds:
        for trialId, trial in enumerate(data[subjectId]):
            if not useOddTrials and trialId % 2 != 0:
                continue
            if not useEvenTrials and trialId % 2 == 0:
                continue
            isCisTrial = (True if trial.valueLeft * trial.valueRight >= 0
                          else False)
            isTransTrial = (True if trial.valueLeft * trial.valueRight <= 0
                            else False)
            if not useCisTrials and isCisTrial and not isTransTrial:
                continue
            if not useTransTrials and isTransTrial and not isCisTrial:
                continue

            # Discard trial if it has 1 or less item fixations.
            items = trial.fixItem
            if (not np.any(items) or
                (items[(items==1) | (items==2)].shape[0]) <= 1):
                continue
            fixUnfixValueDiffs = {1: trial.valueLeft - trial.valueRight,
                                  2: trial.valueRight - trial.valueLeft}
            # Find the last item fixation in this trial.
            excludeCount = 0
            for i in xrange(trial.fixItem.shape[0] - 1, -1, -1):
                excludeCount += 1
                if (trial.fixItem[i] == 1 or trial.fixItem[i] == 2):
                    break
            # Iterate over this trial's fixations (skip the last item
            # fixation).
            latency = 0
            firstItemFixReached = False
            fixNumber = 1
            for i in xrange(trial.fixItem.shape[0] - excludeCount):
                if trial.fixItem[i] != 1 and trial.fixItem[i] != 2:
                    if not firstItemFixReached:
                        latency += trial.fixTime[i]
                    elif (trial.fixTime[i] >= timeStep and
                          trial.fixTime[i] <= maxFixTime):
                        transitionsList.append(trial.fixTime[i])
                else:
                    if not firstItemFixReached:
                        firstItemFixReached = True
                        latenciesList.append(latency)
                    if fixNumber == 1:
                        countTotalTrials += 1
                        if trial.fixItem[i] == 1:  # First fixation was left.
                            countLeftFirst += 1
                    if (trial.fixTime[i] >= timeStep and
                        trial.fixTime[i] <= maxFixTime):
                        if fixDistType == "simple":
                            fixationsList[fixNumber].append(trial.fixTime[i])
                        elif fixDistType == "difficulty":
                            valueDiff = np.absolute(
                                trial.valueLeft - trial.valueRight)
                            fixationsList[fixNumber][valueDiff].append(
                                trial.fixTime[i])
                        elif fixDistType == "fixation":
                            valueDiff = fixUnfixValueDiffs[trial.fixItem[i]]
                            fixationsList[fixNumber][valueDiff].append(
                                trial.fixTime[i])
                    if fixNumber < numFixDists:
                        fixNumber += 1
                
    probFixLeftFirst = float(countLeftFirst) / float(countTotalTrials)
    latencies = np.array(latenciesList)
    transitions = np.array(transitionsList)
    fixations = dict()
    for fixNumber in xrange(1, numFixDists + 1):
        if fixDistType == "simple":
            fixations[fixNumber] = np.array(fixationsList[fixNumber])
        else:
            fixations[fixNumber] = dict()
            for valueDiff in valueDiffs:
                fixations[fixNumber][valueDiff] = np.array(
                    fixationsList[fixNumber][valueDiff])

    return FixationData(probFixLeftFirst, latencies, transitions, fixations,
                        fixDistType)


def save_simulations_to_csv(trials, expdataFileName, fixationsFileName):
    """
    Saves the simulations generated with the aDDM algorithm into 2 CSV files.
    In file simul_expdata.csv, each row corresponds to a simulated trial, with
    columns parcode, trial, rt, choice, item_left and item_right. In file
    simul_fixations.csv, each row corresponds to a fixation, with columns
    parcode, trial, fix_item and fix_time.
    Args:
      trials: a list of aDDMTrial objects.
    """
    expdata = pd.DataFrame()
    fixations = pd.DataFrame()
    for t, trial in enumerate(trials):
        expdata = expdata.append(
            {"parcode": 0, "trial": t, "rt": trial.RT, "choice": trial.choice,
             "item_left": trial.valueLeft, "item_right": trial.valueRight},
            ignore_index=True)

        for item, time in zip(trial.fixItem, trial.fixTime):
            fixations = fixations.append(
                {"parcode": 0, "trial": t, "fix_item": item, "fix_time": time},
                ignore_index=True)

    try:
        expdata.to_csv(
            expdataFileName, sep=",", index=False, float_format="%d",
            columns=["parcode", "trial", "rt", "choice", "item_left",
                     "item_right"])
    except:
        print("Failed to save experimental data to CSV file.")
        raise
    try:
        fixations.to_csv(
            fixationsFileName, sep=",", index=False, float_format="%d",
            columns=["parcode", "trial", "fix_item", "fix_time"])
    except:
        print("Failed to save fixations to CSV file.")
        raise


def generate_choice_curves(dataTrials, simulTrials, pdfPages):
    """
    Plots the psychometric choice curves for data and simulations.
    Args:
      dataTrials: a list of aDDMTrial objects corresponding to the experimental
          data.
      simulTrials: a list of aDDMTrial objects corresponding to the
          simulations.
      pdfPages: matplotlib.backends.backend_pdf.PdfPages object.
    """
    countTotal = np.zeros(7)
    countLeftChosen = np.zeros(7)

    for trial in dataTrials:
        valueDiff = trial.valueLeft - trial.valueRight
        idx = valueDiff + 3
        if trial.choice == -1:  # Choice was left.
            countLeftChosen[idx] +=1
            countTotal[idx] += 1
        elif trial.choice == 1:  # Choice was right.
            countTotal[idx] += 1

    stdProbLeftChosen = np.zeros(7)
    probLeftChosen = np.zeros(7)
    for i in xrange(0,7):
        probLeftChosen[i] = countLeftChosen[i] / countTotal[i]
        stdProbLeftChosen[i] = np.sqrt(
            (probLeftChosen[i] * (1 - probLeftChosen[i])) / countTotal[i])

    colors = cm.rainbow(np.linspace(0, 1, 9))
    fig = plt.figure()
    plt.errorbar(range(-3,4,1), probLeftChosen, yerr=stdProbLeftChosen,
                 color=colors[0], label="Data")

    countTotal = np.zeros(7)
    countLeftChosen = np.zeros(7)

    for trial in simulTrials:
        valueDiff = trial.valueLeft - trial.valueRight
        idx = valueDiff + 3
        if trial.choice == -1:  # Choice was left.
            countLeftChosen[idx] +=1
            countTotal[idx] += 1
        elif trial.choice == 1:  # Choice was right.
            countTotal[idx] += 1

    stdProbLeftChosen = np.zeros(7)
    probLeftChosen = np.zeros(7)
    for i in xrange(0,7):
        probLeftChosen[i] = countLeftChosen[i] / countTotal[i]
        stdProbLeftChosen[i] = np.sqrt(
            (probLeftChosen[i] * (1 - probLeftChosen[i])) / countTotal[i])

    plt.errorbar(range(-3,4,1), probLeftChosen, yerr=stdProbLeftChosen,
                 color=colors[5], label="Simulations")
    plt.xlabel("Value difference")
    plt.ylabel("P(choose left)")
    plt.legend()

    pdfPages.savefig(fig)
    plt.close(fig)


def generate_rt_curves(dataTrials, simulTrials, pdfPages):
    """
    Plots the reaction times for data and simulations.
    Args:
      dataTrials: a list of aDDMTrial objects corresponding to the experimental
          data.
      simulTrials: a list of aDDMTrial objects corresponding to the
          simulations.
      pdfPages: matplotlib.backends.backend_pdf.PdfPages object.
    """
    RTsPerValueDiff = dict()
    for valueDiff in xrange(-3,4,1):
        RTsPerValueDiff[valueDiff] = list()

    for trial in dataTrials:
        valueDiff = trial.valueLeft - trial.valueRight
        RTsPerValueDiff[valueDiff].append(trial.RT)

    meanRTs = np.zeros(7)
    stdRTs = np.zeros(7)
    for valueDiff in xrange(-3,4,1):
        idx = valueDiff + 3
        meanRTs[idx] = np.mean(RTsPerValueDiff[valueDiff])
        stdRTs[idx] = (np.std(RTsPerValueDiff[valueDiff]) /
                       np.sqrt(len(RTsPerValueDiff[valueDiff])))

    colors = cm.rainbow(np.linspace(0, 1, 9))
    fig = plt.figure()
    plt.errorbar(range(-3,4,1), meanRTs, yerr=stdRTs, label="Data",
                 color=colors[0])

    RTsPerValueDiff = dict()
    for valueDiff in xrange(-3,4,1):
        RTsPerValueDiff[valueDiff] = list()

    for trial in simulTrials:
        valueDiff = trial.valueLeft - trial.valueRight
        RTsPerValueDiff[valueDiff].append(trial.RT)

    meanRTs = np.zeros(7)
    stdRTs = np.zeros(7)
    for valueDiff in xrange(-3,4,1):
        idx = valueDiff + 3
        meanRTs[idx] = np.mean(RTsPerValueDiff[valueDiff])
        stdRTs[idx] = (np.std(RTsPerValueDiff[valueDiff]) /
                       np.sqrt(len(RTsPerValueDiff[valueDiff])))

    plt.errorbar(range(-3,4,1), meanRTs, yerr=stdRTs, label="Simulations",
                 color=colors[5])
    plt.xlabel("Value difference")
    plt.ylabel("Mean RT")
    plt.legend()
    
    pdfPages.savefig(fig)
    plt.close(fig)
