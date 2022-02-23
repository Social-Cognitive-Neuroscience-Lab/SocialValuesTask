/*
    task_main_survey

    Participants are asked to indicate their:
    - familiarity (1-7) 
    - support (1-7) and
    - moral conviction (two items, 1-5 each, for 2-10) 
    about 40 political issues

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
    var ind_resps = [];
    var unique_ratings = [];
    //console.log(support)
    //console.log(moral)
    for (var i = 0; i < support.length; i++) {
        ind_resps.push(support[i] + "_" + moral[i]);
        ind_resps.push(flip(support[i]) + "_" + moral[i])
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

        //console.log("pair_to_find:")
        //console.log(pair_to_find)
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
        // Use the first issue in the list to prepare the stimuli
        iss1_vals = [iss1[0].slice(0,1), iss1[0].slice(1), 'PhotoTmp']; // [+/-, IssueID, Photo]
        iss2_vals = [iss2[0].slice(0,1), iss2[0].slice(1), 'PhotoTmp']; // [+/-, IssueID, Photo]

        issue1 = issue_list.find(x => x.IssueID == iss1_vals[1]);
        issue2 = issue_list.find(x => x.IssueID == iss2_vals[1]);

        if (iss1_vals[0] == "+") {
            iss1_vals[0] = "ThumbsUp.jpg";
            iss1_vals[2] = issue1.For;
        } else {
            iss1_vals[0] = "ThumbsDown.jpg";
            iss1_vals[2] = issue1.Against;
        }
        if (iss2_vals[0] == "+") {
            iss2_vals[0] = "ThumbsUp.jpg";
            iss2_vals[2] = issue2.For;
        } else {
            iss2_vals[0] = "ThumbsDown.jpg";
            iss2_vals[2] = issue2.Against;
        }
        // update issue ID with issue text
        iss1_vals[1] = issue1.Issue;
        iss2_vals[1] = issue2.Issue;

        issue_pair = shuffle([iss1_vals, iss2_vals])
        //console.log('s1  m1')
        //console.log([s1, m1])
        //console.log('s2  m2')
        //console.log([s2, m2])
        //console.log('iss1   iss2')
        //console.log([iss1_vals, iss2_vals])

        // decode for/against
        

        trial_list_unshuf.push(issue_pair[0].concat(issue_pair[1]));

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
            return ('How familiar are you with arguments for or against '+jsPsych.timelineVariable("Issue", true) +'?');
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

timeline.push(attention_trial);

