import { motion } from 'framer-motion';

const EASE = [0.22, 1, 0.36, 1] as const;
const choices = [
  { glyph: '♠', color: '#dcd8cc' },
  { glyph: '♥', color: '#b84c40' },
  { glyph: '♦', color: '#d7b777' },
  { glyph: '♣', color: '#93aaa0' },
  { glyph: '✦', color: '#b84c40' },
];

export function Scene5() {
  return (
    <motion.section className="film-scene text-[#161a18]"
      style={{ background: '#e6dfd0' }}
      initial={{ opacity: 0, clipPath: 'inset(0 0 0 100%)' }}
      animate={{ opacity: 1, clipPath: 'inset(0 0 0 0%)' }}
      exit={{ opacity: 0, scale: .98, transition: { duration: .38 } }}
      transition={{ duration: .52, ease: EASE }}>
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 43%, #f0eadc 0%, #e1d9c9 62%, #cfc5b2 100%)' }} />
      <motion.div className="absolute left-[5%] top-[7%] mono text-[1.35vmin] tracking-[.2em] text-[#65665d]"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .18, duration: .3 }}>FINAL DEDUCTION</motion.div>
      <motion.div className="absolute left-[5%] top-[13%] display text-[6.5vmin] text-[#171a18]"
        initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .28, duration: .45, ease: EASE }}>
        GUESS THE SUIT.
      </motion.div>
      <div className="absolute left-[5%] top-[31%] flex gap-[1.1vmin]">
        {choices.map((choice, i) => (
          <motion.div key={choice.glyph} className="relative grid h-[9vmin] w-[8vmin] place-items-center border border-[#77766d]/38 bg-[#eee8da] suit-glyph text-[5vmin]"
            style={{ color: choice.color }}
            initial={{ y: -18, opacity: 0, scale: .84 }} animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ delay: .5 + i * .1, duration: .33, ease: EASE }}>
            {choice.glyph}
            {i < 2 && <motion.span className="absolute left-[-15%] top-1/2 h-[.45vmin] w-[130%] origin-left bg-[#b84c40]"
              initial={{ scaleX: 0, rotate: i ? 20 : -18 }} animate={{ scaleX: 1, rotate: i ? 20 : -18 }}
              transition={{ delay: i === 0 ? .05 : 1.12, duration: .22 }} />}
          </motion.div>
        ))}
      </div>
      <motion.div className="absolute left-[5%] top-[44%] mono text-[1.1vmin] tracking-[.13em] text-[#74756d]"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .95 }}>ELIMINATE THE IMPOSSIBLE</motion.div>
      <motion.div className="absolute left-[38%] top-[34%] z-[2] flex h-[42%] aspect-[.72] items-center justify-center border border-[#a6854c] bg-[#171c19] shadow-[0_3vmin_7vmin_rgba(46,38,28,.3)]"
        initial={{ y: 80, scale: .76, rotate: 5, opacity: 0 }}
        animate={{ y: 0, scale: 1, rotate: 0, opacity: 1 }}
        transition={{ delay: 1.28, duration: .75, type: 'spring', stiffness: 175, damping: 20 }}>
        <div className="absolute inset-[4%] border border-[#d7b777]/60" />
        <motion.div className="seal h-[60%] w-[60%]"
          initial={{ rotate: -38, scale: .35 }} animate={{ rotate: 0, scale: 1 }}
          transition={{ delay: 1.5, duration: .7, ease: EASE }}>
          <motion.span className="suit-glyph text-[13vmin] text-[#eee8da]"
            initial={{ scale: .3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 1.73, type: 'spring', stiffness: 210, damping: 18 }}>♦</motion.span>
        </motion.div>
        <span className="absolute bottom-[7%] mono text-[1vmin] tracking-[.26em] text-[#d7b777]">THE TARGET REVEALED</span>
      </motion.div>
      <motion.div className="absolute right-[6%] top-[52%] w-[25%] display text-[3.7vmin] leading-[1.02] text-[#282c28]"
        initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 2.18, duration: .45, ease: EASE }}>
        Correct guess.
        <br />
        <span className="italic text-[#9a463b]">Your team wins.</span>
      </motion.div>
      <motion.div className="absolute right-[5%] top-[70%] h-px w-[24%] origin-left bg-[#a6854c]"
        initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 2.5, duration: .42 }} />
      <motion.div className="absolute left-[20%] top-[81%] z-[4] w-[60%] text-center display text-[5.3vmin] leading-none tracking-[.015em] text-[#eee8da]"
        initial={{ opacity: 0, y: 20, letterSpacing: '.12em' }} animate={{ opacity: 1, y: 0, letterSpacing: '.015em' }}
        transition={{ delay: 3.52, duration: .62, ease: EASE }}>
        AKUMA DEDUCTION
      </motion.div>
      <motion.div className="absolute left-[20%] top-[90%] z-[4] w-[60%] text-center mono text-[1.2vmin] tracking-[.25em] text-[#d7b777]"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3.85, duration: .35 }}>
        A 2V2 HIDDEN-SUIT GAME
      </motion.div>
      <motion.div className="absolute right-[8%] top-[12%] h-[75vmin] w-[75vmin] rounded-full border-[.55vmin] border-[#c4a76c] opacity-80"
        initial={{ scale: 1 }} animate={{ scale: .36 }}
        transition={{ delay: 4.2, duration: .77, ease: [0.72, 0, .25, 1] }} />
      <motion.div className="absolute inset-x-0 bottom-0 z-[3] h-[26%] bg-[#171c19]"
        initial={{ clipPath: 'inset(100% 0 0)' }} animate={{ clipPath: 'inset(0% 0 0)' }}
        transition={{ delay: 3.05, duration: .5, ease: EASE }} />
      <div className="grain" />
    </motion.section>
  );
}
