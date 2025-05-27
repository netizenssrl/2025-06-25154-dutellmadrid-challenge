let localStorageData = null, participant = null, teams = null, socket = null, globalTimer = null;
let appStatus = {
    iTimerSeconds: 0,
    currentVotingSessionId: null,
    bVoted: false,
};
$(document).ready(async function () {
    try {
        const localStorageData = getLocalStorage();
        const urlParams = new URLSearchParams(window.location.search);
        const newTeamId = parseInt(urlParams.get("idteam"));

        const participantId = localStorageData ? localStorageData.participantId : null;
        participant = await getParticipant(participantId);
        if(participant){
            if (participant.teamId !== newTeamId ) {
                try {
                    const response = await axios.post(
                        `/api/participants/${participantId}/update`,
                        { teamId: newTeamId }
                    );
                    participant = response.data;

                    localStorage.setItem(
                        "dutell",
                        JSON.stringify({ participantId, teamId: newTeamId })
                    );
                } catch (error) {
                    console.error(
                        "Errore durante l'aggiornamento del participant:",
                        error
                    );
                }
            }
            await postLoginAction();
        }
    }
    catch (error) {
        console.error("Errore generale nell'inizializzazione:", error);
    }
    $("#btn-vote").click(async function () {
        const selectedAnswerId = parseInt($(".answer-choice.selected").attr("answerId"));
        $(this).addClass("disabled");
        appStatus.bVoted = true;
        const request = await axios.post("/api/participants/vote", {
            participantId: participant.id,
            answerId: selectedAnswerId,
            votingSessionId: appStatus.currentVotingSessionId,
            roomId: participant.roomId
        });
    });
});

async function postLoginAction() {
    const response = await axios.get("/api/teams");
    teams = response.data;
    initSocket();
    initTimer();
    if (participant.team) {
        $(".team-name").text(participant.team.sName);
    } else {
        $(".team-name").html("<br />");
    }
    $("#team-name").text(participant.team.sName);
}

function getLocalStorage() {
    const storedData = localStorage.getItem("dutell");
    if (storedData) {
        const data = JSON.parse(storedData);
        return data;
    } else {
        return null;
    }
}

async function getParticipant(participantId) {
    try {
        if (!participantId) {
            throw new Error("Id partecipante non fornito");
        }
        const response = await axios.get(`/api/participants/${participantId}`);
        return response.data;
    } catch (error) {
        if ((error.response && error.response.status === 404) || error.message === "Id partecipante non fornito") {
            console.warn("Partecipante non trovato, eseguo l'autologin...");
            localStorage.removeItem("dutell");
            const urlParams = new URLSearchParams(window.location.search);
            const teamId = urlParams.get("idteam");
            const newResponse = await axios.get(
                `/api/participants/autologin?idteam=${teamId}`
            );
            const newParticipant = newResponse.data;
            // Salva il nuovo participant in localStorage
            localStorage.setItem(
                "dutell",
                JSON.stringify({
                    participantId: newParticipant.id,
                    teamId: teamId,
                })
            );

            return newParticipant;
        }

        $(".app-section").not("#home-section").hide();
        $("#home-section").fadeIn(150).css("display", "flex");
        return null;
    }
}

function initSocket() {
    socket = io("/participant", {
        path: "/api/socket",
        query: {room: participant.roomId, participantId: participant.id},
        reconnection: true
    });
    socket.on("connect", async function () {
        console.log("Connected to server");
        const lastStatus = await getLastStatus();
        if (lastStatus) {
            await setStatus(lastStatus);
        } else {
            $(".app-section").hide();
            $("#home-section").fadeIn(150).css("display", "flex");
        }
    });
    socket.on("status:set", setStatus);
    socket.on("status:reset", function () {
        appStatus.bVoted = false;
        appStatus.currentVotingSessionId = null;
        appStatus.iTimerSeconds = 0;
        $(".app-section").not("#home-section").hide();
        $("#home-section").fadeIn(150).css("display", "flex");
    });
    socket.on("disconnect", function () {
        console.log("Disconnected from server");
    });
}

function resetSocket() {
    if (socket) {
        socket.disconnect();
    }
}

async function getLastStatus() {
    const room = participant.roomId ? participant.roomId : "all";
    const response = await axios.get(`/api/status/${room}`);
    return response.data;
}

