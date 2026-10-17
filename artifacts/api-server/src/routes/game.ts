import { Router, type IRouter } from "express";
import {
  CreateGameRoomBody,
  JoinGameRoomBody,
  LeaveGameRoomBody,
  StartGameRoomBody,
  SubmitGameActionBody,
} from "@workspace/api-zod";
import { db, gameRooms } from "@workspace/db";
import { eq } from "drizzle-orm";

type Suit = "SPADES" | "HEARTS" | "DIAMONDS" | "CLUBS" | "DEMON";
type Team = "A" | "B";
type Seat = "A1" | "B1" | "A2" | "B2";
type Phase = "LOBBY" | "PLAYING" | "FINISHED";

type Card = { id: string; suit: Suit };
type Player = { id: string; name: string; team: Team; seat: Seat };
type RevealedCard = {
  id: string;
  suit: Suit;
  team: Team;
  playerName: string;
  turnNumber: number;
};
type PrivateRoom = {
  code: string;
  phase: Phase;
  hostPlayerId: string;
  players: Player[];
  target: Card | null;
  hands: Record<Team, Card[]>;
  drawPile: Card[];
  revealedCards: RevealedCard[];
  incorrectGuesses: Suit[];
  winnerTeam: Team | null;
  turnSeat: Seat | null;
  turnNumber: number;
  lastActionMessage: string | null;
  updatedAt: number;
};
type RoomView = {
  code: string;
  phase: Phase;
  hostPlayerId: string;
  players: Array<Player & { isHost: boolean }>;
  meId: string;
  myTeam: Team | null;
  hand: Card[];
  teamAHandCount: number;
  teamBHandCount: number;
  turnSeat: Seat | null;
  turnNumber: number;
  remainingDeckCount: number;
  revealedCards: RevealedCard[];
  incorrectGuesses: Suit[];
  winnerTeam: Team | null;
  targetSuit: Suit | null;
  lastActionMessage: string | null;
  updatedAt: number;
};

const router: IRouter = Router();
const SEATS: Seat[] = ["A1", "B1", "A2", "B2"];
const SUITS: Suit[] = ["SPADES", "HEARTS", "DIAMONDS", "CLUBS", "DEMON"];
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeRoomCode(): string {
  return Array.from(
    { length: 4 },
    () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)],
  ).join("");
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

function createDeck(): Card[] {
  return SUITS.flatMap((suit) =>
    [1, 2, 3].map((copy) => ({ id: `${suit}-${copy}`, suit })),
  );
}

function roomView(room: PrivateRoom, playerId: string): RoomView {
  const me = room.players.find((player) => player.id === playerId);
  const hostPlayerId = room.hostPlayerId;
  return {
    code: room.code,
    phase: room.phase,
    hostPlayerId,
    players: room.players.map((player) => ({
      ...player,
      isHost: player.id === hostPlayerId,
    })),
    meId: playerId,
    myTeam: me?.team ?? null,
    hand: me ? [...room.hands[me.team]] : [],
    teamAHandCount: room.hands.A.length,
    teamBHandCount: room.hands.B.length,
    turnSeat: room.turnSeat,
    turnNumber: room.turnNumber,
    remainingDeckCount: room.drawPile.length,
    revealedCards: [...room.revealedCards],
    incorrectGuesses: [...room.incorrectGuesses],
    winnerTeam: room.winnerTeam,
    targetSuit: room.phase === "FINISHED" ? room.target?.suit ?? null : null,
    lastActionMessage: room.lastActionMessage,
    updatedAt: room.updatedAt,
  };
}

async function getRoom(code: string | undefined): Promise<PrivateRoom | undefined> {
  if (!code) return undefined;
  const normalizedCode = code.trim().toUpperCase();
  const [row] = await db
    .select()
    .from(gameRooms)
    .where(eq(gameRooms.code, normalizedCode))
    .limit(1);
  return row ? (row.state as PrivateRoom) : undefined;
}

type RoomMutation = {
  status: number;
  body: unknown;
  persist: boolean;
  remove?: boolean;
};

async function mutateRoom(
  code: string | undefined,
  mutation: (room: PrivateRoom) => RoomMutation,
): Promise<RoomMutation | undefined> {
  if (!code) return undefined;
  const normalizedCode = code.trim().toUpperCase();
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(gameRooms)
      .where(eq(gameRooms.code, normalizedCode))
      .limit(1)
      .for("update");
    if (!row) return undefined;

    const room = row.state as PrivateRoom;
    const result = mutation(room);
    if (result.persist) {
      if (result.remove) {
        await tx.delete(gameRooms).where(eq(gameRooms.code, normalizedCode));
      } else {
        await tx
          .update(gameRooms)
          .set({ state: room })
          .where(eq(gameRooms.code, normalizedCode));
      }
    }
    return result;
  });
}

