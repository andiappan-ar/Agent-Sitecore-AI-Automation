/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#001a70',
        accent: '#00bfb2',
        surface: '#ffffff',
        dark: '#003341',
        'text-body': '#505557',
        link: '#008cb1',
        border: '#dbdcdb',
        'bg-light': '#f6f6f6',
      },
      fontFamily: {
        primary: ['var(--font-primary)', 'sans-serif'],
        'adnoc-sans': ["'ADNOC Sans'", 'sans-serif'],
      },
      maxWidth: {
        'container': '1400px',
      },
    },
  },
  plugins: [],
}
