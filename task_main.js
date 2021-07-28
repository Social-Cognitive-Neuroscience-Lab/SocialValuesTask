
/* experiment parameters */
var FIXATION_DURATION = 3; // in seconds
var FIXATION_MIN = 1;
var FIXATION_MAX = 12;
var STIMULUS_DURATION = 3000;
var ISSUE_N = 5; // number of issues to show
var STIM_N = 10; // number of trials in choice task

var timeline = [];

var rating_list = []; // array of arrays [issue, support, moral]
var resp_issue = []; // hold array of issues with responses in part 1
var resp_support = []; // hold array of support ratings
var resp_mor1 = []; // hold array of first moral ratings
var resp_mor2 = []; // hold array of second moral ratings
var resp_fam = []; // hold array of familiarity ratings

/* cosmetics */
function set_html_light() {
    document.body.style.backgroundColor = "#fff";
    document.body.style.color = "#000";
}

function set_html_dark() {
    document.body.style.backgroundColor = "#000";
    document.body.style.color = "#fff";
}

/* function for ISI with exponential distribution with mean and min/max values */
function randExp(mean=FIXATION_DURATION, lower_bound=FIXATION_MIN, upper_bound=FIXATION_MAX) {
    var rate = 1 / mean
    var rand_u = Math.random()
    rand_u = -Math.log(rand_u) / rate

    if (rand_u < lower_bound || rand_u > upper_bound) {
        return randExp(mean, lower_bound, upper_bound);
    }
    else {
        // console.log(rand_u);
        return rand_u * 1000;
    }

}

/* create survey instructions */
var survey_inst = {
    type: 'html-keyboard-response',
    on_start: set_html_light,
    stimulus: `<p>For this section, you will read about some social issues and then answer some
        questions about your views on those issues.</p>`,
    choices: jsPsych.ALL_KEYS,
    prompt: '<p>Press any key to continue</p>'
}
timeline.push(survey_inst);

/* create survey questions */
var familiar_options = [
    'Not at all familiar',
    'Slightly familiar',
    'Somewhat familiar',
    'Moderately familiar',
    'Very familiar'
];

var support_options = [
    'Stongly oppose',
    'Oppose',
    'Somewhat oppose',
    'Neutral',
    'Somewhat support',
    'Support',
    'Strongly support'
];

var moral_options = [
    'Not at all',
    'Slightly',
    'Somewhat',
    'Moderately',
    'Very much'
]


var issue_trial = {
    type: 'survey-likert',
    preamble: function () {
        return ('<p style="font-size:x-large">'+jsPsych.timelineVariable("Issue", true)+'</p>');
    },
    questions: [
        {prompt: function () {
            return ('How familiar are you with arguments for or against '+jsPsych.timelineVariable("Issue", true).toLowerCase() +'?');
            }, 
            name: 'Familiar', labels: familiar_options, required: true},
        {prompt: function () {
            return ('How much do you support or oppose '+jsPsych.timelineVariable("Issue", true).toLowerCase() +'?');
            }, 
            name: 'Support', labels: support_options, required: true},
        {prompt: function() {
            return ('To what extent is your position on '+jsPsych.timelineVariable("Issue", true).toLowerCase() 
            +' a reflection of your core moral beliefs and convictions?')
        },
            name: 'Moral1', labels: moral_options, required:true, horizontal: true},
        {prompt: function() {
            return ('To what extent is your position on '+jsPsych.timelineVariable("Issue", true).toLowerCase() +
            ' connected to your beliefs about fundamental right and wrong?')
        }, 
            name: 'Moral2', labels: moral_options, required:true}
    ],
    data: {
        task: 'rating',
        Issue: jsPsych.timelineVariable('Issue'),
        Short: jsPsych.timelineVariable('Short')
    },
    on_finish: function(data){
        data.support = data.response['Support'];
        data.moral = data.response['Moral1'] + data.response['Moral2'];
        data.mor1 = data.response['Moral1'];
        data.mor2 = data.response['Moral2'];
        data.familiar = data.response['Familiar'];

        if(data.familiar == 0){
            var dnk = true;
        } else {
            var dnk = false;
        }
        data.dnk = dnk;
    }
}

var issues_with_variables = {
    timeline: [issue_trial],
    timeline_variables: issue_list.slice(0, ISSUE_N)
};

timeline.push(issues_with_variables)


