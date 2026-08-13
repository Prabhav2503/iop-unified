/** @type {import('tailwindcss').Config} */

// ─── eDC IOP design tokens — DARK (primary and only mode) ───────────────────
//
// Accent ramp is the eDC public brand violet (edciitd.com), anchored on their
// #3B2486 / #2D1B69 — both hsl(254°, ~58%).
//
// TWO interactive values, because one cannot do both jobs. The maths:
//   white text on a fill needs      luminance ≤ 0.1833
//   accent text on our surface needs luminance ≥ 0.2146
// Those ranges do not overlap, so a single token is forced to be either a
// confident button fill or readable body-level text — never both.
//
//   accent-500 #6D4AE8 → BUTTON FILL, white label
//        hsl(253°, 77%, 60%): the brand's own hue, pushed from 58% to 77%
//        saturation so it reads vivid rather than pastel.
//        white text 5.53:1 · shape vs canvas 3.62:1 · vs surface 3.23:1
//   accent-400 #7655EB → the fill's hover. Brightens (so it feels responsive)
//        while still holding white text at 4.92:1.
//   accent-300 #AC94F4 → TEXT: links, active nav, chip labels, progress fill.
//        on surface 7.06 · canvas 7.91 · raised 6.32 · accent-soft 6.18 ·
//        muted 5.62 — AA everywhere.
//
// Earlier attempts, for the record: #B794F4 read too pink (hue 262°), and
// #A082E1 too washed out (saturation dropped to 61%). Fixing it meant holding
// the hue at the brand's 254° and raising saturation, not shifting lightness.
//
// The darker steps (600–950) are retained so a future light mode reuses this
// same ramp rather than needing a second palette.

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'Inter', 'ui-sans-serif', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },

      colors: {
        accent: {
          50: '#F4F1FE',
          100: '#E5DEFC',
          200: '#CBBCF9',
          300: '#AC94F4', // TEXT: links, active nav, chip labels, progress
          400: '#7655EB', // hover for the primary fill (white text 4.92:1)
          500: '#6D4AE8', // PRIMARY FILL: buttons, active pills (white label)
          600: '#5A3AC9',
          700: '#4A2FA6',
          800: '#3B2486', // eDC
          900: '#2D1B69', // eDC
          950: '#1E1147',
          soft: '#261D44', // tinted fill: icon chips, active nav, active chips
          line: '#3D2E70', // border for those fills
        },

        // Elevation ladder. Near-black canvas; each step up is ~5.5 L*, which
        // is roughly 2x Spotify's #121212 → #181818 step, so panels visibly
        // float rather than blending into the background.
        //   canvas  L* 2.2  ── the page
        //   surface L* 7.9  ── cards, panels, sidebar
        //   raised  L* 13.0 ── modals, dropdowns, active segments
        //   muted   L* 17.4 ── hover fills, progress track
        canvas: '#08080A',
        surface: '#17171C',
        raised: '#212128',
        muted: '#2A2A33',

        ink: {
          DEFAULT: '#EDEBF5', // 15.1:1 on surface
          muted: '#A9A4BE', //  7.4:1
          faint: '#8A85A0', //  5.1:1 — still AA at 12px
        },

        line: {
          DEFAULT: '#2E2E38',
          subtle: '#232329',
        },

        // Status — warn = needs a human, danger = wrong or late. Nothing else.
        warn: {
          DEFAULT: '#FBBF24',
          soft: '#33260D',
          border: '#5C4415',
          ink: '#FCD34D', // 10.2:1 on warn.soft
        },
        danger: {
          DEFAULT: '#F87171',
          soft: '#3A1618',
          border: '#6B2427',
          ink: '#FCA5A5', // 8.5:1 on danger.soft
        },
      },

      // Six steps, each nudged up 1–2px from the original scale. Body sits at
      // 14px and carries weight 500 (set on <body> in index.css) — on a dark
      // canvas, 400-weight text reads thinner than it measures because light
      // text haloes against dark, so 500 is the honest equivalent of 400 here.
      fontSize: {
        micro: ['12px', { lineHeight: '18px', letterSpacing: '0.01em' }],
        meta: ['13px', { lineHeight: '19px' }],
        body: ['14px', { lineHeight: '21px' }],
        section: ['16px', { lineHeight: '24px', letterSpacing: '-0.01em' }],
        title: ['22px', { lineHeight: '28px', letterSpacing: '-0.02em' }],
        stat: ['30px', { lineHeight: '34px', letterSpacing: '-0.02em' }],
      },

      borderRadius: {
        control: '8px', // buttons, inputs, segments
        chip: '10px', // tinted icon squares
        surface: '12px', // cards, panels, modals
      },

      boxShadow: {
        // Seats a surface on the near-black canvas.
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.5)',
        // Things that genuinely float.
        overlay:
          '0 24px 48px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.04)',
        // Reserved for the single primary action per view. Nowhere else.
        glow: '0 4px 16px -4px rgba(109, 74, 232, 0.45)',
      },

      // ── Motion ────────────────────────────────────────────────────────────
      //
      // The whole system is 100–200ms. Nothing here should ever be something
      // you wait for — motion exists to show where a thing came from, then get
      // out of the way. Rules:
      //   • Distances are tiny (4–8px) and scales are shallow (0.98). A change
      //     you can point at is already too big.
      //   • No overshoot, no bounce, no spring. `ease-exit` is a plain
      //     decelerate curve, so things settle rather than wobble.
      //   • Exits are faster than entrances — dismissing should feel instant,
      //     arriving can afford a beat.
      // prefers-reduced-motion collapses all of it to ~0ms in index.css.
      transitionTimingFunction: {
        exit: 'cubic-bezier(0.25, 1, 0.5, 1)', // fast out, gentle settle
      },

      // Every entrance ends at `transform: none`, never at the equivalent
      // `translateY(0)`. These all run with fill-mode `both`, so the final
      // keyframe's value sticks — and an element holding ANY transform value,
      // identity included, becomes the containing block for `position: fixed`
      // descendants. A page wrapper left at translateY(0) is enough to turn
      // every modal inside it into an absolutely-positioned box in the content
      // column. `none` is the one endpoint that establishes nothing.
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        // Content arriving: pages, list items, expanded card bodies.
        'rise-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'none' },
        },
        // Dropdowns: grow down out of the trigger they belong to.
        'pop-in': {
          from: { opacity: '0', transform: 'translateY(-4px) scale(0.98)' },
          to: { opacity: '1', transform: 'none' },
        },
        'pop-out': {
          from: { opacity: '1', transform: 'none' },
          to: { opacity: '0', transform: 'translateY(-4px) scale(0.98)' },
        },
        // Modals: a little more travel, since they interrupt.
        'modal-in': {
          from: { opacity: '0', transform: 'translateY(8px) scale(0.98)' },
          to: { opacity: '1', transform: 'none' },
        },
      },

      animation: {
        'fade-in': 'fade-in 140ms ease-out both',
        'rise-in': 'rise-in 200ms cubic-bezier(0.25, 1, 0.5, 1) both',
        'pop-in': 'pop-in 130ms cubic-bezier(0.25, 1, 0.5, 1) both',
        'pop-out': 'pop-out 100ms ease-in both',
        'modal-in': 'modal-in 180ms cubic-bezier(0.25, 1, 0.5, 1) both',
      },
    },
  },
  plugins: [],
}
