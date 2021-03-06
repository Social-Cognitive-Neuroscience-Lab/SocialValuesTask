/*
    task_main_con

    Participants are first asked to indicate their:
    - familiarity (1-7) 
    - support (1-7) and
    - moral conviction (two items, 1-5 each, for 2-10) 
    about 40 political issues

    They are then shown 100 pairs of photographs, ostensibly taken at protests
    about those same issues. Participants are asked to indicate which protestors
    they support more. Each pair differs in moral conviction, support, or both.

    This version of the task only uses congruent protestor positions.
    i.e. whatever position the first protestors take is the position of the second

    This version is more appropriate for modeling with drift diffusion models.
*/


/* experiment parameters */
var FIXATION_DURATION = 3; // in seconds
var FIXATION_MIN = 1;
var FIXATION_MAX = 4;
var STIMULUS_DURATION = 3000;
var ISSUE_N = 40; // number of issues to show
var STIM_N = 100; // number of trials in choice task

var timeline = [];

var rating_list = []; // array of arrays [issue, support, moral]
var resp_issue = []; // hold array of issues with responses in part 1
var resp_support = []; // hold array of support ratings
var resp_mor1 = []; // hold array of first moral ratings
var resp_mor2 = []; // hold array of second moral ratings
var resp_fam = []; // hold array of familiarity ratings

/* cosmetics */
function set_html_light() {
    document.getElementById("display_stage").color="#000";
    document.getElementById("display_stage").backgroundColor="#fff";
    //document.body.style.backgroundColor = "#fff";
    //document.body.style.color = "#000";
}