/* 
search 'support' and 'moral' arrays for specific values of
's_target' and 'm_target', then return that entry from 'issues'

if no issue can be found, return 0
*/
function get_issue(issues, support, moral, s_target, m_target) {
    var iss = 0

    for (ii = 0; ii < issues.length; ii++) {
            s_cur = support[ii];
            m_cur = moral[ii];

            // check if current support and moral ratings are within target range
            if (s_target.includes(s_cur) && m_target.includes(m_cur) ) {
                iss = issues[ii];
                break;
            }
        } 
    return iss;
}

/* 
search 'support' and 'moral' arrays for specific values of
's_target' and 'm_target', then return all matching entries from 'issues'

if no issue can be found, return []
*/
function get_issues(issues, support, moral, s_target, m_target) {
    var iss = []

    for (ii = 0; ii < issues.length; ii++) {
            s_cur = support[ii];
            m_cur = moral[ii];

            // check if current support and moral ratings are within target range
            if (s_target.includes(s_cur) && m_target.includes(m_cur) ) {
                iss.push(issues[ii])
            }
        } 
    return iss;
}

var sort_order = []; 
var rating_pairs = []; // list of all possible pairs of issue ratings
// var unique_ratings = [];
var unique_pairs = [];
// var issue_array = [];
var pair_labels = [];

/* remove duplicate entries from array */
function removeDup(arr) {
    console.log('array to have duplicates removed.');
    console.log(arr);
    var out = arr.filter(function(elem, pos){
        return arr.indexOf(elem) == pos;
    })
    // var out = Array.from(new Set(arr));
    console.log('new array is:');
    console.log(out);
    return out;
}

/* generate all support-moral mappings */
function find_unique(support, moral) {
    var ind_resps = [];
    var unique_ratings = [];
    console.log(support)
    console.log(moral)
    for (var i = 0; i < support.length; i++) {
        ind_resps.push(support[i] + "_" + moral[i]);
    }
    console.log(ind_resps);
    unique_ratings = removeDup(ind_resps);
    console.log('After removing duplicates, unique_ratings is:');
    console.log(unique_ratings);
    return unique_ratings;
}

/* creature array structure to hold lists of unique responses */
function prep_issue_array(unique_ratings, issues, support, moral) {
    var issue_array = [];
    issue_array.length = 7;
    var found;
    for (var i=0; i < 10; i++) {
        issue_array[i] = [];
        issue_array[i].length = 10;
    }
    // store all issues with same support-moral mappings in same array
    for (var i = 0; i < unique_ratings.length; i++) {
        s = unique_ratings[i][0];
        m = unique_ratings[i][2];
        // console.log('Checking issues with [support, moral]')
        // console.log([s, m])
        // console.log('issues found:')
        found = get_issues(issues, support, moral, s, m);
        // console.log(found)
        fs = shuffle(found);
        // console.log(fs);
        issue_array[s][m] = fs;
        // console.log('new issues:')
        // console.log(issue_array[s][m])
    }

    console.log('issue_array is now:');
    console.log(issue_array);
    return issue_array;
}

/* create map of all unique pairs of issues */
function map_unique(unique_ratings) {
    var unique_pairs = [];
    // take values from unique_ratings and create all 2-way mappings
    for (var i = 0; i < unique_ratings.length; i++) {
        for (var j=i+1; j < unique_ratings.length; j++) {
            unique_pairs.push(unique_ratings[i] + "_" + unique_ratings[j]);
        }
    }
    return unique_pairs;
}

/* return a shuffled copy of an array */
function shuffle(arr) {
    var j, x, i;
    var a = arr.slice();
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
}

/* populate list of issue pairs 
    pair_labels : text labels for pair of issues
    issue_pairs : full pairs (issue1, support1, moral1, issue2, support2, moral2)
*/
function populate_pairs(unique_pairs, issue_array) {
    console.log("Populating pairs")
    trial_list = [];
    trial_list_unshuf = [];
    console.log("unique_pairs")
    console.log(unique_pairs)
    console.log("issue_array")
    console.log(issue_array)
    
    // use issue_array : n_array with arrays of issues
    
    // loop through unique pairs and grab issues until 
    // there are no more issues or there are STIM_N issues
    
    i = 0;
    j = 0;
    while (i < STIM_N) {
        if (j == unique_pairs.length ) {
            j = 0;
        }
        // find the match needed
        pair_to_find = unique_pairs[j]

        console.log("pair_to_find:")
        console.log(pair_to_find)
        s1 = pair_to_find[0];
        m1 = pair_to_find[2];
        s2 = pair_to_find[4];
        m2 = pair_to_find[6];

        iss1 = issue_array[s1][m1]
        iss2 = issue_array[s2][m2]
        
        if (iss1.length > 1) {
            iss1 = shuffle(iss1);
        }
        if (iss2.length > 1) {
            iss2 = shuffle(iss2);
        }
        iss1 = iss1[0];
        iss2 = iss2[0];
        issue_pair = shuffle([iss1, iss2])
        console.log('s1  m1')
        console.log([s1, m1])
        console.log('s2  m2')
        console.log([s2, m2])
        console.log('iss1   iss2')
        console.log([iss1, iss2])
        trial_list_unshuf.push(issue_pair);

        i = i+1;
        j = j+1;
    }
    trial_list = shuffle(trial_list_unshuf);
    console.log("trial_list inside population_pairs()")
    console.log(trial_list)
    return trial_list;
}

