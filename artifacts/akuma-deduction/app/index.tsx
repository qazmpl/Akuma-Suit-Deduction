import { useEffect, useMemo, useState, type ComponentProps } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetGameRoomQueryKey,
  useCreateGameRoom,
  useGetGameRoom,
  useJoinGameRoom,
  useLeaveGameRoom,
  useStartGameRoom,
  useSubmitGameAction,
  type RoomView,
  type Seat,
  type Suit,
  type Team,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PLAYER_ID_KEY = "fifth-suit-player-id";
const PLAYER_NAME_KEY = "fifth-suit-player-name";
const ACTIVE_ROOM_KEY = "fifth-suit-active-room";

const SUITS: Array<{ id: Suit; name: string; symbol: string }> = [
  { id: "SPADES", name: "Spades", symbol: "♠" },
  { id: "HEARTS", name: "Hearts", symbol: "♥" },
  { id: "DIAMONDS", name: "Diamonds", symbol: "♦" },
  { id: "CLUBS", name: "Clubs", symbol: "♣" },
  { id: "DEMON", name: "Demon", symbol: "✦" },
];
const SEATS: Seat[] = ["A1", "B1", "A2", "B2"];

function roomKey(code: string, playerId: string) {
  return [...getGetGameRoomQueryKey(), code, playerId];
}

function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Try again.";
}