function set_html_dark() {
    document.getElementById("display_stage").color="#fff";
    document.getElementById("display_stage").backgroundColor="#000";
    //document.body.style.backgroundColor = "#000";
    //document.body.style.color = "#fff";
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

/* Functions */

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
    if (iss.length == 0 ) {
        console.log('Tried to get issue but found no matches for:')
        console.log([s_target, m_target])
        console.log('In support and moral arrays:')
        console.log(support)
        console.log(moral)
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

/* invert the support rating about the midpoint (4) */
function flip(support) {
    var flipped;
    flipped = (support - 3) * -1 + 3;
    return flipped
}

/* generate all support-moral mappings */
function find_unique(support, moral) {
    // var ind_resps = [];
    var unique_ratings = [];
    //console.log(support)
    //console.log(moral)
    for (var i = 0; i < support.length; i++) {
        var label = support[i] + '_' + moral[i];
        if (!unique_ratings.includes(label)) {
            unique_ratings.push(label)
        }
        //ind_resps.push(support[i] + "_" + moral[i]);
        //ind_resps.push(flip(support[i]) + "_" + moral[i])
    }
    /*
    console.log(ind_resps);
    unique_ratings = removeDup(ind_resps);
    console.log('After removing duplicates, unique_ratings is:');
    */
    console.log('unique ratings are:')
    console.log(unique_ratings);
    return unique_ratings;
}

/* creature array structure to hold lists of unique responses */
function prep_issue_array(unique_ratings, issues, support, moral) {
    var issue_array = [];
    issue_array.length = 7;
    var found;
    for (var i=0; i < issue_array.length; i++) {
        issue_array[i] = [];
        issue_array[i].length = 10;
    }
    // store all issues with same support-moral mappings in same array
    for (var i = 0; i < unique_ratings.length; i++) {
        s = unique_ratings[i][0];
        m = unique_ratings[i][2];
        // console.log('Checking issues with [support, moral]')
        //console.log([s, m])
        // console.log('issues found:')
        found = get_issues(issues, support, moral, s, m);
        // console.log(found)
        fs = shuffle(found);
        if (fs.length == 0) {
            console.log('Failed to find any issues for the following unique_rating:')
            console.log([s, m])
        } else {
            issue_array[s][m] = fs;
        }
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
    //console.log("unique_pairs")
    //console.log(unique_pairs)
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
        console.log('Searching for ' + pair_to_find)

        s1 = pair_to_find[0];
        m1 = pair_to_find[2];
        s2 = pair_to_find[4];
        m2 = pair_to_find[6];

        iss1 = issue_array[s1][m1] // array of issues with support=s1 and moral=m1
        iss2 = issue_array[s2][m2] // array of issues with support=s2 and moral=m2
        
        // If more than one issue of the exact Support_Moral rating, randomize the order
        if (iss1.length > 1) {
            iss1 = shuffle(iss1);
        }
        if (iss2.length > 1) {
            iss2 = shuffle(iss2);
        }
        console.log(iss1)
        console.log(iss2)
        // Use the first issue in the list to prepare the stimuli
        iss1_vals = [iss1[0].slice(0,1), iss1[0].slice(1), 'PhotoTmp']; // [+/-, IssueID, Photo]
        iss2_vals = [iss2[0].slice(0,1), iss2[0].slice(1), 'PhotoTmp']; // [+/-, IssueID, Photo]

        // First add positive issue
        issue1 = issue_list.find(x => x.IssueID == iss1_vals[1]);
        issue2 = issue_list.find(x => x.IssueID == iss2_vals[1]);
        iss1_vals[0] = "ThumbsUp.jpg";
        iss1_vals[2] = issue1.For
        iss2_vals[0] = "ThumbsUp.jpg";
        iss2_vals[2] = issue2.For;
        iss1_vals[1] = issue1.Issue;
        iss2_vals[1] = issue2.Issue;
        // Randomize side of issues
        issue_pair = shuffle([iss1_vals, iss2_vals])
        trial_list_unshuf.push(issue_pair[0].concat(issue_pair[1]));

        i = i+1;
        j = j+1;

        // Make sure we didn't run out of stimuli to create
        if (i == STIM_N) {
            break;
        }
        if (j == unique_pairs.length ) {
            j = 0;
        }
        
        // Now add negative issue
        iss1_vals = [iss1[0].slice(0,1), iss1[0].slice(1), 'PhotoTmp']; // [+/-, IssueID, Photo]
        iss2_vals = [iss2[0].slice(0,1), iss2[0].slice(1), 'PhotoTmp']; // [+/-, IssueID, Photo]
        issue1 = issue_list.find(x => x.IssueID == iss1_vals[1]);
        issue2 = issue_list.find(x => x.IssueID == iss2_vals[1]);
        iss1_vals[0] = "ThumbsDown.jpg";
        iss1_vals[2] = issue1.Against
        iss2_vals[0] = "ThumbsDown.jpg";
        iss2_vals[2] = issue2.Against;
        iss1_vals[1] = issue1.Issue;
        iss2_vals[1] = issue2.Issue;
        // Randomize side of issues
        issue_pair = shuffle([iss1_vals, iss2_vals])
        trial_list_unshuf.push(issue_pair[0].concat(issue_pair[1]));

        i = i+1;
        j = j+1;
    }
    // Randomize trial order
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

/* 
given the list of issues, randomize the order and select the first N issues
*/
function prepare_issues(issue_list, n=ISSUE_N) {
    iss_shuf = shuffle(issue_list);
    issues_used = iss_shuf.slice(0, n);
    return issues_used;
    // issue_list.slice(0, ISSUE_N)
}

/*
 * 
 *  Create Timeline 
 * 
 * 
*/

/* create survey instructions */
var survey_inst = {
    type: 'html-keyboard-response', // on_start: set_html_light,
    stimulus: `<p>For this section, you will read about some social issues<br> 
        and then answer some questions about your views on those issues.<br><br>
        Use your cursor to click on your answer.<br><br></p>`,
    choices: jsPsych.ALL_KEYS,
    prompt: '<p>Press any key to continue</p>'
}
timeline.push(survey_inst);

var survey_inst2 = {
    type: 'html-keyboard-response', // on_start: set_html_light,
    stimulus: `<p>The first question asks about how familiar you are with the issue.<br>
        If you haven't heard of the issue before, or don't know what it's about, <br>please choose "Not at all familiar"<br><br></p>`,
    choices: jsPsych.ALL_KEYS,
    prompt: '<p>Press any key to continue</p>'
}
timeline.push(survey_inst2);

var survey_inst3 = {
    type: 'html-keyboard-response', // on_start: set_html_light,
    stimulus: `<p>The second question asks how much you support or oppose the issue.<br><br></p>`,
    choices: jsPsych.ALL_KEYS,
    prompt: '<p>Press any key to continue</p>'
}
timeline.push(survey_inst3);

var survey_inst4 = {
    type: 'html-keyboard-response', // on_start: set_html_light,
    stimulus: `<p>The last two questions ask you to think about why you support or oppose the issue.<br> 
        Is your position based on your moral beliefs and view of right and wrong,<br> 
        or something else, like feasibility or effectiveness?<br><br></p>`,
    choices: jsPsych.ALL_KEYS,
    prompt: '<p>Press any key to continue</p>'
}
timeline.push(survey_inst4);

var survey_inst5 = {
    type: 'html-keyboard-response', // on_start: set_html_light,
    stimulus: `<p>There are a total of 40 issues.<br> 
        You can take as much time as you need for this part of the study.<br><br></p>`,
    choices: jsPsych.ALL_KEYS,
    prompt: '<p>When you are ready to begin, press any key to continue</p>'
}
timeline.push(survey_inst5);

/* create survey questions */
var familiar_options = [
    'Not at all familiar',
    'Slightly familiar',
    'Somewhat familiar',
    'Moderately familiar',
    'Very familiar'
];

var support_options = [
    'Strongly oppose',
    'Oppose',
    'Somewhat oppose',
    "Neutral / Don't know",
    'Somewhat support',
    'Support',
    'Strongly support'
];

var moral_options = [
    "Not at all / Don't know",
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
            return ('How familiar are you with arguments for or against '+jsPsych.timelineVariable("IssueText", true) +'?');
            }, 
            name: 'Familiar', labels: familiar_options, required: true},
        {prompt: function () {
            return ('How much do you support or oppose '+jsPsych.timelineVariable("IssueText", true) +'?');
            }, 
            name: 'Support', labels: support_options, required: true},
        {prompt: function() {
            return ('To what extent is your position on '+jsPsych.timelineVariable("IssueText", true)
            +' a reflection of your core moral beliefs and convictions?')
        },
            name: 'Moral1', labels: moral_options, required:true, horizontal: true},
        {prompt: function() {
            return ('To what extent is your position on '+jsPsych.timelineVariable("IssueText", true) +
            ' based on fundamental questions of right and wrong?')
        }, 
            name: 'Moral2', labels: moral_options, required:true}
    ],
    data: {
        task: 'rating',
        IssueID: jsPsych.timelineVariable('IssueID'),
        Issue: jsPsych.timelineVariable('Issue'),
        Short: jsPsych.timelineVariable('Short'),
        For: jsPsych.timelineVariable('For'),
        Against: jsPsych.timelineVariable('Against')
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
    timeline_variables: prepare_issues(issue_list) // issue_list.slice(0, ISSUE_N)
};

timeline.push(issues_with_variables)


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
        var issues_orig = ratings.select('Issue').values
        var issue_ids_orig = ratings.select('IssueID').values
        /*
        console.log("Trial index:")
        console.log(trial_idx)
        console.log("Familiarity ratings:")
        console.log(familiar)
        */
        console.log("Moral ratings:")
        console.log(moral)
        console.log("Support ratings:")
        console.log(support)

        
        // Add protest coding - all initial events are positive
        // + at first char means support
        // - at first char means oppose
        
        //var support_pos = support; // all original support ratings are positive
        var issues = [];
        // var support_neg = [];
        // var issue_neg = [];

        // Add protest code and flipped support values
        for (var idx=0; idx < support.length; idx++) {
            issues.push( '+' + issue_ids_orig[idx])
            //support_neg.push(flip(support[idx]))
        }
        
        //var issues = issue_pos.concat(issue_neg);
        //var support = support_pos.concat(support_neg);

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
        

        console.log('Identifying unique issues')
        // generate list of unique support-moral responses
        unique_ratings = find_unique(support_sorted, moral_sorted)

        console.log('Preparing issue array')
        console.log('unique_ratings:')
        console.log(unique_ratings)
        // prepare the list of issues to use
        issue_array = prep_issue_array(unique_ratings, issues_sorted, support_sorted, moral_sorted);

        console.log('Mapping unique issues')
        // generate list of unique pairs of support and moral ratings
        unique_pairs = map_unique(unique_ratings)
        // ASSERT: unique_pairs now contains the list of all n choose 2
        // pairs of support-moral ratings, sorting in descending order of
        // support for first issue, then descending by second
        console.log('unique_pairs:')
        console.log(unique_pairs)
        trial_list = populate_pairs(unique_pairs, issue_array)
        

        //console.log("trial_list returned:")
        //console.log(trial_list)

        //build_stim_list()

        console.log('Prepairing stim_list. Currently:')
        console.log(stim_list)

        // update stim_list
        for (i=0; i < Math.min(STIM_N, trial_list.length); i++) {
            //console.log('Setting trial:')
            //console.log(i)
            stim_list[i].pos_l = trial_list[i][0];
            stim_list[i].iss_l = trial_list[i][1];
            stim_list[i].photo_l = trial_list[i][2];
            stim_list[i].pos_r = trial_list[i][3];
            stim_list[i].iss_r = trial_list[i][4];
            stim_list[i].photo_r = trial_list[i][5];
        }
    },
    on_finish: function() {
        document.getElementById("display_stage").style.color = "black";
        document.getElementById("display_stage").style.backgroundColor = "white";
        //document.getElementById("SurveyEngineBody").style.color = "black";
        //document.getElementById("SurveyEngineBody").style.backgroundColor = "white";
    }
}
timeline.push(process_resps)