/* find a match for a given issue that is not that issue */
function pair_issues(idx, issues, support, moral) {
    const iss_1 = issues[idx];
    const sup_1 = support[idx];
    const mor_1 = moral[idx];

    // exclude all values for initial issue
    
    var iss_use = issues.slice(0,idx).concat(issues.slice(idx+1))
    var sup_use = support.slice(0,idx).concat(support.slice(idx+1))
    var mor_use = moral.slice(0,idx).concat(moral.slice(idx+1))

    var match = get_issue(iss_use, sup_use, mor_use, [6, 5], [7, 6, 5])
    if (match[0] == 0) {
        // could not find issue, return nothing
        return []
    } else {
        pair_labels.push(iss_1 + iss_use[match[1]] );
        issue_pairs.push([iss_1, sup_1, mor_1, iss_use[match[1]], 
                            sup_use[match[1]], mor_use[match[1]] ]);
    }
}

/* 
iterate over unique_pairs, pulling stimuli, until either 
    - have created N_STIM stimulus pairs OR
    - no more available issues 
*/
function build_stim_list() {
    i = 0;
    j = 0;
    while (i < STIM_N) {
        if (j == unique_pairs.length ) {
            j = 0;
        }
        // find the match needed
        pair_to_find = unique_pairs[i]
        s

        i = i+1;
    }

}

/* score the responses and generate a list of issue pairs */
var process_resps = {
    type: 'html-keyboard-response',
    stimulus: '<p>Preparing next task...</p>',
    trial_duration: 2000,
    on_start: function() {
        var ratings = jsPsych.data.get().filter({task: 'rating', dnk: false})
        var familiar = ratings.select('familiar').values
        var support = ratings.select('support').values
        var moral = ratings.select('moral').values
        var trial_idx = ratings.select('trial_index').values
        var issues = ratings.select('Issue').values
        /*
        console.log("Trial index:")
        console.log(trial_idx)
        console.log("Familiarity ratings:")
        console.log(familiar)
        console.log("Moral ratings:")
        console.log(moral)
        console.log("Support ratings:")
        console.log(support)
        */ 

        // Sort by support rating

        var a7 = []
        var a6 = []
        var a5 = []
        var a4 = []
        var a3 = []
        var a2 = []
        var a1 = []
        var i = 0
        while (i < support.length) {
            switch (support[i]) {
                case 0:
                    a1.push(i);
                    break;
                case 1:
                    a2.push(i);
                    break;
                case 2: 
                    a3.push(i);
                    break;
                case 3:
                    a4.push(i);
                    break;
                case 4:
                    a5.push(i);
                    break;
                case 5: 
                    a6.push(i);
                    break;
                case 6:
                    a7.push(i);   
            }
            i++;
        }
        sort_order = sort_order.concat(a7, a6, a5, a4, a3, a2, a1)
        console.log('Sort order:')
        console.log(sort_order);

        // Create arrays of scene id, familiarity, support, and moral
        // sorted by support ratings in descending order

        var support_sorted = []
        var familiar_sorted = []
        var moral_sorted = []
        var issues_sorted = []
        var trial_idx_sorted = []
        var idx = 0
        for (ii = 0; ii < sort_order.length; ii++) {
            idx = sort_order[ii];
            support_sorted.push(support[idx]);
            familiar_sorted.push(familiar[idx]);
            moral_sorted.push(moral[idx]);
            trial_idx_sorted.push(trial_idx[idx]); // 1-indexed
            issues_sorted.push(issues[idx]);
        }
        
        console.log('trial_idx_sorted:')
        console.log(trial_idx_sorted)
        console.log('support_sorted:')
        console.log(support_sorted)
        console.log('moral_sorted:')
        console.log(moral_sorted)
        console.log('issues_sorted:')
        console.log(issues_sorted)
        

        console.log('Mapping pairs')
        // generate list of unique support-moral responses
        unique_ratings = find_unique(support_sorted, moral_sorted)

        console.log('Preparing issue array')
        console.log('unique_ratings:')
        console.log(unique_ratings)
        // prepare the list of issues to use
        issue_array = prep_issue_array(unique_ratings, issues_sorted, support_sorted, moral_sorted);

        console.log('Maping unique issues')
        // generate list of unique pairs of support and moral ratings
        unique_pairs = map_unique(unique_ratings)
        // ASSERT: unique_pairs now contains the list of all n choose 2
        // pairs of support-moral ratings, sorting in descending order of
        // support for first issue, then descending by second
        console.log('unique_pairs:')
        console.log(unique_pairs)
        trial_list = populate_pairs(unique_pairs, issue_array)
        

        console.log("trial_list returned:")
        console.log(trial_list)

        //build_stim_list()

        console.log('Pair labels:')
        console.log(trial_list)

        // update stim_list
        for (i=0; i < Math.min(STIM_N, trial_list.length); i++) {
            stim_list[i].iss_l = trial_list[i][0]
            stim_list[i].iss_r = trial_list[i][1]
        }
    }
}
timeline.push(process_resps)


