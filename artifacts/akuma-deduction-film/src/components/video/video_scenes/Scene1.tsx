import { motion } from 'framer-motion';

const EASE = [0.22, 1, 0.36, 1] as const;
const marks = [
  { glyph: '♠', color: '#e6e0d3' },
  { glyph: '♥', color: '#b84c40' },
  { glyph: '♦', color: '#d7b777' },
  { glyph: '♣', color: '#93aaa0' },
  { glyph: '✦', color: '#d7b777' },
];

export function Scene1() {
  return (
    <motion.section
      className="film-scene"
      initial={{ opacity: 0, clipPath: 'inset(0 0 0 8%)' }}
      animate={{ opacity: 1, clipPath: 'inset(0 0 0 0%)' }}
      exit={{ opacity: 0, scale: 1.04, filter: 'blur(5px)', transition: { duration: .45 } }}
      transition={{ duration: .55, ease: EASE }}
    >
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 74% 47%, #222623 0%, #111514 45%, #0b0e0d 100%)' }} />
      <div className="absolute left-0 top-0 h-full w-[1.4%]" style={{ background: 'linear-gradient(180deg, transparent, #b84c40 30%, #7f2d28 74%, transparent)', transform: 'rotate(17deg) scaleY(1.5)', transformOrigin: 'center' }} />
      <motion.div className="absolute left-[4.5%] top-[8%] mono text-[1.55vmin] text-[#a9aaa0]"
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .18, duration: .35 }}>
        A 2V2 SUIT-DEDUCTION GAME
      </motion.div>
      <motion.div className="absolute left-[4.5%] top-[18%] z-[2] display leading-[.79] text-[10.3vmin] text-[#eee8da]"
        initial={{ opacity: 0, x: -35, filter: 'blur(8px)' }} animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }} transition={{ delay: .38, duration: .55, ease: EASE }}>
        <div>FIVE</div>
        <div className="ml-[.35em] italic text-[#d7b777]">SUITS.</div>
      </motion.div>
      <motion.div className="absolute left-[5%] top-[66%] mono text-[1.5vmin] text-[#a9aaa0]"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.9, duration: .3 }}>
        THE TARGET IS HIDDEN.
      </motion.div>
      <motion.div className="absolute left-[4.5%] top-[49%] flex items-center gap-[1.1vmin] text-[3.8vmin]"
        initial={{ opacity: 0, y: 9 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1, duration: .35 }}>
        {marks.map((mark, i) => (
          <motion.span key={mark.glyph} className="suit-glyph" style={{ color: mark.color }}
            initial={{ scale: 0, rotate: -24 }} animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 1.22 + i * .1, type: 'spring', stiffness: 280, damping: 17 }}>
            {mark.glyph}
          </motion.span>
        ))}
      </motion.div>
      <motion.div className="absolute right-[7%] top-[7%] h-[85%] w-[42%] card-back"
        style={{ transformOrigin: '50% 50%' }}
        initial={{ scale: 1.42, rotate: -8, x: 55, filter: 'blur(8px)' }}
        animate={{ scale: 1, rotate: -5, x: 0, filter: 'blur(0px)' }}
        transition={{ type: 'spring', stiffness: 260, damping: 24, delay: .06 }}>
        <motion.div className="seal">
          <span className="display text-[17vmin] leading-none text-[#eee8da]">?</span>
        </motion.div>
        <motion.div className="absolute inset-[10%] rounded-[50%] border border-[#b84c40]/70"
          initial={{ scale: .25, opacity: 0 }} animate={{ scale: 1.14, opacity: [.0, .9, .48] }}
          transition={{ delay: 1.45, duration: .72, ease: EASE }} />
        <span className="absolute bottom-[9%] mono text-[1.35vmin] tracking-[.3em] text-[#d7b777]">TARGET / UNKNOWN</span>
      </motion.div>
      <motion.div className="absolute left-[3%] bottom-[11%] display text-[4.4vmin] italic text-transparent"
        style={{ WebkitTextStroke: '.13vmin rgba(215,183,119,.45)' }}
        initial={{ opacity: 0, x: -16 }} animate={{ opacity: .7, x: 0 }} transition={{ delay: .22, duration: .45 }}>
        AKUMA
      </motion.div>
      <motion.div className="absolute inset-y-0 right-0 w-[25%] pointer-events-none"
        initial={{ x: '100%' }} animate={{ x: '-160%' }} transition={{ delay: 3.18, duration: .72, ease: [0.7, 0, .3, 1] }}
        style={{ background: 'linear-gradient(90deg, transparent, rgba(184,76,64,.48), transparent)', transform: 'skewX(-18deg)' }} />
      <div className="grain" />
    </motion.section>
  );
}
