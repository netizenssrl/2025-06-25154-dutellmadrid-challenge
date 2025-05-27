"use client";

// import hooks
import { useEffect, useState } from "react";

// import nextui components
import { Button, Input, Switch } from "@heroui/react";

// import custom ui components
import VotingSessionsTable from "./VotingSessionsTable";
import VotingSessionChart from "./VotingSessionChart";

// import store
import { useStatusStore } from "@/stores/status";
import { useRoomStore } from "@/stores/room";
import { useVotingSessionStore } from "@/stores/votingSession";

// import action
import { setStatus } from "@/actions/status";
import {
    startVotingSession,
    stopVotingSession,
    setTeamsPoints,
    setRoomsPoints,
    setTeamResults
} from "@/actions/votingsession";

import { AVAILABLE_COMMANDS } from "@/libs/socket";

export default function DashboardSingleQuestion({ question, selectedTargets, teams }) {
    const status = useStatusStore((state) => state.status);
    const currentRoomId = useRoomStore((state) => state.currentRoomId);
    const votingSessions = useVotingSessionStore((state) => state.votingSessions);
    const getVotingSessionsByQuestionId = useVotingSessionStore((state) => state.getVotingSessionsByQuestionId);

    const [filteredVotingSessions, setFilteredVotingSessions] = useState([]);
    const [selectedVotingSessionKeys, setSelectedVotingSessionKeys] = useState(new Set([]));
    const [participantAnswers, setParticipantAnswers] = useState([]);

    const [timerSeconds, setTimerSeconds] = useState(question.iTimerSeconds);
    const [score, setScore] = useState(question.iScore);

    const [bFakeResults, setFakeResults] = useState(false);

    const [fakeTeamResult, setFakeTeamResult] = useState([]);

    useEffect(() => {
        const tempFilteredVotingSessions = getVotingSessionsByQuestionId(question.id);
        setFilteredVotingSessions(tempFilteredVotingSessions);
        if(tempFilteredVotingSessions && tempFilteredVotingSessions.length > 0){
            setSelectedVotingSessionKeys(new Set([tempFilteredVotingSessions[0].id.toString()]));
        }
        else{
            setSelectedVotingSessionKeys(new Set([]));
        }
    }, [votingSessions, question.id, getVotingSessionsByQuestionId]);

    useEffect(() => {
        const selectedVotingSessionId = parseInt(Array.from(selectedVotingSessionKeys)[0]);
        const tempParticipantAnswers = filteredVotingSessions.find(votingSession => votingSession.id === selectedVotingSessionId)?.participantAnswers;
        const bFakeResults = filteredVotingSessions.find(votingSession => votingSession.id === selectedVotingSessionId)?.bFakeResults;
        if(bFakeResults !== undefined){
            setFakeResults(bFakeResults);
        }
        setParticipantAnswers(tempParticipantAnswers);
    }, [filteredVotingSessions, selectedVotingSessionKeys]);

    useEffect(() => {
        const selectedVotingSessionId = parseInt(Array.from(selectedVotingSessionKeys)[0]);
        const selectedVotingSessionTeamResult = filteredVotingSessions.find(votingSession => votingSession.id === selectedVotingSessionId)?.votingSessionTeamResult || [];
        if(bFakeResults){
            const initialFakeTeamResult = teams.map(team => ({
                teamId: team.id, 
                percentage: selectedVotingSessionTeamResult.find(result => result.teamId === team.id)?.percentage || 0 })
            );
            setFakeTeamResult(initialFakeTeamResult);
        }
        else{
            setFakeTeamResult([]);
        }
    }, [bFakeResults]);

    const handleFakePercentageChange = (teamId, value) => {
        if(fakeTeamResult.length){
            const tempFakeTeamResult = [...fakeTeamResult];
            const index = tempFakeTeamResult.findIndex(result => result.teamId === teamId);
            tempFakeTeamResult[index].percentage = parseInt(value);
            setFakeTeamResult(tempFakeTeamResult);
        }
        
    };
    const handlePressBtn = async (command) => {
        const data = { ...status };
        const selectedVotingSessionId = parseInt(Array.from(selectedVotingSessionKeys)[0]);
        data.currentQuestionId = question.id;
        data.iScore = null;
        data.iTimerSeconds = null;
        if(parseInt(score) !== question.iScore){
            data.iScore = parseInt(score);
        }
        if(parseInt(timerSeconds) !== question.iTimerSeconds){
            data.iTimerSeconds = parseInt(timerSeconds);
        }
        if (selectedTargets.has("participant")) data.sActiveCommandParticipant = command;
        if (selectedTargets.has("screen")) data.sActiveCommandScreen = command;
        switch (command) {
            case AVAILABLE_COMMANDS.START_SESSION:
                const startedVotingSession = await startVotingSession(question.id, bFakeResults, currentRoomId);
                data.currentVotingSessionId = startedVotingSession.id;
            break;
            case AVAILABLE_COMMANDS.STOP_SESSION:
                await stopVotingSession(selectedVotingSessionId, bFakeResults, currentRoomId);
            break;
            case AVAILABLE_COMMANDS.CORRECT_ANSWER:
                data.currentVotingSessionId = selectedVotingSessionId;
            break;
            case AVAILABLE_COMMANDS.TEAM_RESULTS:
                data.currentVotingSessionId = selectedVotingSessionId;
                console.log("fakeTeamResult", fakeTeamResult);
                await setTeamResults(selectedVotingSessionId, fakeTeamResult);
            break;
            case AVAILABLE_COMMANDS.ROOM_RESULTS:
                data.currentVotingSessionId = selectedVotingSessionId;
            break;
            case AVAILABLE_COMMANDS.TEAM_POINTS:
                await setTeamsPoints(selectedVotingSessionId, parseInt(score));
            break;
            case AVAILABLE_COMMANDS.ROOM_POINTS:
                await setRoomsPoints(selectedVotingSessionId, parseInt(score));
            break;
        }

       await setStatus(data, Array.from(selectedTargets), currentRoomId);
    };
    return (
        <div className="">
            <div className="flex mb-5 items-center">
                <div className="w-5/12">
                    <p className="mb-2">{question.sText}</p>
                    {
                        question.answers.find(answer => answer.bCorrect) && (
                            <p className="text-success font-bold">CORRECT ANSWER: {question.answers.find(answer => answer.bCorrect).sLetter} </p>
                        )
                    }
                </div>
                <div className="w-7/12 flex gap-4 justify-end">
                    <Button
                        color={selectedVotingSessionKeys.size === 0 ? "default": "primary"}
                        className="btn-question"
                        onPress={() => handlePressBtn(AVAILABLE_COMMANDS.CORRECT_ANSWER)}
                        isDisabled={selectedVotingSessionKeys.size === 0}
                    >
                        Correct Answer
                    </Button>
                    {
                        !currentRoomId && (
                            <>
                                 <Button
                                    color={selectedVotingSessionKeys.size === 0 ? "default": "primary"}
                                    className="btn-question"
                                    onPress={() => handlePressBtn(AVAILABLE_COMMANDS.TEAM_RESULTS)}
                                    isDisabled={selectedVotingSessionKeys.size === 0}
                                >
                                    Team Results
                                </Button>

                            </>

                        )
                    }
                   {/*  <Button
                        color={selectedVotingSessionKeys.size === 0 ? "default": "primary"}
                        className="btn-question"
                        onPress={() => handlePressBtn(AVAILABLE_COMMANDS.ROOM_RESULTS)}
                        isDisabled={selectedVotingSessionKeys.size === 0}
                    >
                        Room Results
                    </Button> */}
                    <Button
                        color={selectedVotingSessionKeys.size === 0 ? "default": "primary"}
                        className="btn-question"
                        onPress={() => handlePressBtn(AVAILABLE_COMMANDS.TEAM_POINTS)}
                        isDisabled={selectedVotingSessionKeys.size === 0}
                    >
                        Team points
                    </Button>
                    {/* <Button
                        color={selectedVotingSessionKeys.size === 0 ? "default": "primary"}
                        className="btn-question"
                        onPress={() => handlePressBtn(AVAILABLE_COMMANDS.ROOM_POINTS)}
                        isDisabled={selectedVotingSessionKeys.size === 0}
                    >
                        Room points
                    </Button> */}
                </div>
            </div>
            <div className="flex gap-8 mb-4">
                <div className="w-5/12">
                    <div className="flex gap-4 mb-8">
                        <Input label="Timer (seconds)" type="number" value={timerSeconds} onValueChange={setTimerSeconds} size="sm" className="flex-1" />
                        <Input label="Score" type="number" value={score} onValueChange={setScore} size="sm" className="flex-1" />
                        <Switch isSelected={bFakeResults} onValueChange={setFakeResults} size="sm">
                            Fake Results
                        </Switch>
                    </div>
                    <div className="flex gap-8 mb-8">
                        <Button color="primary" className="btn-question flex-1" onPress={() => handlePressBtn(AVAILABLE_COMMANDS.QUESTION)}>Show</Button>
                        <Button color="success" className="btn-question flex-1" onPress={() => handlePressBtn(AVAILABLE_COMMANDS.START_SESSION)}>Start</Button>
                        <Button
                            color={selectedVotingSessionKeys.size === 0 ? "default": "danger"}
                            className="btn-question flex-1"
                            onPress={() => handlePressBtn(AVAILABLE_COMMANDS.STOP_SESSION)}
                            isDisabled={selectedVotingSessionKeys.size === 0}
                        >
                            Stop
                        </Button>
                    </div>
                    <div className="mb-4">
                        <p className="font-semibold text-center">Voting Sessions</p>
                        <VotingSessionsTable votingSessions={filteredVotingSessions} selectedVotingSessionKeys={selectedVotingSessionKeys} setSelectedVotingSessionKeys={setSelectedVotingSessionKeys} />
                    </div>
                </div>
                <div className="w-7/12">
                    <VotingSessionChart participantAnswers={participantAnswers} question={question} teams={teams}/>
                    {
                        bFakeResults && (
                            <div className="pl-10 flex gap-4">
                                {
                                    teams.map((team, index) => {
                                        const percentage = (fakeTeamResult.length && fakeTeamResult.find(result => result.teamId === team.id).percentage) || 0;
                                        return (
                                            <Input 
                                                key={index} 
                                                value={percentage}
                                                onValueChange={(value) => handleFakePercentageChange(team.id, value)}
                                                type="number" size="md" className="flex-1" 
                                                classNames={{input: "text-center no-arrow-field"}} 
                                                min={0} max={100} 
                                            />
                                        )
                                    })
                                }
                            </div>
                        )
                    }
                </div>
            </div>
        </div>
    );
}
