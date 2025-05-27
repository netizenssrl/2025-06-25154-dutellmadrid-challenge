/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.html", "./public/assets/css/**/*.css"],
  theme: {
    container: {
        center: true,
        padding: {
            DEFAULT: "2rem",
            sm: "0rem",
            "1920": "0rem"
        },
        screens: {
            md: "600px",
            lg: "750px",
            "1920": "1820px"
        }
    },
    extend: {
        colors: {
            primary: "#4B7DA0",
            secondary: "#84C8BB",
            dupixent: "#156082",
            copd_asthma: "#FFC000",
            copd: "#E97132",
            asthma: "#009B77",
            CRSwNP: "#92D050",
            gray: {
                text: "#575E61",
                "team-results": "#d5d4d3",
            },
            green: {
                correct: "#009978",
            },


            grey: "rgba(50, 40, 20, 0.5)",
            gold: "#ae8900",
            silver: "#757f91",
            bronze: "#9a6543",
        },
        spacing: {
            "question-element": "6.13rem",
        }
    },
  },
  plugins: [],
}