function getPlayer(room: PrivateRoom, playerId: string): Player | undefined {
  return room.players.find((player) => player.id === playerId);
}

function advanceTurn(room: PrivateRoom, fromSeat: Seat): void {
  const startIndex = SEATS.indexOf(fromSeat);
  for (let step = 1; step <= SEATS.length; step += 1) {
    const candidate = SEATS[(startIndex + step) % SEATS.length];
    if (room.players.some((player) => player.seat === candidate)) {
      room.turnSeat = candidate;
      room.turnNumber += 1;
      return;
    }
  }
  room.turnSeat = null;
  room.turnNumber += 1;
}

function headerValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

router.post("/games/rooms/create", async (req, res) => {
  const parsed = CreateGameRoomBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Enter a valid player name to create a room." });
  }
  const { playerId } = parsed.data;
  const name = parsed.data.name.trim();
  if (!name) {
    return res.status(400).json({ error: "Player name cannot be blank." });
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = makeRoomCode();
    const room: PrivateRoom = {
      code,
      phase: "LOBBY",
      hostPlayerId: playerId,
      players: [{ id: playerId, name: name.slice(0, 24), team: "A", seat: "A1" }],
      target: null,
      hands: { A: [], B: [] },
      drawPile: [],
      revealedCards: [],
      incorrectGuesses: [],
      winnerTeam: null,
      turnSeat: null,
      turnNumber: 0,
      lastActionMessage: "Room created. Waiting for three more players.",
      updatedAt: Date.now(),
    };
    const created = await db
      .insert(gameRooms)
      .values({ code, state: room })
      .onConflictDoNothing()
      .returning({ code: gameRooms.code });
    if (created.length > 0) return res.status(201).json(roomView(room, playerId));
  }
  return res.status(503).json({ error: "Could not create a unique room code. Please try again." });
});

router.get("/games/rooms/state", async (req, res) => {
  const code = headerValue(req.headers["x-room-code"]);
  const playerId = headerValue(req.headers["x-player-id"]);
  const room = await getRoom(code);
  if (!room) return res.status(404).json({ error: "This room is no longer available." });
  if (!getPlayer(room, playerId)) {
    return res.status(404).json({ error: "You are no longer in this room." });
  }
  return res.json(roomView(room, playerId));
});

router.post("/games/rooms/join", async (req, res) => {
  const parsed = JoinGameRoomBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Enter a four-character room code and player name." });
  }
  const { playerId } = parsed.data;
  const outcome = await mutateRoom(parsed.data.code, (room) => {
    const existingPlayer = getPlayer(room, playerId);
    if (existingPlayer) {
      existingPlayer.name = parsed.data.name.trim().slice(0, 24) || existingPlayer.name;
      room.updatedAt = Date.now();
      return { status: 200, body: roomView(room, playerId), persist: true };
    }
    if (room.phase === "FINISHED") {
      return { status: 409, body: { error: "This game has ended." }, persist: false };
    }
    const seat = SEATS.find(
      (candidate) => !room.players.some((player) => player.seat === candidate),
    );
    if (!seat) return { status: 409, body: { error: "This room is full." }, persist: false };
    const name = parsed.data.name.trim();
    if (!name) {
      return { status: 400, body: { error: "Player name cannot be blank." }, persist: false };
    }

    room.players.push({
      id: playerId,
      name: name.slice(0, 24),
      team: seat.startsWith("A") ? "A" : "B",
      seat,
    });
    room.updatedAt = Date.now();
    room.lastActionMessage = `${name.slice(0, 24)} joined the room.`;
    return { status: 200, body: roomView(room, playerId), persist: true };
  });
  if (!outcome) {
    return res.status(404).json({ error: "Room not found. Check the code and try again." });
  }
  return res.status(outcome.status).json(outcome.body);
});

router.post("/games/rooms/leave", async (req, res) => {
  const parsed = LeaveGameRoomBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid leave request." });
  const outcome = await mutateRoom(parsed.data.code, (room) => {
    const player = getPlayer(room, parsed.data.playerId);
    if (!player) {
      return { status: 404, body: { error: "You are no longer in this room." }, persist: false };
    }

    const leavingSeat = player.seat;
    room.players = room.players.filter((candidate) => candidate.id !== player.id);
    if (room.hostPlayerId === player.id) {
      room.hostPlayerId = room.players[0]?.id ?? "";
    }
    if (room.phase === "PLAYING" && room.turnSeat === leavingSeat) {
      advanceTurn(room, leavingSeat);
    }
    room.lastActionMessage = `${player.name} left the room.`;
    room.updatedAt = Date.now();
    const roomClosed = room.players.length === 0;
    return {
      status: 200,
      body: { left: true, roomClosed },
      persist: true,
      remove: roomClosed,
    };
  });
  if (!outcome) return res.status(404).json({ error: "Room not found." });
  return res.status(outcome.status).json(outcome.body);
});