function haptic() {
  void Haptics.selectionAsync();
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [ready, setReady] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [rulesOpen, setRulesOpen] = useState(false);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [guessOpen, setGuessOpen] = useState(false);
  const [selectedGuess, setSelectedGuess] = useState<Suit | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadIdentity() {
      try {
        let savedPlayerId = await AsyncStorage.getItem(PLAYER_ID_KEY);
        if (!savedPlayerId) {
          savedPlayerId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`;
          await AsyncStorage.setItem(PLAYER_ID_KEY, savedPlayerId);
        }
        const [savedName, savedRoom] = await Promise.all([
          AsyncStorage.getItem(PLAYER_NAME_KEY),
          AsyncStorage.getItem(ACTIVE_ROOM_KEY),
        ]);
        if (!mounted) return;
        setPlayerId(savedPlayerId);
        setDisplayName(savedName ?? "");
        setRoomCode(savedRoom?.toUpperCase() ?? null);
        setReady(true);
      } catch {
        if (!mounted) return;
        setErrorMessage("Your device storage is unavailable. Restart the app and try again.");
        setPlayerId(`${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`);
        setReady(true);
      }
    }
    void loadIdentity();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!ready || !displayName.trim()) return;
    const timeout = setTimeout(() => {
      void AsyncStorage.setItem(PLAYER_NAME_KEY, displayName.trim().slice(0, 24));
    }, 250);
    return () => clearTimeout(timeout);
  }, [displayName, ready]);

  const roomQuery = useGetGameRoom({
    query: {
      queryKey: roomKey(roomCode ?? "", playerId ?? ""),
      enabled: ready && !!roomCode && !!playerId,
      refetchInterval: 1000,
      retry: 0,
    },
    request: {
      headers: {
        "X-Room-Code": roomCode ?? "",
        "X-Player-Id": playerId ?? "",
      },
    },
  });
  const room = roomQuery.data;

  function acceptRoom(nextRoom: RoomView) {
    setErrorMessage("");
    setRoomCode(nextRoom.code);
    setSelectedCardIds([]);
    setSelectedGuess(null);
    setGuessOpen(false);
    void AsyncStorage.setItem(ACTIVE_ROOM_KEY, nextRoom.code);
    queryClient.setQueryData(roomKey(nextRoom.code, nextRoom.meId), nextRoom);
  }

  const createRoom = useCreateGameRoom({
    mutation: {
      onSuccess: acceptRoom,
      onError: (error) => setErrorMessage(messageFromError(error)),
    },
  });
  const joinRoom = useJoinGameRoom({
    mutation: {
      onSuccess: acceptRoom,
      onError: (error) => setErrorMessage(messageFromError(error)),
    },
  });
  const leaveRoom = useLeaveGameRoom({
    mutation: {
      onSuccess: () => {
        setRoomCode(null);
        setSelectedCardIds([]);
        setGuessOpen(false);
        setSelectedGuess(null);
        setErrorMessage("");
        void AsyncStorage.removeItem(ACTIVE_ROOM_KEY);
      },
      onError: (error) => setErrorMessage(messageFromError(error)),
    },
  });
  const startRoom = useStartGameRoom({
    mutation: {
      onSuccess: acceptRoom,
      onError: (error) => setErrorMessage(messageFromError(error)),
    },
  });
  const submitAction = useSubmitGameAction({
    mutation: {
      onSuccess: acceptRoom,
      onError: (error) => setErrorMessage(messageFromError(error)),
    },
  });

  const contentInset = {
    paddingTop: Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top,
    paddingBottom: Platform.OS === "web" ? Math.max(insets.bottom, 34) : insets.bottom,
  };
  const isBusy =
    createRoom.isPending ||
    joinRoom.isPending ||
    leaveRoom.isPending ||
    startRoom.isPending ||
    submitAction.isPending;

  function create() {
    if (!playerId || !displayName.trim()) {
      setErrorMessage("Add your name before creating a room.");
      return;
    }
    haptic();
    setErrorMessage("");
    createRoom.mutate({ data: { playerId, name: displayName.trim().slice(0, 24) } });
  }

  function join() {
    if (!playerId || !displayName.trim()) {
      setErrorMessage("Add your name before joining a room.");
      return;
    }
    if (joinCode.trim().length !== 4) {
      setErrorMessage("Room codes are four characters long.");
      return;
    }
    haptic();
    setErrorMessage("");
    joinRoom.mutate({
      data: {
        code: joinCode.trim().toUpperCase(),
        playerId,
        name: displayName.trim().slice(0, 24),
      },
    });
  }

  function exitRoom() {
    if (!room || !playerId) return;
    haptic();
    leaveRoom.mutate({ data: { code: room.code, playerId } });
  }

  function startGame() {
    if (!room || !playerId) return;
    haptic();
    setErrorMessage("");
    startRoom.mutate({ data: { code: room.code, playerId } });
  }

  function sendReveal() {
    if (!room || !playerId || selectedCardIds.length < 1) return;
    haptic();
    setErrorMessage("");
    submitAction.mutate({
      data: {
        code: room.code,
        playerId,
        action: "REVEAL",
        cardIds: selectedCardIds,
      },
    });
  }

  function sendGuess() {
    if (!room || !playerId || !selectedGuess) return;
    haptic();
    setErrorMessage("");
    submitAction.mutate({
      data: {
        code: room.code,
        playerId,
        action: "GUESS",
        suit: selectedGuess,
      },
    });
  }

  async function shareRoom() {
    if (!room) return;
    try {
      await Share.share({
        message: `Join my game of The Fifth Suit. Room code: ${room.code}`,
      });
    } catch {
      setErrorMessage("Could not open sharing on this device.");
    }
  }

  function returnHome() {
    setRoomCode(null);
    setErrorMessage("");
    setSelectedCardIds([]);
    setSelectedGuess(null);
    setGuessOpen(false);
    void AsyncStorage.removeItem(ACTIVE_ROOM_KEY);
  }

  if (!ready || !playerId) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <StatusBar style="light" />
        <ActivityIndicator color={colors.primary} />
        <Text style={[styles.mutedText, { color: colors.mutedForeground }]}>Opening your table…</Text>
      </View>
    );
  }

  if (roomCode && !room && roomQuery.isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }, contentInset]}>
        <StatusBar style="light" />
        <ActivityIndicator color={colors.primary} />
        <Text style={[styles.mutedText, { color: colors.mutedForeground }]}>Rejoining room {roomCode}</Text>
      </View>
    );
  }

  if (roomCode && !room && roomQuery.isError) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }, contentInset]}>
        <StatusBar style="light" />
        <View style={[styles.errorMark, { borderColor: colors.destructive }]}>
          <Feather name="alert-circle" size={22} color={colors.destructive} />
        </View>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Room unavailable</Text>
        <Text style={[styles.mutedText, { color: colors.mutedForeground, textAlign: "center" }]}>
          {messageFromError(roomQuery.error)}
        </Text>
        <ActionButton label="Back to home" onPress={returnHome} icon="arrow-left" secondary colors={colors} />
      </View>
    );
  }

  if (room) {
    const me = room.players.find((player) => player.id === playerId);
    const activePlayer = room.players.find((player) => player.seat === room.turnSeat);
    const isMyTurn = activePlayer?.id === playerId;
    const hasAllSeats = room.players.length === 4;
    const myTeam = room.myTeam;
    const maxSelectable = Math.min(3, room.hand.length, room.remainingDeckCount);
    const knownWrong = new Set(room.incorrectGuesses);
    const teamSeats: Team[] = ["A", "B"];

    function toggleCard(id: string) {
      if (!isMyTurn || maxSelectable === 0) return;
      haptic();
      setSelectedCardIds((current) =>
        current.includes(id)
          ? current.filter((cardId) => cardId !== id)
          : current.length < maxSelectable
            ? [...current, id]
            : current,
      );
    }

    return (
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={[styles.page, contentInset, { backgroundColor: colors.background }]}
        keyboardShouldPersistTaps="handled"
      >
        <StatusBar style="light" />
        <View style={styles.roomHeader}>
          <BrandMark colors={colors} compact />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Leave room"
            testID="leave-room"
            onPress={exitRoom}
            disabled={isBusy}
            style={({ pressed }) => [styles.iconButton, { borderColor: colors.border, opacity: pressed ? 0.65 : 1 }]}
          >
            <Feather name="log-out" size={17} color={colors.mutedForeground} />
          </Pressable>
        </View>

        {errorMessage ? <InlineError message={errorMessage} colors={colors} /> : null}

        {room.phase === "LOBBY" ? (
          <>
            <View style={[styles.roomCodeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.roomCodeMeta}>
                <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>ROOM CODE</Text>
                <View style={[styles.liveDot, { backgroundColor: colors.teamA }]} />
                <Text style={[styles.smallLabel, { color: colors.mutedForeground }]}>OPEN</Text>
              </View>
              <View style={styles.roomCodeRow}>
                <Text style={[styles.roomCode, { color: colors.foreground }]}>{room.code}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Share room code"
                  testID="share-room"
                  onPress={() => void shareRoom()}
                  style={({ pressed }) => [styles.shareButton, { borderColor: colors.border, opacity: pressed ? 0.65 : 1 }]}
                >
                  <Feather name="share-2" size={16} color={colors.primary} />
                  <Text style={[styles.shareText, { color: colors.primary }]}>Invite</Text>
                </Pressable>
              </View>
              <Text style={[styles.mutedText, { color: colors.mutedForeground }]}>
                Send the code to three other players.
              </Text>
            </View>

            <View style={styles.sectionHeading}>
              <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>THE TABLE</Text>
              <Text style={[styles.smallLabel, { color: colors.mutedForeground }]}>{room.players.length}/4 SEATED</Text>
            </View>
            <View style={styles.teamGrid}>
              {teamSeats.map((team) => (
                <View
                  key={team}
                  style={[
                    styles.teamCard,
                    { backgroundColor: colors.card, borderColor: team === "A" ? colors.teamA : colors.teamB },
                  ]}
                >
                  <View style={styles.teamCardHeader}>
                    <View style={[styles.teamMarker, { backgroundColor: team === "A" ? colors.teamA : colors.teamB }]} />
                    <Text style={[styles.teamTitle, { color: colors.foreground }]}>TEAM {team}</Text>
                    <Text style={[styles.teamOrder, { color: colors.mutedForeground }]}>
                      {team === "A" ? "A1 · A2" : "B1 · B2"}
                    </Text>
                  </View>
                  {SEATS.filter((seat) => seat.startsWith(team)).map((seat) => {
                    const player = room.players.find((entry) => entry.seat === seat);
                    return (
                      <SeatRow
                        key={seat}
                        seat={seat}
                        name={player?.name ?? null}
                        isHost={player?.isHost ?? false}
                        isSelf={player?.id === playerId}
                        colors={colors}
                      />
                    );
                  })}
                </View>
              ))}
            </View>

            <View style={[styles.hostNote, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Feather name={room.hostPlayerId === playerId ? "shield" : "clock"} size={16} color={colors.primary} />
              <Text style={[styles.mutedText, { color: colors.mutedForeground, flex: 1 }]}>
                {hasAllSeats
                  ? room.hostPlayerId === playerId
                    ? "All seats are filled. You can start the game."
                    : "All seats are filled. The host can start the game."
                  : `${room.hostPlayerId === playerId ? "As host, wait for" : "Waiting for"} ${4 - room.players.length} more ${4 - room.players.length === 1 ? "player" : "players"}.`}
              </Text>
            </View>

            {room.hostPlayerId === playerId ? (
              <ActionButton
                label={hasAllSeats ? "Start the game" : `Waiting for ${4 - room.players.length} players`}
                onPress={startGame}
                disabled={!hasAllSeats || isBusy}
                loading={startRoom.isPending}
                icon="play"
                colors={colors}
                testID="start-game"
              />
            ) : (
              <View style={[styles.waitingButton, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.waitingButtonText, { color: colors.mutedForeground }]}>Waiting for the host</Text>
              </View>
            )}
          </>
        ) : (
          <>
            <View style={styles.gameHeading}>
              <View>
                <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>ROOM {room.code} · TURN {String(room.turnNumber).padStart(2, "0")}</Text>
                <Text style={[styles.gameTitle, { color: colors.foreground }]}>
                  {room.phase === "FINISHED" ? "The table is settled" : isMyTurn ? "Your move." : `${activePlayer?.name ?? "A player"} is up.`}
                </Text>
              </View>
              <View style={[styles.turnChip, { backgroundColor: isMyTurn ? colors.accent : colors.surface, borderColor: colors.border }]}>
                <View style={[styles.liveDot, { backgroundColor: isMyTurn ? colors.primary : colors.mutedForeground }]} />
                <Text style={[styles.smallLabel, { color: isMyTurn ? colors.primary : colors.mutedForeground }]}>
                  {room.phase === "FINISHED" ? "COMPLETE" : isMyTurn ? "YOUR TURN" : `SEAT ${room.turnSeat ?? "—"}`}
                </Text>
              </View>
            </View>

            {room.phase === "FINISHED" ? (
              <View style={[styles.winnerCard, { backgroundColor: colors.card, borderColor: colors.primary }]}>
                <View style={[styles.winnerIcon, { backgroundColor: colors.accent }]}>
                  <Feather name="award" size={23} color={colors.primary} />
                </View>
                <Text style={[styles.winnerTitle, { color: colors.foreground }]}>Team {room.winnerTeam} wins</Text>
                {room.targetSuit ? (
                  <Text style={[styles.winnerSubtitle, { color: colors.mutedForeground }]}>
                    The target was {SUITS.find((suit) => suit.id === room.targetSuit)?.name}.
                  </Text>
                ) : null}
                {room.targetSuit ? (
                  <SuitStamp suit={room.targetSuit} size="large" colors={colors} />
                ) : null}
              </View>
            ) : null}

            <View style={[styles.targetCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.targetCopy}>
                <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>THE TARGET</Text>
                <Text style={[styles.targetTitle, { color: colors.foreground }]}>
                  {room.phase === "FINISHED" ? "Revealed" : "One hidden suit"}
                </Text>
                <Text style={[styles.mutedText, { color: colors.mutedForeground }]}>
                  {room.phase === "FINISHED" ? "Round complete" : "Deduce it before the other team."}
                </Text>
              </View>
              {room.phase === "FINISHED" && room.targetSuit ? (
                <SuitStamp suit={room.targetSuit} size="large" colors={colors} />
              ) : (
                <View style={[styles.targetSeal, { borderColor: colors.primary }]}>
                  <Feather name="eye-off" size={23} color={colors.primary} />
                  <Text style={[styles.sealMark, { color: colors.mutedForeground }]}>?</Text>
                </View>
              )}
            </View>

            <View style={styles.teamCounts}>
              {(["A", "B"] as Team[]).map((team) => (
                <View
                  key={team}
                  style={[
                    styles.teamCountCard,
                    { backgroundColor: colors.surface, borderColor: team === myTeam ? colors.primary : colors.border },
                  ]}
                >
                  <View style={styles.teamCountTop}>
                    <View style={[styles.teamMarker, { backgroundColor: team === "A" ? colors.teamA : colors.teamB }]} />
                    <Text style={[styles.teamTitle, { color: colors.foreground }]}>
                      TEAM {team}{team === myTeam ? " · YOU" : ""}
                    </Text>
                  </View>
                  <Text style={[styles.handCount, { color: colors.foreground }]}>
                    {team === "A" ? room.teamAHandCount : room.teamBHandCount}
                    <Text style={[styles.handCountCaption, { color: colors.mutedForeground }]}> cards</Text>
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.sectionHeading}>
              <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>TURN ORDER</Text>
              <Text style={[styles.smallLabel, { color: colors.mutedForeground }]}>A1 → B1 → A2 → B2</Text>
            </View>
            <View style={styles.turnTrack}>
              {SEATS.map((seat, index) => {
                const player = room.players.find((entry) => entry.seat === seat);
                const current = room.phase === "PLAYING" && room.turnSeat === seat;
                return (
                  <View
                    key={seat}
                    style={[
                      styles.turnSeat,
                      { backgroundColor: current ? colors.accent : colors.surface, borderColor: current ? colors.primary : colors.border },
                    ]}
                  >
                    <Text style={[styles.turnSeatCode, { color: current ? colors.primary : colors.mutedForeground }]}>{seat}</Text>
                    <Text numberOfLines={1} style={[styles.turnSeatName, { color: current ? colors.foreground : colors.mutedForeground }]}>
                      {player?.name ?? "Open"}
                    </Text>
                    {index < SEATS.length - 1 ? <View style={[styles.trackLine, { backgroundColor: colors.border }]} /> : null}
                  </View>
                );
              })}
            </View>

            <View style={styles.sectionHeading}>
              <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>YOUR TEAM HAND</Text>
              <Text style={[styles.smallLabel, { color: colors.mutedForeground }]}>
                SHARED · {room.hand.length} {room.hand.length === 1 ? "CARD" : "CARDS"}
              </Text>
            </View>
            <View style={styles.handRow}>
              {room.hand.length ? (
                room.hand.map((card) => (
                  <HandCard
                    key={card.id}
                    suit={card.suit}
                    selected={selectedCardIds.includes(card.id)}
                    disabled={!isMyTurn || room.phase !== "PLAYING" || maxSelectable === 0 || isBusy}
                    onPress={() => toggleCard(card.id)}
                    colors={colors}
                  />
                ))
              ) : (
                <Text style={[styles.mutedText, { color: colors.mutedForeground }]}>Your team has no cards in hand.</Text>
              )}
            </View>

            {room.phase === "PLAYING" && isMyTurn ? (
              <View style={[styles.actionPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {guessOpen ? (
                  <>
                    <View style={styles.actionHeader}>
                      <View>
                        <Text style={[styles.eyebrow, { color: colors.primary }]}>FINAL DEDUCTION</Text>
                        <Text style={[styles.actionTitle, { color: colors.foreground }]}>Which suit is hidden?</Text>
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Close guess options"
                        onPress={() => {
                          setGuessOpen(false);
                          setSelectedGuess(null);
                        }}
                        style={styles.plainIcon}
                      >
                        <Feather name="x" size={18} color={colors.mutedForeground} />
                      </Pressable>
                    </View>
                    <View style={styles.suitGrid}>
                      {SUITS.map((suit) => (
                        <SuitChoice
                          key={suit.id}
                          suit={suit}
                          selected={selectedGuess === suit.id}
                          disabled={knownWrong.has(suit.id)}
                          onPress={() => {
                            haptic();
                            setSelectedGuess(suit.id);
                          }}
                          colors={colors}
                        />
                      ))}
                    </View>
                    {room.incorrectGuesses.length ? (
                      <Text style={[styles.mutedText, { color: colors.mutedForeground }]}>
                        Ruled out: {room.incorrectGuesses.map((suit) => SUITS.find((item) => item.id === suit)?.name).join(", ")}
                      </Text>
                    ) : null}
                    <ActionButton
                      label={selectedGuess ? `Lock in ${SUITS.find((suit) => suit.id === selectedGuess)?.name}` : "Choose a suit"}
                      onPress={sendGuess}
                      disabled={!selectedGuess || isBusy}
                      loading={submitAction.isPending}
                      icon="check"
                      colors={colors}
                      testID="confirm-guess"
                    />
                  </>
                ) : (
                  <>
                    <View style={styles.actionHeader}>
                      <View>
                        <Text style={[styles.eyebrow, { color: colors.primary }]}>YOUR ACTION</Text>
                        <Text style={[styles.actionTitle, { color: colors.foreground }]}>Read the table.</Text>
                      </View>
                      <Text style={[styles.deckCount, { color: colors.mutedForeground }]}>
                        {room.remainingDeckCount} left
                      </Text>
                    </View>
                    <Text style={[styles.mutedText, { color: colors.mutedForeground }]}>
                      Select up to {maxSelectable} {maxSelectable === 1 ? "card" : "cards"} to reveal and replace.
                    </Text>
                    <ActionButton
                      label={selectedCardIds.length ? `Reveal ${selectedCardIds.length} ${selectedCardIds.length === 1 ? "card" : "cards"}` : "Select cards to reveal"}
                      onPress={sendReveal}
                      disabled={selectedCardIds.length === 0 || isBusy}
                      loading={submitAction.isPending}
                      icon="eye"
                      colors={colors}
                      testID="reveal-cards"
                    />
                    <Pressable
                      accessibilityRole="button"
                      testID="open-guess"
                      onPress={() => {
                        haptic();
                        setGuessOpen(true);
                        setSelectedCardIds([]);
                      }}
                      disabled={isBusy}
                      style={({ pressed }) => [styles.guessLink, { opacity: pressed ? 0.65 : 1 }]}
                    >
                      <Feather name="target" size={15} color={colors.primary} />
                      <Text style={[styles.guessLinkText, { color: colors.primary }]}>Make a suit guess</Text>
                    </Pressable>
                    {maxSelectable === 0 ? (
                      <Text style={[styles.deckEmpty, { color: colors.mutedForeground }]}>
                        The draw pile is empty. Only a suit guess is available.
                      </Text>
                    ) : null}
                  </>
                )}
              </View>
            ) : room.phase === "PLAYING" ? (
              <View style={[styles.waitingTurn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Feather name="clock" size={16} color={colors.mutedForeground} />
                <Text style={[styles.mutedText, { color: colors.mutedForeground, flex: 1 }]}>
                  {activePlayer ? `Waiting for ${activePlayer.name} to act.` : "Waiting for the next player."}
                </Text>
              </View>
            ) : null}

            <View style={styles.sectionHeading}>
              <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>PUBLIC REVEALS</Text>
              <Text style={[styles.smallLabel, { color: colors.mutedForeground }]}>
                {room.revealedCards.length} {room.revealedCards.length === 1 ? "CARD" : "CARDS"}
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.revealRow}>
              {room.revealedCards.length ? (
                room.revealedCards.map((card, index) => (
                  <View key={`${card.id}-${index}`} style={[styles.revealCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.revealSymbol, { color: colors.suits[card.suit] }]}>
                      {SUITS.find((suit) => suit.id === card.suit)?.symbol}
                    </Text>
                    <Text style={[styles.revealSuit, { color: colors.foreground }]}>
                      {SUITS.find((suit) => suit.id === card.suit)?.name}
                    </Text>
                    <Text style={[styles.revealBy, { color: colors.mutedForeground }]}>T{card.turnNumber} · {card.team}</Text>
                  </View>
                ))
              ) : (
                <View style={[styles.emptyLog, { borderColor: colors.border }]}>
                  <Feather name="layers" size={15} color={colors.mutedForeground} />
                  <Text style={[styles.mutedText, { color: colors.mutedForeground }]}>No cards revealed yet</Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.bottomMeta}>
              <Text style={[styles.mutedText, { color: colors.mutedForeground }]}>{room.lastActionMessage}</Text>
              {me ? <Text style={[styles.smallLabel, { color: colors.mutedForeground }]}>{me.seat}</Text> : null}
            </View>
          </>
        )}
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.page, styles.homePage, contentInset, { backgroundColor: colors.background }]}
      keyboardShouldPersistTaps="handled"
    >
      <StatusBar style="light" />
      <BrandMark colors={colors} />
      <View style={styles.hero}>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>A FOUR-PLAYER SUIT DEDUCTION GAME</Text>
        <Text style={[styles.heroTitle, { color: colors.foreground }]}>Read the table.{"\n"}Find the suit.</Text>
        <Text style={[styles.heroSubtitle, { color: colors.mutedForeground }]}>
          Two teams. One hidden target. Every reveal gives the table another clue.
        </Text>
        <View style={styles.suitStrip}>
          {SUITS.map((suit) => (
            <View key={suit.id} style={[styles.suitChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.suitChipSymbol, { color: colors.suits[suit.id] }]}>{suit.symbol}</Text>
              <Text style={[styles.suitChipName, { color: colors.mutedForeground }]}>{suit.name}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.homePanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>YOUR SEAT</Text>
        <TextInput
          testID="player-name"
          value={displayName}
          onChangeText={(value) => {
            setErrorMessage("");
            setDisplayName(value.slice(0, 24));
          }}
          placeholder="Choose a name"
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize="words"
          maxLength={24}
          returnKeyType="done"
          style={[
            styles.nameInput,
            { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border },
          ]}
        />
        <ActionButton
          label="Create a room"
          onPress={create}
          disabled={!displayName.trim() || isBusy}
          loading={createRoom.isPending}
          icon="plus"
          colors={colors}
          testID="create-room"
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>JOIN A TABLE</Text>
        <View style={styles.joinRow}>
          <TextInput
            testID="room-code"
            value={joinCode}
            onChangeText={(value) => {
              setErrorMessage("");
              setJoinCode(value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4));
            }}
            placeholder="ROOM CODE"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={4}
            returnKeyType="join"
            onSubmitEditing={join}
            style={[
              styles.codeInput,
              { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border },
            ]}
          />
          <ActionButton
            label="Join"
            onPress={join}
            disabled={joinCode.length !== 4 || !displayName.trim() || isBusy}
            loading={joinRoom.isPending}
            icon="arrow-right"
            secondary
            compact
            colors={colors}
            testID="join-room"
          />
        </View>
        {errorMessage ? <InlineError message={errorMessage} colors={colors} /> : null}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: rulesOpen }}
        testID="how-to-play"
        onPress={() => {
          haptic();
          setRulesOpen((open) => !open);
        }}
        style={({ pressed }) => [styles.rulesToggle, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
      >
        <View style={styles.rulesToggleLeft}>
          <Feather name="book-open" size={17} color={colors.primary} />
          <Text style={[styles.rulesToggleText, { color: colors.foreground }]}>How to play</Text>
        </View>
        <Feather name={rulesOpen ? "chevron-up" : "chevron-down"} size={17} color={colors.mutedForeground} />
      </Pressable>
      {rulesOpen ? <RulesPanel colors={colors} /> : null}

      <Text style={[styles.homeFootnote, { color: colors.mutedForeground }]}>
        2v2 · 15 cards · 5 suits · no special abilities
      </Text>
    </ScrollView>
  );
}

function BrandMark({ colors, compact = false }: { colors: ReturnType<typeof useColors>; compact?: boolean }) {
  return (
    <View style={styles.brandRow}>
      <Image source={require("../assets/images/icon.png")} style={compact ? styles.brandIconSmall : styles.brandIcon} />
      <View>
        <Text style={[styles.brandTitle, { color: colors.foreground }]}>THE FIFTH SUIT</Text>
        <Text style={[styles.brandCaption, { color: colors.mutedForeground }]}>2v2 · DEDUCTION</Text>
      </View>
      {!compact ? (
        <View style={[styles.brandEdition, { borderColor: colors.border }]}>
          <Text style={[styles.smallLabel, { color: colors.primary }]}>FIELD 01</Text>
        </View>
      ) : null}
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  colors,
  icon,
  disabled = false,
  loading = false,
  secondary = false,
  compact = false,
  testID,
}: {
  label: string;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
  icon: ComponentProps<typeof Feather>["name"];
  disabled?: boolean;
  loading?: boolean;
  secondary?: boolean;
  compact?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, busy: loading }}
      testID={testID}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.actionButton,
        compact && styles.actionButtonCompact,
        {
          backgroundColor: secondary ? colors.surface : colors.primary,
          borderColor: secondary ? colors.border : colors.primary,
          opacity: disabled ? 0.46 : pressed ? 0.82 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={secondary ? colors.primary : colors.primaryForeground} />
      ) : (
        <Feather name={icon} size={17} color={secondary ? colors.foreground : colors.primaryForeground} />
      )}
      <Text
        style={[
          styles.actionButtonText,
          compact && styles.actionButtonTextCompact,
          { color: secondary ? colors.foreground : colors.primaryForeground },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function InlineError({ message, colors }: { message: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.inlineError, { backgroundColor: colors.destructiveSurface, borderColor: colors.destructive }]}>
      <Feather name="alert-circle" size={16} color={colors.destructive} />
      <Text style={[styles.inlineErrorText, { color: colors.foreground }]}>{message}</Text>
    </View>
  );
}

function SeatRow({
  seat,
  name,
  isHost,
  isSelf,
  colors,
}: {
  seat: Seat;
  name: string | null;
  isHost: boolean;
  isSelf: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.seatRow, { borderTopColor: colors.border }]}>
      <View style={[styles.seatAvatar, { backgroundColor: name ? colors.accent : colors.surface, borderColor: colors.border }]}>
        <Feather name={name ? "user" : "plus"} size={15} color={name ? colors.primary : colors.mutedForeground} />
      </View>
      <View style={styles.seatInfo}>
        <Text style={[styles.seatName, { color: name ? colors.foreground : colors.mutedForeground }]}>
          {name ?? "Open seat"}{isSelf ? " · You" : ""}
        </Text>
        <Text style={[styles.seatCode, { color: colors.mutedForeground }]}>{seat}</Text>
      </View>
      {isHost ? <Text style={[styles.hostBadge, { color: colors.primary }]}>HOST</Text> : null}
    </View>
  );
}

function HandCard({
  suit,
  selected,
  disabled,
  onPress,
  colors,
}: {
  suit: Suit;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const definition = SUITS.find((item) => item.id === suit);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${definition?.name ?? "Suit"} card${selected ? ", selected" : ""}`}
      accessibilityState={{ selected, disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.handCard,
        {
          backgroundColor: selected ? colors.accent : colors.card,
          borderColor: selected ? colors.primary : colors.border,
          opacity: disabled ? 0.78 : pressed ? 0.8 : 1,
          transform: [{ translateY: selected ? -7 : 0 }],
        },
      ]}
    >
      <Text style={[styles.cardCorner, { color: colors.mutedForeground }]}>F</Text>
      <Text style={[styles.cardSymbol, { color: colors.suits[suit] }]}>{definition?.symbol}</Text>
      <Text style={[styles.cardName, { color: colors.foreground }]}>{definition?.name}</Text>
      <View style={[styles.cardBottomMark, { backgroundColor: colors.suits[suit] }]} />
    </Pressable>
  );
}

function SuitChoice({
  suit,
  selected,
  disabled,
  onPress,
  colors,
}: {
  suit: (typeof SUITS)[number];
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={`${suit.name}${disabled ? ", ruled out" : ""}`}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.suitChoice,
        {
          backgroundColor: selected ? colors.accent : colors.surface,
          borderColor: selected ? colors.primary : colors.border,
          opacity: disabled ? 0.32 : pressed ? 0.72 : 1,
        },
      ]}
    >
      <Text style={[styles.suitChoiceSymbol, { color: colors.suits[suit.id] }]}>{suit.symbol}</Text>
      <Text style={[styles.suitChoiceName, { color: disabled ? colors.mutedForeground : colors.foreground }]}>
        {suit.name}
      </Text>
      {disabled ? <View style={[styles.eliminatedLine, { backgroundColor: colors.destructive }]} /> : null}
    </Pressable>
  );
}

