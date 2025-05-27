const roomId = getRoomId() ? parseInt(getRoomId()) : "all";
let teams = [];
let socket = null, globalTimer = null, timerSeconds = 0, currentVotingSessionId = null;
let audioTimer = new Audio("/assets/sounds/timer.mp3");
let audioTimerElapsed = new Audio("/assets/sounds/gong.mp3");
let audioRight = new Audio("/assets/sounds/right.mp3");
let audioPercentage = new Audio("/assets/sounds/percentage.mp3");
let audioApplause = new Audio("/assets/sounds/applause.mp3");
$(document).ready(async function () {
    if (roomId !== "all") {
        const response = await axios.get(`/api/rooms/${roomId}`);
        $(".room-name").text(response.data.sName);
        $("body").attr("room", roomId);
    }
    teams = await getTeamsOrderedById();
    initSocket();
    initTimer();
    $("body.muted").click(function () {
        $(this).removeClass("muted");
        loadAudio();
    });
    const lastStatus = await getLastStatus();
    if (lastStatus) {
        await setStatus(lastStatus);
    } else {
        $("#cover-section").fadeIn(150).css("display", "flex");
    }
});

function getRoomId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('idroom');
}

function loadAudio() {
    audioTimer.load();
    audioTimer.currentTime = 0;
    audioTimer.pause();

    audioTimerElapsed.load();
    audioTimerElapsed.currentTime = 0;
    audioTimerElapsed.pause();

    audioRight.load();
    audioRight.currentTime = 0;
    audioRight.pause();

    audioPercentage.load();
    audioPercentage.currentTime = 0;
    audioPercentage.pause();

    audioApplause.load();
    audioApplause.currentTime = 0;
    audioApplause.pause();
}

function addZeroBefore(n) {
    return (n < 10 ? '0' : '') + n;
}

function initTimer() {
    globalTimer = new easytimer.Timer({precision: 'seconds', countdown: true});
    globalTimer.addEventListener("secondsUpdated", function (e) {
        $(".timer-box .minutes").text(addZeroBefore(globalTimer.getTimeValues().minutes));
        $(".timer-box .seconds").text(addZeroBefore(globalTimer.getTimeValues().seconds));
    });
    globalTimer.addEventListener("targetAchieved", function (e) {
        $(".timer-box").addClass("finished");
        audioTimer.currentTime = 0;
        audioTimer.pause();
        audioTimerElapsed.play();
    });
}

function resetTimer() {
    globalTimer.stop();
    $(".timer-box").removeClass("finished");
    $(".timer-box .minutes").text(addZeroBefore(Math.floor(timerSeconds / 60)));
    $(".timer-box .seconds").text(addZeroBefore(timerSeconds % 60));
    $(".timer-box").show();
}

function startTimer() {
    globalTimer.start({
        countdown: true,
        startValues: {minutes: Math.floor(timerSeconds / 60), seconds: timerSeconds % 60}
    });
    audioTimer.play();
}

function stopTimer() {
    globalTimer.pause();
    audioTimer.currentTime = 0;
    audioTimer.pause();
    $(".timer-box").removeClass("finished");
}

function initSocket() {
    socket = io("/screen", {path: "/api/socket", query: {room: roomId}, reconnection: true});

    socket.on("connect", function () {
        console.log("Connected to server");
    });

    socket.on("status:set", setStatus);

    socket.on("status:reset", function () {
        currentVotingSessionId = null;
        activateSection("#cover-section");
    });

    socket.on("disconnect", function () {
        console.log("Disconnected from server");
    });
}

async function getLastStatus() {
    const response = await axios.get(`/api/status/${roomId}`);
    return response.data;
}

async function setStatus(status) {
    console.log(status);
    if (status.iTimerSeconds) {
        timerSeconds = status.iTimerSeconds;
    } else {
        if (status.currentQuestion) {
            timerSeconds = status.currentQuestion.iTimerSeconds;
        }
    }
    switch (status.sActiveCommandScreen) {
        case "Cover":
            activateSection("#cover-section");
            break;
        case "Question":
            await loadQuestion(status.currentQuestion, false, false);
            loadTeamScores();
            activateSection("#question-section");
            resetTimer();
            break;
        case "Start Session":
            await loadQuestion(status.currentQuestion, false, false);
            loadTeamScores();
            activateSection("#question-section");
            resetTimer();
            startTimer();
            break;
        case "Stop Session":
            await loadQuestion(status.currentQuestion, false, false);
            loadTeamScores();
            activateSection("#question-section");
            stopTimer();
            break;
        case "Correct Answer":
            await loadQuestion(status.currentQuestion, false, false);
            loadTeamScores();
            activateSection("#question-section");
            $("#question-section").addClass("correct-answers");
            $("#question-section").addClass("animate");
            setTimeout(function () {
                $("#question-section").removeClass("animate");
            }, 2000);
            audioRight.play();
            break;
        case "Team Results":
            currentVotingSessionId = status.currentVotingSessionId;
            await loadQuestion(status.currentQuestion, true, true);
            loadTeamScores(status.currentVotingSession.votingSessionTeamResult);
            activateSection("#question-section");
            break;
        case "Team Points":
            currentVotingSessionId = status.currentVotingSessionId;
            await loadQuestion(status.currentQuestion, true, false);
            loadTeamScores(status.currentVotingSession.votingSessionTeamResult, true);
            activateSection("#question-section");
            break;
        case "Partial Ranking Teams":
            await loadTeamsRanking(false);
            activateSection("#ranking-section");
            break;
        case "Final Ranking Teams":
            await loadTeamsRanking(true);
            $("#ranking-section").removeClass("partial-rooms").removeClass("partial-teams").removeClass("final-rooms").addClass("final-teams");
            activateSection("#ranking-section");
            break;
    }
}

