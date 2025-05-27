"use client";
import { useEffect, useState, useMemo } from "react";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";
import { Bar } from "react-chartjs-2";
import { useTheme } from "next-themes";

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

export default function VotingSessionChart({ participantAnswers, question, teams }) {
    const { theme } = useTheme();
    const [totalTeamVotes, setTotalTeamVotes] = useState({});

    // Memorizza labels e colori per evitare di ricrearli a ogni render
    const { labels, answersBackgroundColors } = useMemo(() => {
        const labels = [];
        const answersBackgroundColors = teams.map((team) => team.sColor);
        for (const team of teams) {
            labels.push(team.sName);
        }

        return { labels, answersBackgroundColors };
    }, [teams]);

    // Stato iniziale memorizzato
    const initialChartData = useMemo(() => ({
        labels,
        datasets: [{
            label: "Correct answers",
            data: [],
            backgroundColor: [],
        }]
    }), [labels]);

    const [chartData, setChartData] = useState(initialChartData);

    // Calcola i dati del grafico in base a `participantAnswers`
    useEffect(() => {
        if (participantAnswers) {
            const teamCounts = participantAnswers.reduce((acc, answer) => {
                const correct = answer.answer.bCorrect ? 1 : 0;
                acc[answer.participant.teamId] = {
                    totalVotes: (acc[answer.participant.teamId] ? acc[answer.participant.teamId].totalVotes : 0) + 1,
                    correct: (acc[answer.participant.teamId] ? acc[answer.participant.teamId].correct : 0) + correct,
                };
                return acc;
            }, {});

            teams.forEach(team => {
                if (!(team.id in teamCounts)) {
                    teamCounts[team.id] = { totalVotes: 0, correct: 0 };
                }
            });

            setTotalTeamVotes(teamCounts);

            const data = teams.map((team) => teamCounts[team.id] ? teamCounts[team.id].correct * 100 / teamCounts[team.id].totalVotes : 0);

            const tempChartData = {
                labels,
                datasets: [{
                    label: "Correct answers",
                    data,
                    backgroundColor: answersBackgroundColors,
                }]
            };

            // Aggiorna solo se i dati sono cambiati
            setChartData(prev => {
                const isEqual = JSON.stringify(prev) === JSON.stringify(tempChartData);
                return isEqual ? prev : tempChartData;
            });
        } else {
            setChartData(initialChartData);
        }
    }, [answersBackgroundColors, initialChartData, labels, participantAnswers, teams]);

    const options = useMemo(() => ({
        responsive: true,
        plugins: {
            title: {
                display: false
            },
            datalabels: {
                color: '#fff',
                anchor: 'center',
                offset: 20,
                font: {
                    size: 14,
                    weight: 'bold',
                },
            },
            legend: {
                display: false,
            }
        },
        scales: {
            x: {
                grid: {
                    color: theme === "light" ? "#e5e7eb" : "rgb(113, 113, 122)",
                },
                ticks: {
                    color: theme === "light" ? "#333" : "#fff",
                }
            },
            y: {
                min: 0,
                max: 100,
                grid: {
                    color: theme === "light" ? "#e5e7eb" : "rgb(113, 113, 122)",
                },
                ticks: {
                    color: theme === "light" ? "#333" : "#fff",
                }
            },
        }
    }), [theme]);

    return (
        <>
            <div className="pl-8 flex">
                {Object.keys(totalTeamVotes).map((teamId, index) => {
                    const answerCount = participantAnswers
                        ? totalTeamVotes[teamId].totalVotes
                        : 0;
                    return (
                        <div className="flex-1" key={index}>
                            <p className="text-center text-sm">{answerCount}</p>
                        </div>
                    );
                })}
            </div>
            <Bar data={chartData} options={options} className="mb-3" />
        </>
    );
}