router.post("/games/rooms/start", async (req, res) => {
  const parsed = StartGameRoomBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid start request." });
  const outcome = await mutateRoom(parsed.data.code, (room) => {
    if (room.hostPlayerId !== parsed.data.playerId) {
      return { status: 403, body: { error: "Only the host can start the game." }, persist: false };
    }
    if (room.phase !== "LOBBY") {
      return { status: 400, body: { error: "This game has already started." }, persist: false };
    }
    if (room.players.length !== 4) {
      return { status: 400, body: { error: "Four players are needed to start." }, persist: false };
    }

    const deck = shuffle(createDeck());
    room.target = deck.pop() ?? null;
    room.hands = {
      A: [deck.pop()!, deck.pop()!, deck.pop()!],
      B: [deck.pop()!, deck.pop()!, deck.pop()!],
    };
    room.drawPile = deck;
    room.revealedCards = [];
    room.incorrectGuesses = [];
    room.winnerTeam = null;
    room.turnSeat = "A1";
    room.turnNumber = 1;
    room.phase = "PLAYING";
    room.lastActionMessage = "Game started. A1 has the first move.";
    room.updatedAt = Date.now();
    return { status: 200, body: roomView(room, parsed.data.playerId), persist: true };
  });
  if (!outcome) return res.status(404).json({ error: "Room not found." });
  return res.status(outcome.status).json(outcome.body);
});

router.post("/games/rooms/actions", async (req, res) => {
  const parsed = SubmitGameActionBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Choose a valid game action." });
  const input = parsed.data;
  const outcome = await mutateRoom(input.code, (room) => {
    if (room.phase !== "PLAYING" || !room.turnSeat) {
      return { status: 400, body: { error: "This game is not accepting actions." }, persist: false };
    }
    const player = getPlayer(room, input.playerId);
    if (!player) {
      return { status: 404, body: { error: "You are no longer in this room." }, persist: false };
    }
    if (player.seat !== room.turnSeat) {
      return { status: 400, body: { error: "It is not your turn yet." }, persist: false };
    }

    if (input.action === "REVEAL") {
      const cardIds = input.cardIds ?? [];
      if (cardIds.length < 1 || cardIds.length > 3 || new Set(cardIds).size !== cardIds.length) {
        return { status: 400, body: { error: "Reveal one, two, or three different cards." }, persist: false };
      }
      if (cardIds.length > room.drawPile.length) {
        return {
          status: 400,
          body: { error: "There are not enough cards left to replace that reveal." },
          persist: false,
        };
      }
      const hand = room.hands[player.team];
      if (cardIds.some((id) => !hand.some((card) => card.id === id))) {
        return { status: 400, body: { error: "Those cards are not in your team's hand." }, persist: false };
      }
      const revealed = hand.filter((card) => cardIds.includes(card.id));
      room.hands[player.team] = hand.filter((card) => !cardIds.includes(card.id));
      room.revealedCards.push(
        ...revealed.map((card) => ({
          ...card,
          team: player.team,
          playerName: player.name,
          turnNumber: room.turnNumber,
        })),
      );
      for (let index = 0; index < revealed.length; index += 1) {
        const replacement = room.drawPile.pop();
        if (replacement) room.hands[player.team].push(replacement);
      }
      room.lastActionMessage = `${player.name} revealed ${revealed.length} ${revealed.length === 1 ? "card" : "cards"}.`;
      const previousSeat = room.turnSeat;
      advanceTurn(room, previousSeat);
    } else {
      const suit = input.suit as Suit | undefined;
      if (!suit || !SUITS.includes(suit)) {
        return { status: 400, body: { error: "Choose a suit to guess." }, persist: false };
      }
      if (room.incorrectGuesses.includes(suit)) {
        return { status: 400, body: { error: "That suit has already been ruled out." }, persist: false };
      }
      if (room.target?.suit === suit) {
        room.winnerTeam = player.team;
        room.phase = "FINISHED";
        room.lastActionMessage = `${player.name} found the target suit. Team ${player.team} wins.`;
      } else {
        room.incorrectGuesses.push(suit);
        room.lastActionMessage = `${player.name} ruled out ${suit.toLowerCase()}.`;
        const previousSeat = room.turnSeat;
        advanceTurn(room, previousSeat);
      }
    }
    room.updatedAt = Date.now();
    return { status: 200, body: roomView(room, input.playerId), persist: true };
  });
  if (!outcome) return res.status(404).json({ error: "Room not found." });
  return res.status(outcome.status).json(outcome.body);
});

export default router;
