/*


    Copyright (c) 2022, David Turner <novalis@novalis.org>

     This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, version 3.

    This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

    You should have received a copy of the GNU General Public License along with this program. If not, see <https://www.gnu.org/licenses/>.
*/
'use strict';

let app;
let firestore;
let fireauth;
let db;

let teamTwitterRef;
let teamRef;
let teamCode = "";
let teamTwitter = false;
let syncRef;
let twitterUser;

const gameType = "";


const now = Date.now();
const today = Math.floor(now / 86400000);
const initialDay = 19021;
function getPuzzleNumber(day) {
    return (day - initialDay) % secretWords.length;
}
function getSecretWord(day) {
    return secretWords[getPuzzleNumber(day)];
}


let gameOver = false;
let firstGuess = true;
let guesses = [];
let latestGuess = undefined;
let guessed = new Set();
let guessCount = 0;
let model = null;
const puzzleNumber = getPuzzleNumber(today);
let handleStats = puzzleNumber >= 24;
const yesterdayPuzzleNumber = getPuzzleNumber(today - 1);
let puzzleKey;
let storage;
let caps = 0;
let warnedCaps = 0;
let chrono_forward = 1; 
let hints_used = 0;
var hints_words = JSON.parse(localStorage.getItem("hints_words") || "[]");
let darkModeMql = window.matchMedia('(prefers-color-scheme: dark)');
let darkMode = false;

function $(q) { 
    return document.querySelector(q);
}

function mag(a) {
    return Math.sqrt(a.reduce(function(sum, val) {
        return sum + val * val;
    }, 0));
}

function dot(f1, f2) {
    return f1.reduce(function(sum, a, idx) {
        return sum + a*f2[idx];
    }, 0);
}

function getCosSim(f1, f2) {
    return dot(f1,f2)/(mag(f1)*mag(f2));
}


function plus(v1, v2) {
    const out = [];
    for (let i = 0; i < v1.length; i++) {
            out.push(v1[i] + v2[i]);
    }
    return out;
}

function minus(v1, v2) {
    const out = [];
    for (let i = 0; i < v1.length; i++) {
        out.push(v1[i] - v2[i]);
    }
    return out;
}


function scale (v, s) {
    const out = [];
    for (let i = 0; i < v.length; i++) {
        out.push(v[i] * s);
    }
    return out;
}


function project_along(v1, v2, t) {
    const v = minus(v2, v1);
    const num = dot(minus(t, v1), v);
    const denom = dot(v,v);
    return num/denom;
}

function share(copy=false) {
    // We use the stored guesses here, because those are not updated again
    // once you win -- we don't want to include post-win guesses here.
    const text = solveStory(JSON.parse(storage.getItem("guesses")),
                            puzzleNumber,
                            parseInt(storage.getItem("winState")),
                            hints_used);

    if (copy || !mobileCheck()) {
        const copied = ClipboardJS.copy(text);
        if (copied) {
            
            alert("Copied to clipboard");    }
        else {
            alert("Failed to copy to clipboard");
        }

    } else {
        semantleShare.share(text);
    }
}

const words_selected = [];
const cache = {};
let secret = "";
let secretVec = null;
let similarityStory = null;
let customMode = false;

function select(word, secretVec) {
    /*
    let model;
    if (!(word in cache)) {
        // this can happen on a reload, since we do not store
        // the vectors in localstorage
        model = cache[word];
    } else {
        model = getModel(word);
        cache[word] = model;
    }
    words_selected.push([word, model.vec]);
    if (words_selected.length > 2) {
        words_selected.pop();
    }
    const proj = project_along(words_selected[0][1], words_selected[1][1],
                               target);
    console.log(proj);
*/
}
 
function guessRow(similarity, oldGuess, percentile, guessNumber, guess, player,isLocal=false) { /* MJD: Player Names */
    let percentileText = percentile < 1 && similarity > 20 ? "(tepid)" : "(cold)";
    let progress = "";
    let cls = "";
    if (similarity >= similarityStory.rest * 100) {
        percentileText = '<span class="weirdWord">????<span class="tooltiptext">Unusual word found!  This word is not in the list of &quot;normal&quot; words that we use for the top-1000 list, but it is still similar! (Is it maybe capitalized?)</span></span>';
    }
    let guessType = percentile === 1000 ? 'word-found' : 'word-cold';
        guessType = percentile < 1000 ? 'word-close' : guessType;
        guessType = percentile < 500 ? 'word-fire' : guessType;
        guessType = percentile < 250 ? 'word-glass' : guessType;
        guessType = percentile < 1 && similarity >= 20 ? 'word-glass' : guessType; 
        guessType = percentile < 1 && similarity < 20 ? 'word-cold' : guessType; 

    let guessIcon = percentile === 1000 ? '🤩' : '🥶';
    guessIcon = percentile === 999 ? '😭' : guessIcon;
    guessIcon = percentile < 999 ? '🔥' : guessIcon;
    guessIcon = percentile < 975 ? '😎' : guessIcon;
    guessIcon = percentile < 401 ? '🤓' : guessIcon;
    guessIcon = percentile < 1 && similarity >= 20 ? '🤔' : guessIcon;    
    guessIcon = percentile < 1 && similarity < 20 ? '🥶' : guessIcon;
    //guessIcon = "";
    var hw = ''; 
    if (hints_words.indexOf(oldGuess) !== -1) {
        hw = ' 💡';
    }
    guessIcon = '<span class="guess-emoji">'+guessIcon+'</span>';
    if (percentile) {
        if (percentile == 1000) {
            percentileText = `<span class="percentile">FOUND!</span>&nbsp;`;
            progress = ` <span class="found-container progress-container">
            <span class="progress-bar" style="width:100%">&nbsp;</span>
            </span>`;
        } else {
            cls = "close";
            percentileText = `<span class="percentile">${percentile}/1000</span>&nbsp;`;
            progress = ` <span class="progress-container">
<span class="progress-bar" style="width:${percentile/10}%">&nbsp;</span>
</span>`;
        }
    }
    let color;
    if (oldGuess === guess) {
        color = '#c0c';
    } else if (darkMode) {
        color = '#fafafa';
    } else {
        color = '#000';
    }
    const similarityLevel = similarity * 2.55;
    let similarityColor;
    if (darkMode) {
        similarityColor = `255,${255-similarityLevel},${255-similarityLevel}`;
    } else {
        similarityColor = `${similarityLevel},0,0`;
    }
    let pname = typeof player == 'undefined' || player == null ? '' : player;   /* MJD: Player Names */
    
    isLocal = window.playerName == player; /* MJD: Player Names */

    let ph = isLocal || pname == '' ? '' : '<small style="display:block;font-size:11px;color:#999;">('+pname+')</small>'; /* MJD: Player Names */
    let phd = isLocal || pname == '' ? '' : '<small style="display:inline-block;font-size:11px;color:#999;">('+pname+')</small>'; /* MJD: Player Names */

    
    return `<tr class="${guessType}"><td>${guessNumber}</td><td style="color:${color}" onclick="select('${oldGuess}', secretVec);">${oldGuess}${hw}${ph}</td><td style="color: rgb(${similarityColor})">${similarity.toFixed(2)}</td><td class="${cls}"><span class="pcont">${percentileText}${progress}</span>${guessIcon}${phd}</td></tr>`; /* MJD: Player Names */
}

