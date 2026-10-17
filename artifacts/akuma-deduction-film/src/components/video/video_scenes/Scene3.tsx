import { motion } from 'framer-motion';

const EASE = [0.22, 1, 0.36, 1] as const;
const suits = [
  { id: 'spades', symbol: '♠', color: '#303532' },
  { id: 'hearts', symbol: '♥', color: '#b84c40' },
  { id: 'diamonds', symbol: '♦', color: '#b3914c' },
  { id: 'clubs', symbol: '♣', color: '#567565' },
  { id: 'demon', symbol: '✦', color: '#7e3630' },
];

export function Scene3() {
  return (
    <motion.section className="film-scene text-[#171a18]"
      style={{ background: '#d9d1c0' }}
      initial={{ opacity: 0, clipPath: 'polygon(0 0,100% 0,100% 94%,0 100%)', scale: 1.05 }}
      animate={{ opacity: 1, clipPath: 'polygon(0 0,100% 0,100% 100%,0 100%)', scale: 1 }}
      exit={{ opacity: 0, scale: 1.07, filter: 'blur(5px)', transition: { duration: .42 } }}
      transition={{ duration: .55, ease: EASE }}>
      <div className="absolute inset-0" style={{ background: 'linear-gradient(112deg,#e9e2d2 0%,#d6cebd 53%,#bfb7a6 100%)' }} />
      <div className="absolute left-[5%] top-[8%] mono text-[1.45vmin] tracking-[.2em] text-[#62665f]">THE 15-CARD DECK</div>
      <motion.div className="absolute left-[5%] top-[17%] display text-[21vmin] leading-[.72] tracking-[-.06em] text-[#171a18]"
        initial={{ scale: 1.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: .24, duration: .52, ease: EASE }}>15</motion.div>
      <motion.div className="absolute left-[7%] top-[44%] mono text-[1.7vmin] tracking-[.24em] text-[#62665f]"
        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .52, duration: .36 }}>CARDS / FIVE SUITS</motion.div>
      <div className="absolute left-[31%] right-[5%] top-[15%] grid grid-cols-5 gap-[1.2vmin]">
        {suits.map((suit, i) => (
          <div key={suit.id} className="relative flex flex-col items-center">
            <div className="relative h-[23vmin] w-full">
              {[0, 1, 2].map((layer) => (
                <motion.div key={layer} className="absolute bottom-0 left-[8%] flex h-[76%] w-[84%] items-center justify-center border border-[#6e6a60]/55 bg-[#e8e1d1] shadow-[0_1vmin_1.6vmin_rgba(40,36,29,.15)]"
                  style={{ transformOrigin: 'center bottom' }}
                  initial={{ y: -70 - layer * 10, rotate: (layer - 1) * 12, opacity: 0 }}
                  animate={{ y: (2 - layer) * -.8 + 'vmin', rotate: (layer - 1) * 2.5, opacity: 1 }}
                  transition={{ delay: .25 + i * .09 + layer * .07, duration: .45, ease: EASE }}>
                  {layer === 2 && <span className="suit-glyph text-[6.3vmin]" style={{ color: suit.color }}>{suit.symbol}</span>}
                </motion.div>
              ))}
            </div>
            <div className="mono mt-[1vmin] text-[1.15vmin] text-[#444841]">{suit.id}</div>
            <div className="mono mt-[.35vmin] text-[1vmin] tracking-[.16em] text-[#77786e]">3 EACH</div>
          </div>
        ))}
      </div>
      <motion.div className="absolute left-[37%] top-[65%] h-[27%] w-[17%] border border-[#a8443b] bg-[#151a18] shadow-[0_1.5vmin_3vmin_rgba(0,0,0,.3)]"
        initial={{ y: -160, rotate: -14, opacity: 0 }} animate={{ y: 0, rotate: -3, opacity: 1 }}
        transition={{ delay: 1.55, duration: .72, type: 'spring', stiffness: 180, damping: 18 }}>
        <div className="absolute inset-[5%] grid place-items-center border border-[#d7b777]/50">
          <span className="display text-[5vmin] italic text-[#eee8da]">?</span>
          <span className="absolute bottom-[8%] mono text-[.9vmin] tracking-[.22em] text-[#d7b777]">RANDOM TARGET</span>
        </div>
      </motion.div>
      <motion.div className="absolute left-[59%] top-[66%] flex gap-[.7vmin]"
        initial={{ x: 80, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 2.45, duration: .45, ease: EASE }}>
        {[0, 1, 2, 3, 4, 5].map((card) => (
          <motion.div key={card} className="card-back h-[14vmin] w-[8vmin] rounded-[.7vmin]"
            style={{ borderColor: card < 3 ? '#d7b777' : '#93aaa0', transform: `rotate(${(card - 2.5) * 3}deg)` }}
            initial={{ y: -45, scale: .6 }} animate={{ y: 0, scale: 1 }} transition={{ delay: 2.5 + card * .09, type: 'spring', stiffness: 240, damping: 20 }} />
        ))}
      </motion.div>
      <motion.div className="absolute left-[59%] top-[84%] mono text-[1.25vmin] tracking-[.15em] text-[#41463f]"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3.28, duration: .3 }}>3 SHARED EACH</motion.div>
      <motion.div className="absolute right-[5%] top-[65%] flex h-[19vmin] w-[16vmin] items-center justify-center"
        initial={{ x: 90, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 3.45, duration: .45, ease: EASE }}>
        <div className="absolute inset-x-[4%] bottom-[9%] h-[65%] border border-[#64665f] bg-[#c6bfae] shadow-[0_1vmin_1vmin_rgba(50,40,30,.12)]" />
        <div className="absolute inset-x-[7%] bottom-[14%] h-[65%] border border-[#64665f] bg-[#d1c9b8] shadow-[0_1vmin_1vmin_rgba(50,40,30,.12)]" />
        <div className="absolute inset-x-[10%] bottom-[19%] h-[65%] border border-[#64665f] bg-[#eee8da] shadow-[0_1vmin_1vmin_rgba(50,40,30,.12)]" />
        <motion.span className="absolute bottom-[30%] display text-[10vmin] text-[#171a18]"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3.8 }}>8</motion.span>
      </motion.div>
      <motion.div className="absolute right-[4.5%] top-[87%] mono text-[1.1vmin] text-[#4d5149]"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3.9 }}>IN THE DRAW PILE</motion.div>
      <motion.div className="absolute right-[3%] top-[25%] h-[42%] w-[1.8vmin] origin-top bg-[#151a18]"
        initial={{ rotate: -38, scaleY: 0, opacity: 0 }} animate={{ rotate: -38, scaleY: 1, opacity: 1 }}
        transition={{ delay: 4.25, duration: .62, ease: EASE }} />
      <div className="absolute inset-0 opacity-[.12] mix-blend-multiply" style={{ backgroundImage: 'radial-gradient(#45433e .6px, transparent .6px)', backgroundSize: '5px 5px' }} />
      <div className="grain" />
    </motion.section>
  );
}