async function loadQuestion(question, bShowResults, playAudio) {
    if (!bShowResults) {
        $("#question-section").removeClass("correct-answers");
    }
    $("#question-section").removeClass("results");
    if (question.iFrontEndOrder === 0) {
        $("#question-section .question-text-number").text("TEST QUESTION");
    } else {
        $("#question-section .question-text-number").text(`QUESTION ${question.iFrontEndOrder}`);
        $("#question-section .question-text-number").attr("area", question.sSessionNotes);
    }
    $("#question-section .question-text").html(question.sText);
    const answers = question.answers;
    let answersHtml = "";
    for (answer of answers) {
        answersHtml += `
            <div class="answer-choice ${answer.sAdditionalClasses ? answer.sAdditionalClasses : ""}" bCorrect="${answer.bCorrect}">
                <div class="answer-letter">
                    <p>${answer.sLetter}</p>
                </div>
                
                <div class="answer-text-box">
                    <p>${answer.sText}</p>
                </div>
            </div>
        `;
    }
    $("#question-section .answer-box-container").html(answersHtml);
    if(bShowResults){
        $("#question-section").addClass("results");
    }
    if (playAudio) {
        audioPercentage.play();
    }
}

async function loadTeamsRanking(bFinalRanking) {
    teams = await getTeamsOrderedById();
    const maxScore = teams.reduce((max, team) => team.iScore > max ? team.iScore : max, 0);
    let rankingHtml = "";
    teams.forEach((team) => {
        rankingHtml += `
            <div class="ranking-element ${maxScore === team.iScore ? "ranking-first" : ""}">
                <div class="ranking-element-inner ${maxScore === team.iScore ? "ranking-first-inner" : ""}">
                    <p class="ranking-label">Team</p>
                    <p class="ranking-team-name">${team.sName}</p>
                    <div class="ranking-border"></div>
                    <p class="ranking-label">Score</p>
                    <p class="ranking-score">${team.iScore}</p>
                </div>
            </div>
        `;
    });
    $("#container-ranking").html(rankingHtml);
    if(bFinalRanking){
        $(".ranking-element.ranking-first").addClass("animate-pulse");
        audioApplause.play();
    }

}

async function getResults(bTeamPointsEnabled, bRoomPointsEnabled) {
    const result = await axios.get(`/api/votingsessions/${currentVotingSessionId}`, {
        params: {
            bTeamPointsEnabled,
            bRoomPointsEnabled,
            roomId
        }
    });
    return result.data;
}

async function getTeamsOrderedById() {
    const result = await axios.get(`/api/teams`);
    return result.data;
}

function activateSection(idSection) {
    if ($(idSection).is(":visible") && idSection !== "#ranking-section") {
        return;
    }
    $(".app-section").hide();
    $(idSection).fadeIn(150).css("display", "flex");
}

function loadTeamScores(teamResult = null, bShowPoints = false) {
    $("#container-team-scores").empty();
    const maxScore = teamResult ? teamResult.reduce((max, team) => team.iScore > max ? team.iScore : max, 0) : 0;
    teams.forEach(team => {
        const teamPercentage = (teamResult && teamResult.length) ? teamResult.find((teamResult) => teamResult.teamId === team.id).percentage.toFixed(2) : 0;
        const teamScore = (teamResult && bShowPoints && teamResult.length) ? teamResult.find((teamResult) => teamResult.teamId === team.id).iScore : 0;
        $("#container-team-scores").append(
            `
            <div>
                <div class="container-team-results">
                    <p>CORRECT ANSWERS</p>
                    <div class="team-results">
                        <div class="progress-bar" style="width: ${teamPercentage}%;">
                            <p>${teamPercentage}%</p>
                        </div>
                    </div>
                </div>
                <div class="container-team-score team-${team.id}">
                    <p class="label-team-name">
                        Team
                    </p>
                    <p class="team-name">
                        ${team.sName}
                    </p>
                    <p class="team-score ${maxScore === teamScore ? "team-first" : ""}">
                        ${teamScore}
                    </p>
                </div>
            </div>
            `
        );
    });
    if(teamResult){
        if(!bShowPoints){
            setTimeout(() => {
                $(".progress-bar").addClass("animate");
            }, 2700);
        }
        else{
            $(".progress-bar").addClass("animate");
            $(".team-first").addClass("animate-pulse");
        }
    }

}