function updateLocalTime() {
    const now = new Date(); 
    now.setUTCHours(24, 0, 0, 0);

    const localtime = `or ${now.getHours()}:${now.getMinutes().toString().padStart(2, "0")} your time`;
    $('#localtime').innerHTML = localtime;
    $('#localtime2').innerHTML = localtime;
}

function plural(count, word) {
    if (count === 1) {
        return word;
    }

    if (word.match(/(sh|ch|th|s)$/)) {
        return word + "es";
    }
    return word + "s";
}


function solveStory(guesses, puzzleNumber, won, hints_used) {
    const guess_count = guesses.length;
    if (guess_count === 0) {
        return `I gave up on Semantle ${puzzleNumber} without even guessing once. https://semantle.com/`;
    }

    let guesses_less_hints = guess_count - hints_used;

    if (guess_count === 1) {
        if (won) {
            return `I got Semantle ${puzzleNumber} on my first guess!  https://semantle.com/`;
        } else {
            return `I gave up on Semantle ${puzzleNumber} after my first guess!  https://semantle.com/`;
        }
    }

    let describe = function(similarity, percentile) {
        let out = `had a similarity of ${similarity.toFixed(2)}`;
        if (percentile) {
            out += ` (${percentile}/1000)`;
        }
        return out;
    };

    const guesses_chrono = guesses.slice();
    guesses_chrono.sort(function(a, b){return a[3]-b[3];});

    let [similarity, old_guess, percentile, guess_number] = guesses_chrono[0];
    let first_guess = `My first guess ${describe(similarity, percentile)}. `;
    let first_guess_in_top = !!percentile;

    let first_hit = '';
    if (!first_guess_in_top) {
        for (let entry of guesses_chrono) {
            [similarity, old_guess, percentile, guess_number] = entry;
            if (percentile) {
                first_hit = `My first word in the top 1000 was at guess #${guess_number}. `;
                break;
            }
        }
    }

    let last_guess_msg;
    if (won) {
        const penultimate_guess = guesses_chrono[guesses_chrono.length - 2];
        [similarity, old_guess, percentile, guess_number] = penultimate_guess;
        last_guess_msg = `My penultimate guess ${describe(similarity, percentile)}.`;
    } else {
        const last_guess = guesses_chrono[guesses_chrono.length - 1];
        [similarity, old_guess, percentile, guess_number] = last_guess;
        last_guess_msg = `My last guess ${describe(similarity, percentile)}.`;
    }

    let hints = "";
    if (hints_used > 0)  {
        hints = ` with ${hints_used} ${plural(hints_used, "hint")}`;
    }

    const solved = won ? "solved" : "gave up on";
    return `I ${solved} Semantle #${puzzleNumber} in ${guesses_less_hints} guesses${hints}. ${first_guess}${first_hit}${last_guess_msg} https://semantle.com/`;
}


function getQueryParameter(name) {
    const url = window.location.href
    const regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)');
    const results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2]);
}

function getMigrateLink() {
    const url = window.location.href;
    const newUrl = url.replace("/semantle.novalis.org/", "/semantle.com/");
    const keys = ['readRules', 'stats', 'lower', 'prefersDarkColorScheme'];
    const storage = window.localStorage;
    const out = {};
    for (let key of keys) {
        const item = storage.getItem(key);
        if (item !== null) {
            out[key] = item;
        }
    }
    storage.setItem("migratedOut", "true");
    let j;
    if (newUrl.indexOf("?") >= 0) {
        j = "&";
    } else {
        j = "?";
    }
    return newUrl + j + "import=" + encodeURIComponent(JSON.stringify(out));
}

function migrate() {
    const keys = ['readRules', 'stats', 'lower', 'prefersDarkColorScheme'];

    const url = window.location.href;
    const force = getQueryParameter("force");
    if (url.startsWith("https://semantle.com/") &&
        (document.referrer.startsWith("https://semantle.novalis.org/") ||
         document.referrer === "") &&
        (storage.getItem("migratedIn") !== "true" || force)) {
        const importData = getQueryParameter("import");
        if (importData) {
            let data = JSON.parse(importData);
            storage = window.localStorage;
            for (let key of keys) {
                if (data[key]) {
                    storage.setItem(key, data[key]);
                }
            }
        }
        storage.setItem("migratedIn", "true");
        Semantle.checkMedia();
    } else if (url.startsWith("https://semantle.novalis.org/")) {
        const newUrl = url.replace("/semantle.novalis.org/", "/semantle.com/");
        if (storage.getItem("migratedOut")) {
            window.location.replace(newUrl);
        } else {
            window.location.href = getMigrateLink();
        }
    }
}

