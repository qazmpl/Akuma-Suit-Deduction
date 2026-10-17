import { useState } from 'react';
import { motion } from 'framer-motion';
import { useSceneTimer } from '@/lib/video';

const seats = ['A1', 'B1', 'A2', 'B2'];
const suits = [
  { key: 'spades', glyph: '♠', color: '#d8d5cd' },
  { key: 'hearts', glyph: '♥', color: '#b84c40' },
  { key: 'diamonds', glyph: '♦', color: '#d7b777' },
  { key: 'clubs', glyph: '♣', color: '#93aaa0' },
  { key: 'demon', glyph: '✦', color: '#c4675b' },
];
const EASE = [0.22, 1, 0.36, 1] as const;

export function Scene4() {
  const [active, setActive] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [crossed, setCrossed] = useState(false);
  useSceneTimer([
    { time: 530, callback: () => setActive(1) },
    { time: 760, callback: () => setActive(2) },
    { time: 980, callback: () => setActive(3) },
    { time: 1270, callback: () => setActive(0) },
    { time: 1660, callback: () => setRevealed(true) },
    { time: 3390, callback: () => setCrossed(true) },
  ]);
  return (
    <motion.section className="film-scene"
      initial={{ opacity: 0, x: '-3%', scale: .98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05, filter: 'blur(5px)', transition: { duration: .42 } }}
      transition={{ duration: .45, ease: EASE }}>
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 48% 45%, #202723 0%, #111513 68%, #0b0e0d 100%)' }} />
      <div className="absolute left-[5%] top-[8%] mono text-[1.4vmin] text-[#929a91]">TURN ORDER / CLOCKWISE</div>
      <motion.div className="absolute left-[8%] right-[8%] top-[26%] h-px bg-[#d7b777]/70"
        initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: .24, duration: .5, ease: EASE }} />
      <div className="absolute left-[8%] right-[8%] top-[20%] flex justify-between">
        {seats.map((seat, i) => (
          <motion.div key={seat} className={`relative grid h-[11vmin] w-[13vmin] place-items-center border text-[3.4vmin] mono transition-colors duration-200 ${active === i ? 'border-[#d7b777] bg-[#d7b777] text-[#171a18]' : 'border-[#707a72]/55 bg-[#171c19] text-[#a9aaa0]'}`}
            initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: .18 + i * .13, duration: .38, ease: EASE }}>
            {seat}
            {active === i && <motion.span className="absolute -bottom-[1.2vmin] left-1/2 h-[.8vmin] w-[.8vmin] -translate-x-1/2 rounded-full bg-[#d7b777]" layoutId="seat-dot" />}
          </motion.div>
        ))}
      </div>
      <motion.div className="absolute left-[8%] top-[42%] mono text-[1.32vmin] tracking-[.19em] text-[#a5a99f]"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .52 }}>A TEAM'S SHARED HAND</motion.div>
      <div className="absolute left-[8%] top-[49%] flex h-[21vmin] w-[31vmin] items-center">
        {[0, 1, 2].map((n) => (
          <motion.div key={n} className="card-back absolute h-[19vmin] w-[12vmin] rounded-[1vmin]"
            style={{ left: `${n * 23}%`, borderColor: '#d7b777' }}
            initial={{ y: 25, rotate: (n - 1) * 15, opacity: 0 }} animate={{ y: 0, rotate: (n - 1) * 8, opacity: 1 }}
            transition={{ delay: .68 + n * .14, duration: .42, ease: EASE }}>
            <span className="suit-glyph text-[5vmin] text-[#d7b777]">{n === 1 && revealed ? '♦' : '✦'}</span>
          </motion.div>
        ))}
      </div>
      <motion.div className="absolute left-[33%] top-[51%] h-[17vmin] w-[11vmin] border border-[#d7b777]/80 bg-[#eee8da] shadow-[0_1vmin_3vmin_rgba(0,0,0,.32)]"
        initial={{ y: -60, rotate: 12, opacity: 0 }} animate={revealed ? { y: -5, rotate: -4, opacity: 1 } : { y: 0, rotate: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 180, damping: 20 }}>
        <div className="absolute left-[10%] top-[7%] suit-glyph text-[2.2vmin] text-[#9c463d]">♦</div>
        <div className="grid h-full place-items-center suit-glyph text-[7vmin] text-[#9c463d]">{revealed ? '♦' : '?'}</div>
      </motion.div>
      <motion.div className="absolute left-[49%] top-[48%] flex h-[19vmin] w-[21vmin] items-center justify-center border border-dashed border-[#aab1a5]/35"
        initial={{ scale: .75, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: .83, duration: .38 }}>
        <div className="absolute inset-y-0 left-0 w-[.2vmin] bg-[#d7b777]" />
        <motion.div className="card-back h-[15vmin] w-[10vmin] rounded-[.8vmin] border-[#93aaa0]"
          initial={{ x: 0, opacity: .4 }} animate={revealed ? { x: 20, opacity: 1, rotate: 5 } : { x: 0, opacity: .4 }}
          transition={{ delay: revealed ? .18 : 0, duration: .45, ease: EASE }}>
          <span className="suit-glyph text-[4vmin] text-[#93aaa0]">♣</span>
        </motion.div>
      </motion.div>
      <motion.div className="absolute left-[8%] top-[77%] display text-[3.4vmin] text-[#eee8da]"
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.9, duration: .4 }}>
        Reveal 1–3. Draw the same number.
      </motion.div>
      <motion.div className="absolute left-[8%] top-[86%] mono text-[1.35vmin] tracking-[.14em] text-[#91988f]"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3.08, duration: .3 }}>
        WRONG SUITS CLOSE FOR EVERYONE.
      </motion.div>
      <div className="absolute right-[8%] top-[52%] flex gap-[2.1vmin]">
        {suits.map((suit, i) => (
          <motion.div key={suit.key} className="relative grid h-[8vmin] w-[7vmin] place-items-center border border-[#85897e]/40 bg-[#1a201d] suit-glyph text-[4.5vmin]"
            style={{ color: suit.color }}
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: .85 + i * .1, duration: .36 }}>
            {suit.glyph}
            {i === 1 && crossed && <motion.span className="absolute left-[-18%] top-1/2 h-[.5vmin] w-[136%] origin-left bg-[#b84c40]"
              initial={{ scaleX: 0, rotate: -24 }} animate={{ scaleX: 1, rotate: -24 }} transition={{ duration: .22 }} />}
          </motion.div>
        ))}
      </div>
      <motion.div className="absolute right-[8%] top-[69%] mono text-[1.12vmin] text-[#777f79]"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}>PUBLIC EVIDENCE</motion.div>
      <motion.div className="absolute left-0 top-[78%] h-[.45vmin] w-full origin-left bg-[#b84c40]"
        initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 4.16, duration: .7, ease: [0.7, 0, .3, 1] }} />
      <div className="grain" />
    </motion.section>
  );
}