var images_left = issue_list.map(x => "https://social-cognitive-neuroscience-lab.github.io/SocialValuesTask/img/" + x.For)
var images_right = issue_list.map(x => "https://social-cognitive-neuroscience-lab.github.io/SocialValuesTask/img/" + x.Against)
var images = images_left.concat(images_right);

var preload = {
    type: 'preload',
    auto_preload: true,
    images: images
}

timeline.push(preload);

/* create choice instructions */
var choice_inst = {
    type: 'html-keyboard-response',
    stimulus: `<p>For the last part of the study, you will see photographs of two groups of protestors.<br>
                  Your job is to decide which group of protestors you support more.<br><br>
                  Above each photograph you will see what each protest was about.<br><br></p>`,
    choices: jsPsych.ALL_KEYS,
    prompt: '<p>Press any key to continue.</p>',
    on_start: function() {
        document.getElementById("display_stage").style.color = "white";
        document.getElementById("display_stage").style.backgroundColor = "black";
        //document.getElementById("SurveyEngineBody").style.color = "white";
        //document.getElementById("SurveyEngineBody").style.backgroundColor = "black";
    }
}
timeline.push(choice_inst);

var choice_inst2 = {
    type: 'html-keyboard-response',
    stimulus: `<p>You will also see whether the protestors were FOR or AGAINST the issue.<br>
                  If they supported the issue, you will see a thumbs up:<img src="https://social-cognitive-neuroscience-lab.github.io/SocialValuesTask/img/ThumbsUp.jpg"/><br><br>
                  If they were against the issue, you will see a thumbs down:<img src="https://social-cognitive-neuroscience-lab.github.io/SocialValuesTask/img/ThumbsDown.jpg" />.<br><br></p>`,
    choices: jsPsych.ALL_KEYS,
    prompt: '<p>Press any key to continue.</p>'
}
timeline.push(choice_inst2);

