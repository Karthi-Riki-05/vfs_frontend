/** Tailwind v4 via PostCSS. Coexists with Ant Design — Tailwind preflight is
 *  intentionally NOT imported in globals.css so Ant Design styles stay intact. */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