let Semantle = (function() {    
    async function getSimilarityStory(secret) {
        const url = "/similarity/" + secret;                    
        const response = await fetch(url);
        try {
            const data = await response.json();
            return data;
        } catch (e) {
            return null;
        }
    }

    async function getModel(word) {
        if (cache.hasOwnProperty(word)) {
            return cache[word];
        }
        const url = "/model2/" + secret + "/" + word.replace(/\ /gi, "_");
        const response = await fetch(url);
        try {
            const result = await response.json();
            if (result) {
                cache[guess] = result;
            }
            return result;
        } catch (e) {
            return null;
        }
    }

    async function getNearby(word) {
        const url = "/nearby/" + word ;
        const response = await fetch(url);
        try {
            return await response.json();
        } catch (e) {
            return null;
        }
    }

    async function updateHintUI() {
        let ht = localStorage.getItem("hints_words") || "[]";
            ht = JSON.parse(ht);        
        document.body.classList.remove('reward-hint');
        if (ht.length > 1 && (ht.length+1)%3 === 0) {  
            document.body.classList.add('reward-hint');
        } 
    }

    async function hint(guesses) { 
        let ht = localStorage.getItem("hints_words") || "[]";
            ht = JSON.parse(ht);
        console.log(ht.length,window.RewardAdsReady);
        if (window.RewardAdsReady && ht.length > 1 && (ht.length+1)%3 === 0) {    
            console.log('Check Ad');    
            RewardAds.show().then(function(e) {                
                console.log('Reward Granted');
                doHint(guesses).then(function() {
                    updateHintUI();
                    vanillaToast.success("You have received a rewarded hint", {duration:1400, fadeDuration:120});
                });
                return(false);
            }).catch(function(e) {
                console.log('Reward Not Granted');
                vanillaToast.error("You did not receive a hint as you closed the ad before the reward was granted", {duration:1400, fadeDuration:120});
                return(false);
            });
        } else {
            console.log('Free Ad');
            doHint(guesses).then(function() {
                updateHintUI();
                vanillaToast.success("You have received ad free hint", {duration:1400, fadeDuration:120});
            });
        }
    }

    async function doHint(guesses) {
    /*function hintNumber(guesses) {
        if (guesses.length === 0) {
            return 1;
        }
        const top1k_guesses = guesses.filter(guess => guess[2]);

        if (top1k_guesses.length === 0) {
            return 1;
        }

        function highest_unguessed(guesses) {
            for (let i = 1; i < guesses.length; i++) {
                if (guesses[i][2] !== 999 - i) {
                    return 999 - i;
                }
            }
            // user has guessed all of the top 1k except the actual word.
            return -1;
        }

        const nearest_top1k = top1k_guesses[0][2];
        if (nearest_top1k === 999) {
            return highest_unguessed(top1k_guesses);
        }
        if (puzzleNumber > 89) {
            // for fairness, we phase this in staring tomorrow
            let guess = Math.floor((nearest_top1k * 3 + 1000) / 4);
            if (guess == nearest_top1k) {
                guess += 1;
                if (guess == 1000) {
                    return highest_unguessed(top1k_guesses);
                }
            }
            return guess;
        } else {
            return Math.floor((nearest_top1k + 1000) / 2);
        }
    }*/
    function highest_unguessed(guesses) {
        for (let i = 1; i < guesses.length; i++) {
            if (guesses[i][2] !== 999 - i) {
                return 999 - i;
            }
        }
        // user has guessed all of the top 1k except the actual word.
        return -1;
    }
    function hintNumber(guesses) {
        if (guesses.length === 0) {
            return 1;
        }
        const top1k_guesses = guesses.filter(guess => guess[2]);

        let highest = guesses[0][2];
        for (const guess of guesses) {
            highest = Math.max(guess[2],highest);
        }
        let ratio = 4;
        if (highest < 300) {
            ratio = 4.5;
        } else if (highest < 600) {
            ratio = 4.5;
        }
        let guess = Math.floor((highest * 3 + 1000) / ratio);
        if (guess == highest) {
            guess += 1;
            if (guess == 1000) {
                return highest_unguessed(top1k_guesses);
            }
        }
        return guess+1;
    }

    const n = hintNumber(guesses);
    if (n < 0) {
        alert("No more hints are available.");
    }

    const url = "/suggestion/" + secret + "/" + n; 
    const response = await fetch(url);
    try { 
        const data = await response.json();
        const hint_word = data.word;
        hints_used += 1;
        hints_words.push(hint_word);
        localStorage.setItem("hints_words", JSON.stringify(hints_words)); 
        doGuess(hint_word, true,true, window.playerName); /* MJD: Player Names */
    } catch (e) {
        console.log(e);
        alert("Fetching hint failed");
    }
}

async function doGuess(guess, is_hint,localGuess=true,player=null) { /* MJD: Player Names */
    if (secretVec === null) {
        secretVec = (await getModel(secret)).vec;
    }

    const guessData = await getModel(guess);
    if (!guessData) {
        $('#error').style.display='block';
        $('#error').style.backgroundColor = '#339';
        $('#error').style.color = '#fff';
        $('#error').style.padding = '5px 15px';
        $('#error').textContent = `I don't know the word \'${guess}\'`;
        return false;
    } else {
        $('#error').style.display='none';
 
    }

    let percentile = guessData.percentile || 0;

    const guessVec = guessData.vec;

    let similarity = getCosSim(guessVec, secretVec) * 100.0;
    if (!guessed.has(guess)) {
        if (!gameOver) {
            guessCount += 1;
        }        
        guessed.add(guess);

        const newEntry = [similarity, guess, percentile, guessCount, player]; /* MJD: Player Names */
        guesses.push(newEntry);

        if (handleStats) {
            const stats = getStats(); 
            if (!gameOver && !is_hint) {
                stats['totalGuesses'] += 1;
            }
            storage.setItem('stats', JSON.stringify(stats));
        }
    }
    guesses.sort(function(a, b){return b[0]-a[0]});

    if (!gameOver) {
        saveGame(-1, -1);
    }

    chrono_forward = 1;

    latestGuess = guess;
    updateGuesses();

    firstGuess = false;
    if (guess.toLowerCase() === secret && !gameOver) {
        endGame(true, true);
    }
  
    if (localGuess && teamRef) {
        console.log('Add guess to firestore ',CloudSemantle.teamPath(teamRef.key, guess),[guessCount, similarity, percentile, player]); /* MJD: Player Names */
        firestore.set(firestore.ref(db, CloudSemantle.teamPath(teamRef.key, guess)), [guessCount, similarity, percentile, player]); /* MJD: Player Names */

        if (percentile == 1000) {
            CloudSemantle.unsubscribe();
            $("#win-message").innerHTML = "<p style='text-align:center;padding:5px 10px;background:#090;color:#FFF;'>Congratulations! You (or your team) won!</p>";

        }
    }
}

    async function init() {
        updateHintUI();
        secret = getSecretWord(today).toLowerCase();
        storage = window.localStorage;
        puzzleKey = puzzleNumber;
        let noredir = false;
        if (getQueryParameter("force")) {
            migrate();
        }

        if (storage.getItem("migratedOut") && !storage.getItem("migratedIn")) {
            const url = window.location.href;
            if (url.indexOf("noredir") < 0) {
                const newUrl = url.replace("/semantle.novalis.org/", "/semantle.com/");
                window.location.replace(newUrl);
            } else {
                noredir = true;
                $("#magic").innerHTML = '<b>If you are having a hard time migrating your data to semantle.com, delete your browsers\'s data for semantle.com (NOT semantle.novalis.org) and click <a href="' + getMigrateLink(url) + '&force=true">here</a>.</b>';
            }
        }

        const urlSecret = getQueryParameter('word');
        if (urlSecret) {
            try {
                const word = atob(urlSecret).replace(/[0-9]+/, '');
                similarityStory = await getSimilarityStory(word);
                if (similarityStory == null) {
                    alert(`It looks like you clicked a custom puzzle link, but it was somehow broken.  I'll show you today's puzzle instead.`);
                    window.location.replace("/");
                    return;
                } else {
                    secret = word;
                    customMode = true;
                    handleStats = false;
                    // Use sessionStorage to avoid interfering with
                    // the global game state
                    storage = window.sessionStorage
                    puzzleKey = urlSecret;
                }
            } catch (e) {
                // user error -- just show regular semantle
                console.log("ERR: " + e);
                similarityStory = await getSimilarityStory(secret);
            }
        } else {
            similarityStory = await getSimilarityStory(secret);
        }

        const yesterday = secretWords[yesterdayPuzzleNumber].toLowerCase();

       
        let pastWeek = [];
        for (let i = 2; i < 9; i ++) {
            pastWeek.push(`"${getSecretWord(today - i)}"`);
        }
        

        // explicitly use localStorage for this
        $('#lower').checked = window.localStorage.getItem("lower") == "true";

        $('#lower').onchange = (e) => {
            window.localStorage.setItem("lower", "" + $('#lower').checked);
        };

        try {
            const yesterdayNearby = await getNearby(yesterday);
            const secretBase64 = btoa(unescape(encodeURIComponent(yesterday)));
            $('#nearbyYesterday').innerHTML = `${yesterdayNearby.join(", ")}, in descending order of closeness. <a href="nearby_1k/${secretBase64}">More?</a>`;
        } catch (e) {
            $('#nearbyYesterday').innerHTML = `Coming soon!`;
        }
        updateLocalTime();

        try {
            if (customMode) {
                $('#similarity-story').innerHTML = `
You're viewing a <b>custom puzzle</b>. Click <a href="/">here for today's official puzzle</a>. The nearest word has a similarity of
<b>${(similarityStory.top * 100).toFixed(2)}</b>, the tenth-nearest has a similarity of
${(similarityStory.top10 * 100).toFixed(2)} and the one thousandth nearest word has a
similarity of ${(similarityStory.rest * 100).toFixed(2)}.
`;

            } else {
                $('#similarity-story').innerHTML = `
Today is puzzle number <b>${puzzleNumber}</b>. The nearest word has a similarity of
<b>${(similarityStory.top * 100).toFixed(2)}</b>, the tenth-nearest has a similarity of
${(similarityStory.top10 * 100).toFixed(2)} and the one thousandth nearest word has a
similarity of ${(similarityStory.rest * 100).toFixed(2)}.
`;
            }
        } catch {
            // we can live without this in the event that something is broken
        }

        const storagePuzzleNumber = storage.getItem("puzzleNumber");
        if (storagePuzzleNumber != puzzleKey) {
            storage.removeItem("guesses");
            storage.removeItem("winState");
            storage.removeItem("hints_words");
            storage.removeItem("hints_used");
            hints_words = [];
            hints_used = 0;
            storage.setItem("puzzleNumber", puzzleKey);
            if (!noredir) {
                migrate();
            }
        }

        document.querySelectorAll(".dialog-close").forEach((el) => {
            el.innerHTML = ""
            el.appendChild($("#x-icon").content.cloneNode(true));
        });

        if (!window.localStorage.getItem("readRules")) {
            openRules();
        }

        $("#rules-button").addEventListener('click', openRules);
        $("#settings-button").addEventListener('click', openSettings);

        document.querySelectorAll(".dialog-underlay, .dialog-close, #capitalized-link").forEach((el) => {
            el.addEventListener('click', () => {
                document.body.classList.remove('dialog-open', 'rules-open', 'settings-open');
            });
        });

        document.querySelectorAll(".dialog").forEach((el) => {
            el.addEventListener("click", (event) => {
                // prevents click from propagating to the underlay, which closes the rules
                event.stopPropagation();
            });
        });

        // accordion functionality taken from
        // https://www.w3schools.com/howto/howto_js_accordion.asp
        document.querySelectorAll(".accordion").forEach((el) => {
          el.addEventListener("click", function() {
            this.classList.toggle("active");

            const panel = this.nextElementSibling;
            if (panel.style.display === "block") {
              panel.style.display = "none";
            } else {
              panel.style.display = "block";
            }
          });
        });

        $("#dark-mode").addEventListener('click', function(event) {
            window.localStorage.setItem("prefersDarkColorScheme", event.target.checked);
            darkModeMql.onchange = null;
            darkMode = event.target.checked;
            toggleDarkMode(darkMode);
            updateGuesses();
        });

        toggleDarkMode(darkMode);

        if (window.localStorage.getItem("prefersDarkColorScheme") === null) {
            $("#dark-mode").checked = false;
            $("#dark-mode").indeterminate = true;
        }

        $('#give-up-btn').addEventListener('click', function(event) {
            if (!gameOver) {
                if (confirm("Are you sure you want to give up?")) {
                    endGame(false, true);
                }
            }
        });

        $('#hint-btn').addEventListener('click', async function(event) {
            if (!gameOver) {
                await hint(guesses);  /* MJD: Amendment for 25 May 2022 */
            }
        });


        $('#form').addEventListener('submit', async function(event) {
            event.preventDefault();
            $('#guess').focus();
            $('#error').textContent = "";
            let guess = $('#guess').value.trim().replace("!", "").replace("*", "");
            if (!guess) {
                return false;
            }
            if ($("#lower").checked) {
                guess = guess.toLowerCase();
            }

            if (typeof unbritish !== 'undefined' && unbritish.hasOwnProperty(guess)) {
                guess = unbritish[guess];
            }

            if (guess[0].toLowerCase() != guess[0]) {
                caps += 1;
            }
            if (caps >= 2 && (caps / guesses.length) > 0.4 && !warnedCaps) {
                warnedCaps = true;
                $("#lower").checked = confirm("You're entering a lot of words with initial capital letters.  This is probably not what you want to do, and it's probably caused by your phone keyboard ignoring the autocapitalize setting.  \"Nice\" is a city. \"nice\" is an adjective.  Do you want me to downcase your guesses for you?");
                window.localStorage.setItem("lower", "true");
            }

            

            let gres = await doGuess(guess, false, true, window.playerName); /* MJD: Player Names */

            if (gres != false) {
                 $('#guess').value = "";
            }


            return false;
        });

        const winState = storage.getItem("winState");
        if (winState != null) {
            hints_words = JSON.parse(storage.getItem("hints_words") || "[]");
            hints_used = JSON.parse(storage.getItem("hints_used") || "0");
            guesses = JSON.parse(storage.getItem("guesses"));
            for (let guess of guesses) {
                guessed.add(guess[1]);
            }
            guessCount = guessed.size;
            latestGuess = "";
            updateGuesses();
            if (winState != -1) {
                endGame(winState > 0, false);
            }
        }

        CloudSemantle.init(); 

        let currentTeam = window.localStorage.getItem(gameType+'_teamcode');
        if (currentTeam) {
            CloudSemantle.joinTeam(currentTeam);
        }
    }

    function openRules() {
        document.body.classList.add('dialog-open', 'rules-open');
        window.localStorage.setItem("readRules", true);
        $("#rules-close").focus();
    }

    function openSettings() {
        document.body.classList.add('dialog-open', 'settings-open');
        $("#settings-close").focus();
    }

    function updateGuesses() {
        let inner = `<tr><th id="chronoOrder">#</th><th id="alphaOrder">Guess</th><th id="similarityOrder">Similarity</th><th>Getting close?</th></tr>`;
        /* This is dumb: first we find the most-recent word, and put
           it at the top.  Then we do the rest. */           
        for (let entry of guesses) {            
            let [similarity, oldGuess, percentile, guessNumber, player] = entry; /* MJD: Player Names */
            if (oldGuess == latestGuess) {
                inner += guessRow(similarity, oldGuess, percentile, guessNumber, latestGuess, player); /* MJD: Player Names */
            }
        }
        inner += "<tr><td colspan=4><hr></td></tr>";
        for (let entry of guesses) {
            let [similarity, oldGuess, percentile, guessNumber, player] = entry; /* MJD: Player Names */
            if (oldGuess != latestGuess) {
                inner += guessRow(similarity, oldGuess, percentile, guessNumber, latestGuess, player); /* MJD: Player Names */
            }
        }
        $('#guesses').innerHTML = inner;
        $('#chronoOrder').addEventListener('click', event => {
            guesses.sort(function(a, b){return chrono_forward * (a[3]-b[3])});
            chrono_forward *= -1;
            updateGuesses();
        });
        $('#alphaOrder').addEventListener('click', event => {
            guesses.sort(function(a, b){return a[1].localeCompare(b[1])});
            chrono_forward = 1;
            updateGuesses();
        });
        $('#similarityOrder').addEventListener('click', event => {
            guesses.sort(function(a, b){return b[0]-a[0]});
            chrono_forward = 1;
            updateGuesses();
        });
    }

    function toggleDarkMode(on) {
        document.body.classList[on ? 'add' : 'remove']('dark');
        const darkModeCheckbox = $("#dark-mode");
        // this runs before the DOM is ready, so we need to check
        if (darkModeCheckbox) {
            darkModeCheckbox.checked = on;
        }
    }

    function checkMedia() {
        const storagePrefersDarkColorScheme = window.localStorage.getItem("prefersDarkColorScheme");
        if (storagePrefersDarkColorScheme === 'true' || storagePrefersDarkColorScheme === 'false') {
            darkMode = storagePrefersDarkColorScheme === 'true';
        } else {
            darkMode = darkModeMql.matches;
            darkModeMql.onchange = (e) => {
                darkMode = e.matches;
                toggleDarkMode(darkMode)
                updateGuesses();
            }
        }
        toggleDarkMode(darkMode);
    }

    function saveGame(guessCount, winState) {
        // If we are in a tab still open from yesterday, we're done here.
        // Don't save anything because we may overwrite today's game!
        let savedPuzzleNumber = storage.getItem("puzzleNumber");
        if (savedPuzzleNumber != puzzleKey) { return }
 
        storage.setItem("winState", winState); 
        storage.setItem("guesses", JSON.stringify(guesses));
        storage.setItem("hints_used", JSON.stringify(hints_used));
        storage.setItem("hints_words", JSON.stringify(hints_words));


        if (syncRef && teamTwitterRef && teamTwitter) {
           let pstats = getStats();
            firestore.set(firestore.ref(db, CloudSemantle.syncPath(syncRef.key)),  getStats());
            if (winState != -1) {
                const totalCountedGames = pstats['wins'] + pstats['abandons'];
                const totalGames = pstats['wins'] + pstats['giveups'] + pstats['abandons'];
                $("#game-history").innerHTML = `
<h3 style="margin:0 0 15px 0">Overall Statistics</h3>
<table>
<tr><th>Total games played:</th><td>${totalGames}</td></tr>
<tr><th>Wins:</th><td>${pstats['wins']}</td></tr>
<tr><th>Win streak:</th><td>${pstats['winStreak']}</td></tr>
<tr><th>Give-ups:</th><td>${pstats['giveups']}</td></tr>
<tr><th>Did not finish:</th><td>${pstats['abandons']}</td></tr>
<tr><th>Total guesses across all games:</th><td>${pstats['totalGuesses']}</td></tr>
<tr><th>Average guesses across all games:</th><td>${totalCountedGames > 0 ? (pstats['totalGuesses'] / totalCountedGames).toFixed(2) : 0}</td></tr>
<tr><th>Total hints used:</th><td>${pstats['hints']}</td></tr>
</table>
    `;
            }
        }
    }

    /* MJD: Stats Fix */

    function getStats() {
        const oldStats = storage.getItem("stats");
        if (oldStats == null) {
            const stats = {
                'firstPlay' : puzzleNumber,
                'lastEnd' : puzzleNumber - 1,
                'lastPlay' : puzzleNumber,
                'winStreak' : 0,
                'playStreak' : 0,
                'totalGuesses' : 0,
                'wins' : 0,
                'giveups' : 0,
                'abandons' : 0,
                'totalPlays' : 0,
                'hints' : 0,
            };
            storage.setItem("stats", JSON.stringify(stats));
            if (syncRef && teamTwitterRef && teamTwitter) {             
                firestore.set(firestore.ref(db, CloudSemantle.syncPath(syncRef.key)),  stats);
            } 
            return stats;
        } else {
            const stats = JSON.parse(oldStats);
            stats['hints'] = stats['hints'] || 0;
            if (stats['lastPlay'] != puzzleNumber) {
                const onStreak = (stats['lastPlay'] == puzzleNumber - 1);
                if (onStreak) {
                    stats['playStreak'] += 1;
                }
                stats['totalPlays'] += 1;
                if (stats['lastEnd'] != stats['lastPlay']) {
                    stats['abandons'] += 1;
                }
                stats['lastPlay'] = puzzleNumber;
            }
            storage.setItem("stats", JSON.stringify(stats));
            if (syncRef && teamTwitterRef && teamTwitter) {             
                 firestore.set(firestore.ref(db, CloudSemantle.syncPath(syncRef.key)),  stats);
            }
            return stats;
        }
    }

    /* MJD: Stats Fix End */


var CloudSemantle = {

    async checkLoggedIn() {
        if (!firestore)
        firestore = await CloudSemantle.initFirestore();
        
        if (!fireauth)
        fireauth = await import("https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js");

        const auth = fireauth.getAuth();
        fireauth.onAuthStateChanged(auth, (user) => {
            if (user) {
                console.log(user);
                twitterUser = user;
                CloudSemantle.doTwitter(true);
            } 
        });
    },

    async  twitterSignOut() {
        if (!teamTwitter || !twitterUser) {
            return;
        }
        try {
            if (!firestore)
                firestore = await CloudSemantle.initFirestore();

            if (!fireauth)
                fireauth = await import("https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js");
            
                const auth = fireauth.getAuth();
                auth.signOut().then(function() {
                    console.log('Signed Out');
                    teamTwitter = false;
                    twitterUser = null;
                    if (firestore) firestore.off(teamTwitterRef);
                    teamTwitterRef = null;
                    if (firestore)  firestore.off(syncRef);
                    syncRef = null; 
                    
                    CloudSemantle.updateUI();
                }, function(error) {
                    console.error('Sign Out Error', error);
                    CloudSemantle.updateUI();
                });
            
        } catch(err) {

        }
    },

    async twitterSignin() {
        if (!fireauth)
            fireauth = await import("https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js");
    
        return new Promise((resolve, reject) => {
            const twitter = new fireauth.TwitterAuthProvider();
            const auth = fireauth.getAuth();
            auth.useDeviceLanguage();
    
            fireauth.onAuthStateChanged(auth, (user) => {
                if (user) {
                    resolve(user);
                } else {
                    if (!teamTwitter) {
                        fireauth.signInWithPopup(auth, twitter).then((result) => {
                            resolve(result.user);
                        }).catch((error) => {
                            console.log(error);
                            reject(error);
                        });
                    } else {
                        reject(null);
                    }
                }
            });
        });
    },

    syncPath(root, child = "") {
        if (child)
            return gameType+'stats/' + root + '/' + child;
    
        return gameType+'stats/' + root;
    },

    updateHistory(pstats) {
        if (pstats) {
            storage.setItem("stats", JSON.stringify(pstats));
                const totalCountedGames = pstats['wins'] + pstats['abandons'];
                const totalGames = pstats['wins'] + pstats['giveups'] + pstats['abandons'];
                $("#game-history").innerHTML = `
                <h3 style="margin:0 0 15px 0">Overall Statistics</h3>
    <table>
        <tr><th>Total games played:</th><td>${totalGames}</td></tr>
    <tr><th>Wins:</th><td>${pstats['wins']}</td></tr>
    <tr><th>Win streak:</th><td>${pstats['winStreak']}</td></tr>
    <tr><th>Give-ups:</th><td>${pstats['giveups']}</td></tr>
    <tr><th>Did not finish:</th><td>${pstats['abandons']}</td></tr>
    <tr><th>Total guesses across all games:</th><td>${pstats['totalGuesses']}</td></tr>
    <tr><th>Average guesses across all games:</th><td>${totalCountedGames > 0 ? (pstats['totalGuesses'] / totalCountedGames).toFixed(2) : 0}</td></tr>
     <tr><th>Total hints used:</th><td>${pstats['hints']}</td></tr>
    </table>
    `;
        }
    },

    mergeHistory(data) {
        let pstats = data.val();
        CloudSemantle.updateHistory(pstats);
    },

    syncHistory() {  

    },

    async doTwitter(loggedIn = false) {
        $('#signin').disabled = true;

        try {
            if (!firestore && !loggedIn)
                firestore = await CloudSemantle.initFirestore();

            if (!twitterUser && !loggedIn)
                twitterUser = await CloudSemantle.twitterSignin();

                teamTwitterRef = firestore.ref(db, CloudSemantle.teamPath(twitterUser.uid));
            teamTwitter = true;
            firestore.onValue(teamTwitterRef, (data) => {
                CloudSemantle.buildGuesses(data);
                firestore.onChildAdded(teamTwitterRef, CloudSemantle.processGuess);
                firestore.onChildChanged(teamTwitterRef, CloudSemantle.processGuess);
            }, {
                onlyOnce: true 
            });
 
            syncRef = firestore.ref(db, CloudSemantle.syncPath(twitterUser.uid));
            firestore.onValue(syncRef, (data) => {
                CloudSemantle.mergeHistory(data); 
                firestore.onChildAdded(syncRef, function(d) {                    
                    let pstats = getStats();
                    pstats[d.key] = d.val();
                    CloudSemantle.updateHistory(pstats);

                });
                firestore.onChildChanged(syncRef, function(d) {
                    let pstats = getStats();
                    pstats[d.key] = d.val();
                    CloudSemantle.updateHistory(pstats);
                });
            }, { 
                onlyOnce: true
            });
            let pstats = getStats(); 
            CloudSemantle.updateHistory(pstats);
            $("#twitter-name").textContent = twitterUser.displayName;
            
            $("#twitter-photo").src = twitterUser.photoURL;
            $("#twitter-status").innerHTML = `You’re signed in as <img class="twitter-button" src="${twitterUser.photoURL}" />&nbsp;<b>${twitterUser.displayName}</b>`;
            $("#join-twitter").style.display = "none";
        } catch (err) {
            console.log(err);
            $('#start').disabled = false;
            $('#join').disabled = false;
            $('#signin').disabled = false;
        }
        CloudSemantle.updateUI();
    },

    async joinTwitter(event) {
        event.preventDefault();
        CloudSemantle.doTwitter();
        return false;
    },


    async initApp() {
        let [firebase, analytics] = await Promise.all([
            import("https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js"),
            import("https://www.gstatic.com/firebasejs/9.6.10/firebase-analytics.js"),
        ]);

       
        const firebaseConfig = {
            apiKey: "AIzaSyCw5dRoVi1K-T3hQeP4gvd-Wy5UJbQZzfA",
            authDomain: "semantle-app.firebaseapp.com",
            projectId: "semantle-app",
            storageBucket: "semantle-app.appspot.com",
            messagingSenderId: "773199721890",
            appId: "1:773199721890:web:1b22e7f1a2824b0f8d6efb",
            measurementId: "G-TXRHNVNJK2"
        };
         
        app = firebase.initializeApp(firebaseConfig);
        analytics.getAnalytics(app);
    },
 
    async initFirestore() {
        if (!app)
            await CloudSemantle.initApp();

        let [database, appcheck] = await Promise.all([
            import("https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js"),
            import("https://www.gstatic.com/firebasejs/9.6.10/firebase-app-check.js")
        ]);

        db = database.getDatabase(app);
        appcheck.initializeAppCheck(app, {
            provider: new appcheck.ReCaptchaV3Provider('6Ld2o_4fAAAAALDIXIroXzfCxET6xC56rQO8LkZP'),
            isTokenAutoRefreshEnabled: true
        });
        return database;
    },


    processGuess(data) {
     
        if (data.key == '_users') {
            if (!teamTwitter)
                $('#team-members').textContent = data.val();
            return;
        }

        if (!guessed.has(data.key)) {
            let v = data.val();
            console.log(v);
            if (v.length >= 3) {
              
                let [guessNumber, score, percentile, player] = v; /* MJD: Player Names */
                if (percentile == 1000) {
                    doGuess(data.key, false,false,player); /* MJD: Player Names */
                    CloudSemantle.unsubscribe();
                    $("#win-message").innerHTML = "<p style='text-align:center;padding:5px 10px;background:#090;color:#FFF;'>Congratulations! You (or your team) won!</p>";
                } else {
                    doGuess(data.key, false,false,player); /* MJD: Player Names */
                }
            }
            
        }
         
    },



    teamPath(root = "", child = "") {
        if (child)
            return gameType+'day' + puzzleNumber + '/' + root + '/' + child;
    
        if (root)
            return gameType+'day' + puzzleNumber + '/' + root;
    
        return gameType+'day' + puzzleNumber;
    },

   unsubscribe(team=false) { 
        $('#leave').disabled = true;
        if (teamRef) {
            firestore.off(teamRef);
            if (!teamTwitter)
                firestore.set(firestore.ref(db, CloudSemantle.teamPath(teamRef.key, "_users")), $('#team-members').textContent - 1);
            teamRef = null;
            $('#team-members').textContent = "";
        }
        $('#start').disabled = false;
        $('#join').disabled = false;
        $('#leave').disabled = false;
        $('#code').value = "";
        $("#team-collab").style.display = "block";
        $("#twitter-collab").style.display = "block";
        $('#start-team').style.display = 'block';
        $('#join-team').style.display = 'block';
        $('#leave-team').style.display = 'none';
        $("#team-status").textContent = ""; 
        window.localStorage.removeItem(gameType+"_teamcode");
        
        CloudSemantle.updateUI();
    },


   twitterUnsubscribe(team=false) { 
       setTimeout(function() {
        CloudSemantle.twitterSignOut();
        
       },200);
           
        $('#signin').disabled = false;
        $('#signout').disabled = false;
        $("#team-collab").style.display = "block";
        $("#twitter-collab").style.display = "block";
        $('#join-twitter').style.display = 'block';
        $('#leave-twitter').style.display = 'none';
        $("#twitter-status").textContent = "";
        
        CloudSemantle.updateUI();
    },

    updateUI() {
        $("#team-message").innerHTML = "";
        $("#twitter-message").innerHTML = "";
        $("#twitter-message").style.display = 'none';
        $("#team-message").style.display = 'none';
        document.body.classList.remove('logged-in');
        let currentTeam = window.localStorage.getItem(gameType+'_teamcode');
        document.body.classList.remove('is-team-game');
        if (currentTeam || teamRef) {
            document.body.classList.add('is-team-game');
            $("#team-message").style.display = 'block';
            $("#team-message").innerHTML = "<p style='text-align:center;padding:5px 10px;background:#fff;color:#000;' class='team-status-message'>You are currently playing Semantle w/ a team</p>";
        } 
        if (teamTwitter || twitterUser) {
            document.body.classList.add('logged-in');
            $("#twitter-message").style.display = 'block';
            $("#twitter-message").innerHTML = `You’re signed in as <img class="twitter-button" src="${twitterUser.photoURL}" />&nbsp;&nbsp;<b>${twitterUser.displayName}</b> - <a href="#" class="twitter-signout" onclick="return(false);">Sign out</a>`;
        } 
        document.querySelectorAll('.twitter-signout').forEach(function(i) {
            i.removeEventListener('click',CloudSemantle.twitterUnsubscribe);
            i.addEventListener('click',CloudSemantle.twitterUnsubscribe);
        });
        
        
    }, 

    buildGuesses(data) {
        guesses.sort(function (a, b) {
            return chrono_forward * (a[1] - b[1])
        });
    
        for (let guess of guesses) {
            let [score, word,percentile,guessNumber, player] = guess; /* MJD: Player Names */
    
            if (teamRef && percentile && (!data || !data.hasChild(word)))
                firestore.set(firestore.ref(db, CloudSemantle.teamPath(teamRef.key, word)), [guessNumber, score, percentile, player]); /* MJD: Player Names */
        }
    }, 

   async startTeam(event) {
    event.preventDefault();

    $('#start').disabled = true;
    $('#join').disabled = true;

    window.localStorage.removeItem(gameType+"_teamcode");
        try {
            if (!firestore)
                firestore = await CloudSemantle.initFirestore();
    
            teamRef = firestore.push(firestore.ref(db, CloudSemantle.teamPath()));
            teamCode = teamRef.key.replace(/-/gu, "Ø");
            CloudSemantle.buildGuesses();
            firestore.onChildAdded(teamRef, CloudSemantle.processGuess);
            firestore.onChildChanged(teamRef, CloudSemantle.processGuess);
            firestore.set(firestore.ref(db, CloudSemantle.teamPath(teamRef.key, "_users")), 1);

            $("#team-status").innerHTML = `Please share code <b class="teamcode">${teamCode}</b> with your team.`;
            window.localStorage.setItem(gameType+"_teamcode",teamCode);
            try {
                const copied = ClipboardJS.copy(teamCode);
                $("#team-status").innerHTML += `<br /><br />Code copied to clipboard`;
            } catch (err) {
                $("#team-status").textContent = "An error occurred. " + err;
            }
            $('#code').value = teamCode;
        } catch(err) {
            $("#team-status").textContent = "An error occurred. " + err;
            $('#start').disabled = false;
            $('#join').disabled = false;
            $('#signin').disabled = false;
        }
        CloudSemantle.updateUI();
       
    },

    async joinTeam(teamId = null) {

        teamCode = typeof teamId !== 'string' ? $('#code').value.trim() : teamId;
        if (!teamCode) {
            $("#team-status").textContent = "Please enter a code";
            return false;
        }

    
        window.localStorage.removeItem(gameType+"_teamcode");
        $('#start').disabled = true;
        $('#join').disabled = true;
        try {
            
            if (!firestore)
                firestore = await CloudSemantle.initFirestore();
    
            teamRef = firestore.ref(db, CloudSemantle.teamPath(teamCode.replace(/Ø/gu, "-")));
            firestore.onValue(teamRef, (data) => {
                if (data.exists()) {
                    CloudSemantle.buildGuesses(data);
                    firestore.onChildAdded(teamRef, CloudSemantle.processGuess);
                    firestore.onChildChanged(teamRef, CloudSemantle.processGuess);
                    data.forEach((entry) => {
                        if (entry.key == "_users" && typeof teamId !== 'string')
                            firestore.set(firestore.ref(db, CloudSemantle.teamPath(teamRef.key, "_users")), entry.val() + 1);
                    });
                    $("#team-status").innerHTML = `You joined team <b class="teamcode">${teamCode}</b>.`;
                    window.localStorage.setItem(gameType+"_teamcode",teamCode);
                } else {
                    $("#team-status").textContent = "Invalid code.";
                    teamRef = null;
                    $('#start').disabled = false;
                    $('#join').disabled = false;
                    $('#signin').disabled = false;
                }
                CloudSemantle.updateUI();
            }, {
                onlyOnce: true
            }); 
        } catch (err) {
            $("#team-status").textContent = "Invalid code. " + err;
            teamRef = null;
            $('#start').disabled = false;
            $('#join').disabled = false;
            $('#signin').disabled = false;
        }
        CloudSemantle.updateUI();
        return false;
    },

    openCloud() {
        document.body.classList.add('dialog-open','cloud-open');
        $('#cloud').style.display = 'block';
        $("#team-status").textContent = "";
        $("#twitter-status").textContent = "";
        $('#start-team').style.display = 'block';
        $('#join-team').style.display = 'block';
        $('#leave-team').style.display = 'none';
        $('#join-twitter').style.display = 'block';
        $('#leave-twitter').style.display = 'none';
        if (teamTwitterRef || teamRef) {
            if (teamRef) {
                $('#start-team').style.display = 'none';
                $('#join-team').style.display = 'none';
                $('#leave-team').style.display = 'block';
                $('#team').textContent = teamCode;    
            }
            if (teamTwitter) { 
                $('#join-twitter').style.display = 'none';
                $('#leave-twitter').style.display = 'block';
            } 
           
        } 
    }, 

    init() {
        document.querySelectorAll('.cloud-button').forEach(function(i) {
            i.addEventListener('click', CloudSemantle.openCloud);
        });
        $('#cloud-button').addEventListener('click', CloudSemantle.openCloud);
        $('#cloud .dialog-close').addEventListener('click', function() {
            document.body.classList.remove('dialog-open','cloud-open');
        });
 
        $('#start').addEventListener('click', CloudSemantle.startTeam);
        $('#join').addEventListener('click', CloudSemantle.joinTeam);
        $('#leave').addEventListener('click', CloudSemantle.unsubscribe);
        $('#signin').addEventListener('click', CloudSemantle.joinTwitter);
       // $('#sync').addEventListener('click', CloudSemantle.syncHistory);
       // $('#refresh').addEventListener('click', CloudSemantle.syncHistory);
        $('#signout').addEventListener('click', CloudSemantle.twitterUnsubscribe);
    
        CloudSemantle.checkLoggedIn();

    },

    
    syncStats() {



    }
    

    
}

    function endGame(won, countStats) {
        let stats;
        if (handleStats) {
            stats = getStats();
            if (countStats) {
                const onStreak = (stats['lastEnd'] == puzzleNumber - 1);

                stats['lastEnd'] = puzzleNumber;
                if (won) {
                    if (onStreak) {
                        stats['winStreak'] += 1;
                    } else {
                    stats['winStreak'] = 1;
                    }
                    stats['wins'] += 1;
                } else {
                    stats['winStreak'] = 0;
                    stats['giveups'] += 1;
                }
                stats['hints'] += hints_used;
                storage.setItem("stats", JSON.stringify(stats));
            }
        }

        $('#give-up-btn').style = "display:none;";
        $('#response').classList.add("gaveup");
        gameOver = true;
        const secretBase64 = btoa(unescape(encodeURIComponent(secret)));
        let response;
        let share = '';
        if (!customMode) {
            share = '<a href="javascript:share();">Share</a> and play again tomorrow.';
            if (mobileCheck()) {
                share += '<br/><br/>Click here to <a href="javascript:share(true);">Copy</a> to clipboard';
            }
            share += '.<br/><br/>';
        }
        if (won) {
            response = `<p><b>You found it in ${guesses.length}!  The secret word is ${secret}</b>.  Feel free to keep entering words if you are curious about the similarity to other words. ${share} You can see the nearest words <a href="nearby_1k/${secretBase64}">here</a>.</p>`
             
             //window.mplConfetti.start();
         
        } else { 
            response = `<p><b>You gave up!  The secret word is: ${secret}</b>.  Feel free to keep entering words if you are curious about the similarity to other words.  ${share}  You can see the nearest words <a href="nearby_1k/${secretBase64}">here</a>.</p>`;
        }

        if (handleStats) {
            const totalCountedGames = stats['wins'] + stats['abandons'];
            const totalGames = stats['wins'] + stats['giveups'] + stats['abandons'];
            response += `
<table>
<tr><th>Total games played:</th><td>${totalGames}</td></tr>
<tr><th>Wins:</th><td>${stats['wins']}</td></tr>
<tr><th>Win streak:</th><td>${stats['winStreak']}</td></tr>
<tr><th>Give-ups:</th><td>${stats['giveups']}</td></tr>
<tr><th>Did not finish:</th><td>${stats['abandons']}</td></tr>
<tr><th>Total guesses across all games:</th><td>${stats['totalGuesses']}</td></tr>
<tr><th>Average guesses across all games:</th><td>${totalCountedGames > 0 ? (stats['totalGuesses'] / totalCountedGames).toFixed(2) : 0}</td></tr>
<tr><th>Total hints used:</th><td>${stats['hints']}</td></tr>
</table>
`;
        }
        $('#response').innerHTML = response;

        hints_used = [];
        if (countStats) {
            saveGame(guesses.length, won ? 1 : 0);
        }
    }

    return {
        init: init,
        checkMedia: checkMedia,
    };
})();

// do this when the file loads instead of waiting for DOM to be ready to avoid
// a flash of unstyled content
Semantle.checkMedia();

window.addEventListener('load', async () => { 
    
    
    Semantle.init(); 
    
});
