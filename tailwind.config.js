/** @type {import('tailwindcss').Config} */
import { heroui } from "@heroui/react";
module.exports = {
    content: ["./src/**/*.{js,ts,jsx,tsx,mdx}", "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",],
    theme: {
        container: {
            center: true
        },
    },
    plugins: [heroui({
        themes: {
            light: {
                colors: {
                    primary: {
                        DEFAULT: "#4338CA",
                        foreground: "#FFFFFF",
                    },
                    warning: {
                        DEFAULT: "#FF9505",
                        foreground: "#FFFFFF"
                    },
                    danger: {
                        DEFAULT: "#d30505",
                        foreground: "#FFFFFF"
                    },
                    success: {
                        foreground: "#FFFFFF"
                    }
                },
            },
            dark: {
                colors: {
                    primary: "#6d78ff",
                    secondary: "#6F42C1",
                    warning: "#FF9505",
                    danger: "#d30505",
                    success: {
                        foreground: "#FFFFFF"
                    }
                }
            },
        },
    })],
};
