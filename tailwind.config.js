module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'gold-x': '#bd7f3d',
        'gold-1000': '#452E00',
        'gold-900': '#664A12',
        'gold-800': '#866523',
        'gold-700': '#A88135',
        'gold-600': '#C89D46',
        'gold-500': '#E9B857',
        'gold-400': '#EEC675',
        'gold-350': '#f5ca7a',
        'gold-300': '#F3D393',
        'gold-200': '#F8E0B1',
        'gold-100': '#FDEECF',
        'gold-80': '#FEF0D5',
        'gold-50': '#FFF4DE',
        gold: '#c19400',
        canard: '#143545',
        'canard-light': '#215772',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