var choice_inst3 = {
    type: 'html-keyboard-response',
    stimulus: `<p>You will use the 'f' and 'j' keys to indicate your response.<br>
        Press 'f' if you support the group on the left more.<br><br>
        Press 'j' if you support the group on the right more.<br><br></p>`,
    choices: jsPsych.ALL_KEYS,
    prompt: '<p>Press any key to continue.</p>'
}
timeline.push(choice_inst3);

var choice_inst4 = {
    type: 'html-keyboard-response',
    stimulus: `<p>Between each pair of protests, you'll see crosshairs like this: <br><br><br>
    +<br><br><br>
    </p>`,
    choices: jsPsych.ALL_KEYS,
    prompt: '<p>Press any key to continue.</p>'
}
timeline.push(choice_inst4);

var choice_inst5 = {
    type: 'html-keyboard-response',
    stimulus: `<p>Press the 'f' or 'j' key as soon as you make your decision.<br>You must respond within 6 seconds<br><br></p>`,
    choices: jsPsych.ALL_KEYS,
    prompt: '<p>When you are ready, press any key to begin.</p>'
}
timeline.push(choice_inst5);

/* create the trials */
var first_fixation = {
    type: 'html-keyboard-response',
    stimulus: '<p style="font-size:x-large;">+</p>',
    choices: jsPsych.NO_KEYS,
    trial_duration: 30
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
            + '<div class="issue"><img src="https://social-cognitive-neuroscience-lab.github.io/SocialValuesTask/img/'+jsPsych.timelineVariable("pos_l", true)+'">'
            + '<p>'+jsPsych.timelineVariable("iss_l",true)+'</p></div>'
            + '<div class="issue"><img src="https://social-cognitive-neuroscience-lab.github.io/SocialValuesTask/img/'+jsPsych.timelineVariable("pos_r", true)+'">'
            + '<p>'+jsPsych.timelineVariable("iss_r",true)+'</p></div>'
            + '<div class="protest"><img src="https://social-cognitive-neuroscience-lab.github.io/SocialValuesTask/img/'+jsPsych.timelineVariable("photo_l", true)+'"></div>'
            + '<div class="protest"><img src="https://social-cognitive-neuroscience-lab.github.io/SocialValuesTask/img/'+jsPsych.timelineVariable("photo_r", true)+'"></div>'
            + '</span>'
            );
    },
    choices: ['f', 'j', 'ArrowLeft', 'ArrowRight'],
    trial_duration: 6000,
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

