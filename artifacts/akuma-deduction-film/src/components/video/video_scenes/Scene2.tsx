import { motion } from 'framer-motion';

const EASE = [0.22, 1, 0.36, 1] as const;

function SharedHand({ side }: { side: 'left' | 'right' }) {
  const tint = side === 'left' ? '#d7b777' : '#93aaa0';
  return (
    <div className="relative h-[22vmin] w-[30vmin]">
      {[0, 1, 2].map((n) => (
        <motion.div key={n} className="card-back absolute left-[18%] top-[8%] h-[82%] w-[52%] rounded-[1.3vmin]"
          style={{ borderColor: `${tint}99`, backgroundColor: '#111614' }}
          initial={{ x: side === 'left' ? -100 - n * 18 : 100 + n * 18, rotate: side === 'left' ? -20 : 20, opacity: 0 }}
          animate={{ x: (n - 1) * 5.5 + 'vmin', rotate: (n - 1) * 7, opacity: 1 }}
          transition={{ delay: .62 + n * .15, duration: .55, ease: EASE }}>
          <span className="suit-glyph text-[5vmin]" style={{ color: tint }}>✦</span>
        </motion.div>
      ))}
    </div>
  );
}

export function Scene2() {
  return (
    <motion.section className="film-scene"
      initial={{ opacity: 0, scale: 1.08, clipPath: 'inset(0 50% 0 50%)' }}
      animate={{ opacity: 1, scale: 1, clipPath: 'inset(0 0 0 0)' }}
      exit={{ opacity: 0, scale: 1.06, filter: 'blur(5px)', transition: { duration: .42 } }}
      transition={{ duration: .58, ease: EASE }}>
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 48%, #1c2521, #101412 70%)' }} />
      <div className="absolute left-[5%] top-[8%] mono text-[1.45vmin] text-[#858d86]">THE TABLE / FOUR SEATS</div>
      <motion.div className="absolute left-1/2 top-[13%] h-[74%] w-px bg-[#d7b777]/50"
        initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: .35, duration: .7, ease: EASE }} />
      <motion.div className="absolute left-[4.5%] top-[17%] display text-[6.4vmin] text-[#d7b777]"
        initial={{ opacity: 0, y: -18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .38, duration: .45 }}>
        <span className="block text-[1.5vmin] mono tracking-[.22em] text-[#a9aaa0]">TEAM</span>A
      </motion.div>
      <motion.div className="absolute right-[5%] top-[17%] text-right display text-[6.4vmin] text-[#93aaa0]"
        initial={{ opacity: 0, y: -18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .5, duration: .45 }}>
        <span className="block text-[1.5vmin] mono tracking-[.22em] text-[#a9aaa0]">TEAM</span>B
      </motion.div>
      <motion.div className="absolute left-[5%] top-[43%] flex gap-[.9vmin]"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .45 }}>
        {['A1', 'A2'].map((seat, i) => (
          <motion.div key={seat} className="grid h-[7vmin] w-[10vmin] place-items-center border border-[#d7b777]/50 bg-[#191d1a] mono text-[2vmin] text-[#d7b777]"
            initial={{ scale: .1, rotate: -12 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: .4 + i * .34, type: 'spring', stiffness: 300, damping: 20 }}>{seat}</motion.div>
        ))}
      </motion.div>
      <motion.div className="absolute right-[5%] top-[43%] flex gap-[.9vmin]"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .58 }}>
        {['B1', 'B2'].map((seat, i) => (
          <motion.div key={seat} className="grid h-[7vmin] w-[10vmin] place-items-center border border-[#93aaa0]/50 bg-[#191d1a] mono text-[2vmin] text-[#93aaa0]"
            initial={{ scale: .1, rotate: 12 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: .6 + i * .34, type: 'spring', stiffness: 300, damping: 20 }}>{seat}</motion.div>
        ))}
      </motion.div>
      <div className="absolute left-[15%] top-[62%]"><SharedHand side="left" /></div>
      <div className="absolute right-[15%] top-[62%]"><SharedHand side="right" /></div>
      <motion.div className="absolute left-1/2 top-[49%] z-[3] -translate-x-1/2 -translate-y-1/2 display whitespace-nowrap text-[4.3vmin] italic text-[#eee8da]"
        initial={{ opacity: 0, scale: .87 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.8, duration: .5, ease: EASE }}>
        A shared hand. A shared read.
      </motion.div>
      <motion.div className="absolute left-[9%] top-[50%] h-px w-[31%] origin-left bg-[#d7b777]/70"
        initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 2.55, duration: .7, ease: EASE }} />
      <motion.div className="absolute right-[9%] top-[50%] h-px w-[31%] origin-right bg-[#93aaa0]/70"
        initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 2.8, duration: .65, ease: EASE }} />
      <motion.div className="absolute inset-y-0 left-1/2 z-[10] w-[25%] pointer-events-none"
        initial={{ x: '-50%', scale: .45, rotate: -20, opacity: 0 }} animate={{ x: '185%', scale: 3.1, rotate: -28, opacity: [0, 1, 0] }}
        transition={{ delay: 4.28, duration: .7, ease: [0.7, 0, .3, 1] }}>
        <div className="card-back h-full w-full rounded-[2vmin]" />
      </motion.div>
      <div className="grain" />
    </motion.section>
  );
}