/* create choice instructions */
var choice_inst = {
    type: 'html-keyboard-response',
    stimulus: `<p>For the following task, you will be shown photographs of protestors and asked to 
        indicate which group of protestors you support more. Above each photograph you will see what 
        the protest was about and whether protestors supported or opposed the issue.</p>`,
    choices: jsPsych.ALL_KEYS,
    prompt: '<p>Press any key to continue.</p>'
}
timeline.push(choice_inst);

var choice_inst2 = {
    type: 'html-keyboard-response',
    stimulus: `<p>You will use the 'f' and 'j' key to indicate your response.\n
        Press 'f' if you support the group on the left more.\n
        Press 'j' if you support hte group on the right more.</p>`,
    choices: jsPsych.ALL_KEYS,
    prompt: '<p>Press any key to continue.</p>'
}
timeline.push(choice_inst2);

/* create the trials */
var first_fixation = {
    type: 'html-keyboard-response',
    stimulus: '<p style="font-size:x-large;">+</p>',
    choices: jsPsych.NO_KEYS,
    trial_duration: 30,
    on_start: set_html_dark
};
timeline.push(first_fixation)

var fixation = {
    type: 'html-keyboard-response',
    stimulus: '<p style="font-size:x-large;">+</p>',
    choices: jsPsych.NO_KEYS,
    trial_duration: function() {
        return randExp()
    },
    data: {
        task: 'fixation'
    }

};

// add all of the relevant variables to the data field so they
// will appear in the results
var trial = {
    type: 'html-keyboard-response',
    // prompt: "<p>'f' <-        -> 'j'</p>",
    stimulus: function () {
        // note: the outer parentheses are only here so we can break the line
        return (           
            '<span id="grid"><div>Which protestors do you support more?</div>'
            + '<div class="issue"><img src="https://social-cognitive-neuroscience-lab.github.io/SocialValuesTask/img/'+jsPsych.timelineVariable("pos_l", true)+'>'
            + '<p>'+jsPsych.timelineVariable("iss_l",true)+'</p></div>'
            + '<div class="issue"><img src="https://social-cognitive-neuroscience-lab.github.io/SocialValuesTask/img/'+jsPsych.timelineVariable("pos_r", true)+'>'
            + '<p>'+jsPsych.timelineVariable("iss_r",true)+'</p></div>'
            + '<div class="protest"><img src="https://social-cognitive-neuroscience-lab.github.io/SocialValuesTask/img/'+jsPsych.timelineVariable("photo_l", true)+' /></div>'
            + '<div class="protest"><img src="https://social-cognitive-neuroscience-lab.github.io/SocialValuesTask/img/'+jsPsych.timelineVariable("photo_r", true)+' /></div>'
            + '</span>'
            );
    },
    choices: ['f', 'j', 'ArrowLeft', 'ArrowRight'],
    data: {
        fixation_duration: FIXATION_DURATION, //jsPsych.timelineVariable('fixation_duration'),
        stimulus_duration: STIMULUS_DURATION, //jsPsych.timelineVariable('stimulus_duration'),
        pos_l: jsPsych.timelineVariable('pos_l'),
        pos_r: jsPsych.timelineVariable('pos_r'),
        photo_l: jsPsych.timelineVariable('photo_l'),
        photo_r: jsPsych.timelineVariable('photo_r'),
        iss_l: jsPsych.timelineVariable('iss_l'),
        iss_r: jsPsych.timelineVariable('iss_r'),
        task: 'choice'
    }
};

var trials_with_variables = {
    timeline: [fixation, trial],
    timeline_variables: stim_list.slice(0,STIM_N)
};

timeline.push(trials_with_variables);