var faster_trial = {
    type: 'html-keyboard-response',
    stimulus: "<p>Please remember to respond within 6 seconds.<br><br>Press 'f' or 'j' to continue.</p>",
    choices: ['f', 'j']
}

var faster_check = {
    timeline: [faster_trial],
    conditional_function: function() {
        var resp = jsPsych.data.get().last(1).values()[0];
        if (resp.response == null) {
            return true;
        } else {
            return false;
        }
    }
}

var halfway_break = {
    type: 'html-keyboard-response',
    stimulus: `<p>You are halfway done. <br><br>Keep up the good work!<br><br></p>`,
    choices: jsPsych.ALL_KEYS,
    prompt: '<p>When you are ready to continue, press any key.</p>'
}

var trials_with_variables1 = {
    timeline: [fixation, trial, faster_check],
    timeline_variables: stim_list.slice(0,STIM_N/2)
};

var trials_with_variables2 = {
    timeline: [fixation, trial],
    timeline_variables: stim_list.slice(STIM_N/2, STIM_N)
};

/* Catch trial */

var catch_options = [
    'ball',
    'book',
    'bone',
    'banana',
    'bubble'
];

var attention_options = [
    'Prefer not to answer',
    '1 - answered without reading',
    '2',
    '3',
    '4',
    '5 - complete focus'
];

var catch_trial = {
    type: 'survey-likert',
    questions: [
        {
            prompt: 'For this question, please select the answer with a fruit.',
            labels: catch_options,
            name: 'catch',
            required: true
        }
    ],
    data: {
        task: 'catch',
    }, 
    on_start: function() {
        document.getElementById("display_stage").style.color = "black";
        document.getElementById("display_stage").style.backgroundColor = "white";
    },
    on_finish: function(data){
        data.catch = data.response['catch'];
        document.getElementById("display_stage").style.color = "white";
        document.getElementById("display_stage").style.backgroundColor = "black";
    }
}


var attention_trial = {
    type: 'survey-likert',
    questions: [
        {
            prompt: 'Thank you for your participation. How much did you pay attention during this study?',
            labels: attention_options,
            name: 'attention',
            required: true
        }
    ],
    data: {
        task: 'attention',
    },
    on_start: function() {
        document.getElementById("display_stage").style.color = "black";
        document.getElementById("display_stage").style.backgroundColor = "white";
    },
    on_finish: function(data){
        data.attention = data.response['attention'];
    }
}

timeline.push(trials_with_variables1);
timeline.push(halfway_break);
timeline.push(catch_trial);
timeline.push(trials_with_variables2);
timeline.push(attention_trial);