function SuitStamp({
  suit,
  size,
  colors,
}: {
  suit: Suit;
  size: "large";
  colors: ReturnType<typeof useColors>;
}) {
  const definition = SUITS.find((item) => item.id === suit);
  return (
    <View style={[styles.suitStamp, size === "large" && styles.suitStampLarge, { backgroundColor: colors.surface, borderColor: colors.suits[suit] }]}>
      <Text style={[styles.suitStampSymbol, { color: colors.suits[suit] }]}>{definition?.symbol}</Text>
      <Text style={[styles.suitStampName, { color: colors.foreground }]}>{definition?.name}</Text>
    </View>
  );
}

function RulesPanel({ colors }: { colors: ReturnType<typeof useColors> }) {
  const rules = useMemo(
    () => [
      ["01", "Four players take seats A1, B1, A2, B2."],
      ["02", "A hidden suit is chosen from 15 cards: three of each suit."],
      ["03", "On your turn, reveal 1–3 cards from your shared team hand and replace them, or make a suit guess."],
      ["04", "A wrong guess is removed for everyone. The first correct guess wins."],
    ],
    [],
  );
  return (
    <View style={[styles.rulesPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {rules.map(([number, copy]) => (
        <View key={number} style={[styles.ruleRow, { borderBottomColor: colors.border }]}>
          <Text style={[styles.ruleNumber, { color: colors.primary }]}>{number}</Text>
          <Text style={[styles.ruleCopy, { color: colors.foreground }]}>{copy}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 22,
    gap: 14,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingHorizontal: 28,
  },
  page: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 540,
    alignSelf: "center",
    paddingHorizontal: 20,
    gap: 18,
  },
  homePage: {
    paddingBottom: 30,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 44,
  },
  brandIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  brandIconSmall: {
    width: 38,
    height: 38,
    borderRadius: 11,
  },
  brandTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    letterSpacing: 1.8,
  },
  brandCaption: {
    fontFamily: "Inter_500Medium",
    fontSize: 9,
    letterSpacing: 1.7,
    marginTop: 3,
  },
  brandEdition: {
    marginLeft: "auto",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderRadius: 99,
  },
  smallLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 9,
    letterSpacing: 1.4,
  },
  hero: {
    paddingTop: 16,
    gap: 12,
  },
  eyebrow: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 9,
    letterSpacing: 1.8,
  },
  heroTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 38,
    lineHeight: 44,
    letterSpacing: -1.3,
  },
  heroSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 21,
    maxWidth: 360,
  },
  suitStrip: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
  },
  suitChip: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 11,
    gap: 4,
  },
  suitChipSymbol: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 17,
  },
  suitChipName: {
    fontFamily: "Inter_500Medium",
    fontSize: 7,
    letterSpacing: 0.2,
  },
  homePanel: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
  },
  nameInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
  actionButton: {
    minHeight: 50,
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 9,
  },
  actionButtonCompact: {
    minHeight: 44,
    paddingHorizontal: 15,
    borderRadius: 12,
  },
  actionButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    letterSpacing: 0.2,
  },
  actionButtonTextCompact: {
    fontSize: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 2,
  },
  joinRow: {
    flexDirection: "row",
    gap: 9,
  },
  codeInput: {
    flex: 1,
    minWidth: 0,
    height: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 13,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    letterSpacing: 2,
  },
  rulesToggle: {
    minHeight: 48,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 3,
  },
  rulesToggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rulesToggleText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  rulesPanel: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 15,
  },
  ruleRow: {
    flexDirection: "row",
    gap: 13,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  ruleNumber: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    marginTop: 2,
  },
  ruleCopy: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  homeFootnote: {
    fontFamily: "Inter_500Medium",
    fontSize: 9,
    letterSpacing: 1.3,
    textAlign: "center",
    marginTop: 1,
  },
  inlineError: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    padding: 11,
    borderRadius: 11,
    borderWidth: 1,
  },
  inlineErrorText: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    lineHeight: 17,
  },
  roomHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 12,
  },
  roomCodeCard: {
    padding: 16,
    borderRadius: 17,
    borderWidth: 1,
    gap: 8,
  },
  roomCodeMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 4,
    marginLeft: 4,
  },
  roomCodeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  roomCode: {
    fontFamily: "Inter_700Bold",
    fontSize: 30,
    letterSpacing: 5,
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  shareText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },
  mutedText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  teamGrid: {
    gap: 10,
  },
  teamCard: {
    borderRadius: 15,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  teamCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 8,
  },
  teamMarker: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  teamTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 1,
  },
  teamOrder: {
    marginLeft: "auto",
    fontFamily: "Inter_500Medium",
    fontSize: 9,
    letterSpacing: 0.7,
  },
  seatRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 47,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  seatAvatar: {
    width: 29,
    height: 29,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    borderWidth: 1,
  },
  seatInfo: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  seatName: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  seatCode: {
    fontFamily: "Inter_500Medium",
    fontSize: 9,
    letterSpacing: 0.8,
  },
  hostBadge: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 8,
    letterSpacing: 1.1,
  },
  hostNote: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 13,
    paddingVertical: 12,
  },
  waitingButton: {
    minHeight: 50,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    borderRadius: 13,
    borderWidth: 1,
  },
  waitingButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  gameHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingTop: 2,
  },
  gameTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 23,
    lineHeight: 29,
    marginTop: 6,
  },
  turnChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 99,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  targetCard: {
    minHeight: 104,
    borderWidth: 1,
    borderRadius: 17,
    padding: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  targetCopy: {
    gap: 6,
  },
  targetTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  targetSeal: {
    width: 58,
    height: 70,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    borderWidth: 1,
    borderRadius: 11,
    transform: [{ rotate: "3deg" }],
  },
  sealMark: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  teamCounts: {
    flexDirection: "row",
    gap: 9,
  },
  teamCountCard: {
    flex: 1,
    minHeight: 68,
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 7,
  },
  teamCountTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  handCount: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
  },
  handCountCaption: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
  },
  turnTrack: {
    flexDirection: "row",
    alignItems: "center",
  },
  turnSeat: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 6,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  turnSeatCode: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 9,
    letterSpacing: 0.8,
  },
  turnSeatName: {
    fontFamily: "Inter_500Medium",
    fontSize: 9,
  },
  trackLine: {
    position: "absolute",
    width: 8,
    height: 1,
    right: -5,
    top: "50%",
    zIndex: 1,
  },
  handRow: {
    flexDirection: "row",
    gap: 10,
    minHeight: 112,
    alignItems: "flex-start",
  },
  handCard: {
    flex: 1,
    minWidth: 0,
    height: 108,
    borderWidth: 1,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    overflow: "hidden",
  },
  cardCorner: {
    position: "absolute",
    top: 7,
    left: 9,
    fontFamily: "Inter_600SemiBold",
    fontSize: 8,
    letterSpacing: 0.6,
  },
  cardSymbol: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 32,
    lineHeight: 37,
  },
  cardName: {
    fontFamily: "Inter_500Medium",
    fontSize: 9,
  },
  cardBottomMark: {
    width: 13,
    height: 2,
    borderRadius: 2,
    marginTop: 2,
  },
  actionPanel: {
    borderWidth: 1,
    borderRadius: 17,
    padding: 15,
    gap: 12,
  },
  actionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  actionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    marginTop: 5,
  },
  deckCount: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 0.5,
  },
  guessLink: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  guessLinkText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },
  deckEmpty: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    lineHeight: 15,
    textAlign: "center",
  },
  plainIcon: {
    padding: 5,
  },
  suitGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  suitChoice: {
    flexGrow: 1,
    flexBasis: "29%",
    minHeight: 66,
    borderWidth: 1,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    gap: 3,
    overflow: "hidden",
  },
  suitChoiceSymbol: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 21,
  },
  suitChoiceName: {
    fontFamily: "Inter_500Medium",
    fontSize: 9,
  },
  eliminatedLine: {
    position: "absolute",
    height: 2,
    width: "70%",
    transform: [{ rotate: "-28deg" }],
  },
  waitingTurn: {
    borderWidth: 1,
    borderRadius: 13,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 19,
  },
  revealRow: {
    gap: 8,
    paddingRight: 4,
    minHeight: 96,
  },
  revealCard: {
    width: 82,
    height: 86,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  revealSymbol: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 23,
    lineHeight: 25,
  },
  revealSuit: {
    fontFamily: "Inter_500Medium",
    fontSize: 9,
  },
  revealBy: {
    fontFamily: "Inter_500Medium",
    fontSize: 8,
  },
  emptyLog: {
    flex: 1,
    minHeight: 72,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  bottomMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingBottom: 12,
  },
  winnerCard: {
    borderWidth: 1,
    borderRadius: 17,
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  winnerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  winnerTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 19,
    marginTop: 2,
  },
  winnerSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  suitStamp: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  suitStampLarge: {
    minWidth: 84,
    minHeight: 82,
    borderRadius: 15,
    padding: 10,
    marginTop: 5,
  },
  suitStampSymbol: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 28,
  },
  suitStampName: {
    fontFamily: "Inter_500Medium",
    fontSize: 9,
    marginTop: 1,
  },
  errorMark: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    borderWidth: 1,
  },
});