async function setStatus(status) {
    if (status.iTimerSeconds) {
        appStatus.iTimerSeconds = status.iTimerSeconds;
    } else {
        if (status.currentQuestion) {
            appStatus.iTimerSeconds = status.currentQuestion.iTimerSeconds;
        }
    }
    if (status.currentVotingSessionId) {
        appStatus.currentVotingSessionId = status.currentVotingSessionId;
    }

    switch (status.sActiveCommandParticipant) {
        case "Cover":
        case "Final Ranking Teams":
            $(".app-section").not("#home-section").hide();
            $("#home-section").fadeIn(150).css("display", "flex");
            break;
        case "Question":
            appStatus.bVoted = false;
            $(".app-section").not("#question-section").hide();
            await loadQuestion(status.currentQuestion, false);
            loadTeamScores();
            $("#question-section").fadeIn(150).css("display", "flex");
            resetTimer(false);
            break;
        case "Start Session":
            appStatus.bVoted = false;
            $(".app-section").not("#question-section").hide();
            await loadQuestion(status.currentQuestion, true);
            loadTeamScores();
            $("#question-section").fadeIn(150).css("display", "flex");
            resetTimer(false);
            startTimer(status.dtmCreated);
            break;
        case "Stop Session":
            $(".app-section").not("#question-section").hide();
            await loadQuestion(status.currentQuestion, false);
            loadTeamScores();
            $("#question-section").fadeIn(150).css("display", "flex");
            stopTimer();
            resetTimer(true);
            break;
        case "Correct Answer":
            $(".app-section").not("#question-section").hide();
            await loadQuestion(status.currentQuestion, false);
            loadTeamScores();
            $("#question-section").fadeIn(150).css("display", "flex");
            stopTimer();
            $("#question-section").addClass("correct-answers");
            break;
        case "Team Results":
            $(".app-section").not("#question-section").hide();
            await loadQuestion(status.currentQuestion, false);
            loadTeamScores(status.currentVotingSession.votingSessionTeamResult);
            $("#question-section").fadeIn(150).css("display", "flex");
            stopTimer();
            $("#question-section").addClass("correct-answers");
            break;
        case "Team Points":
            $(".app-section").not("#question-section").hide();
            await loadQuestion(status.currentQuestion, false);
            loadTeamScores(status.currentVotingSession.votingSessionTeamResult, true);
            $("#question-section").fadeIn(150).css("display", "flex");
            $("#question-section").addClass("correct-answers");
            break;
        case "Survey":
            $(".app-section").not("#survey-section").hide();
            $("#survey-link").prop("href", status.sSurveyLink);
            $("#survey-section").fadeIn(150).css("display", "flex");
    }
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
    });
}

function resetTimer(isFinished) {
    globalTimer.stop();
    $(".timer-box").removeClass("finished");
    $(".timer-box .minutes").text(isFinished ? "00" : addZeroBefore(Math.floor(appStatus.iTimerSeconds / 60)));
    $(".timer-box .seconds").text(isFinished ? "00" : addZeroBefore(appStatus.iTimerSeconds % 60));
    $(".timer-box").show();
}

function startTimer(dtmCreated) {
    let dtmNow = new Date();
    let dtmNowUTC = new Date(dtmNow.getTime());
    const dtmCreatedDate = new Date(dtmCreated);
    const diff = Math.floor((dtmNowUTC - dtmCreatedDate) / 1000);
    let timerSeconds = appStatus.iTimerSeconds - diff;
    if (timerSeconds > 0) {
        globalTimer.start({
            countdown: true,
            startValues: {
                minutes: Math.floor(timerSeconds / 60),
                seconds: timerSeconds % 60
            }
        });
    } else {
        resetTimer(true);
    }
}


function stopTimer() {
    globalTimer.pause();
    $(".timer-box").removeClass("finished");
}

async function loadQuestion(question, bVoteEnabled) {
    $("#question-section").removeClass("correct-answers");

    if (question.iFrontEndOrder === 0) {
        $("#question-section .question-text-number").text("TEST QUESTION");
    } else {
        $("#question-section .question-text-number").text(`QUESTION ${question.iFrontEndOrder}`);
        $("#question-section .question-text-number").attr("area", question.sSessionNotes);
    }
    $("#question-section .question-text").html(question.sText);
    if (!appStatus.bVoted) {
        const answers = question.answers;
        let answersHtml = "";
        for (const answer of answers) {
            answersHtml += `
                <div class="answer-choice ${answer.sAdditionalClasses ? answer.sAdditionalClasses : ""}" bCorrect="${answer.bCorrect}" answerId="${answer.id}">
                    <div class="answer-choice-inner">
                        <p class="answer-letter">${answer.sLetter}</p>
                        <div class="answer-text-box">
                            <p>${answer.sText}</p>
                        </div>
                    </div>
                </div>`;
        }
        $("#question-section .answer-box-container").html(answersHtml);
        if (bVoteEnabled) {
            $(".answer-choice").click(function () {
                if (appStatus.bVoted) {
                    return;
                }
                $(".answer-choice").removeClass("selected");
                $(this).addClass("selected");
                $("#btn-vote").removeClass("disabled");
                // scroll .qa-container to bottom
                $(".qa-container").animate({scrollTop: $(".qa-container").prop("scrollHeight")}, 150);
            });
        } else {
            $("#btn-vote").addClass("disabled");
        }
    } else {

    }
}

function loadTeamScores(teamResult = undefined, showPoints = false) {
    /*
    $("#container-team-scores").empty();

    teams.forEach((team, index) => {
        const isCentered = (index === 1 || index === 4) ? "center" : "";
        const isFirstLine = index < 3 ? "first-line" : "last-line";
        const teamResultIndex = teamResult && teamResult.length ? teamResult.findIndex((tr) => tr.teamId === team.id) : -1;
        const percentage = teamResult && teamResult.length ? teamResult[teamResultIndex].percentage.toFixed(2) : "0.00";

        $("#container-team-scores").append(
            `
            <div class="box-team-score ${isCentered} ${isFirstLine} ${team.id === participant.teamId ? "current-team": ""}">
                <p class="team-title">
                    Team
                </p>
                <p class="team-name">
                    ${team.sName}
                </p>
                <p class="team-score">
                    ${showPoints && teamResult && teamResult.length ? teamResult[teamResultIndex].iScore : 0}
                </p>
                <div class="container-correct-answers" style="display: ${teamResult ? "block" : "none"}">
                    <p class="team-percentage">
                        CORRECT ANSWER
                    </p>
                    <div class="correct-answers-percentage">
                        <div style="width: ${percentage}%">
                            <p>${percentage}%</p>
                        </div>
                    </div>
                </div>
            </div>
            `
        );
    });

     */
}


