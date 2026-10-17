/**
 * ACMA MATRIX // 2v2 Tactical Deduction & Mathematical Engine
 * Standalone, Modular, Mobile-First Engine
 * Pure Vanilla JavaScript (ES2022) • Zero External Heavy Dependencies
 */

(function () {
  'use strict';

  // =========================================================================
  // CONSTANTS & SUIT VECTORS MATRIX
  // =========================================================================
  const SUITS = ['spades', 'hearts', 'diamonds', 'clubs', 'demon'];
  const CARDS_PER_SUIT = 3;
  const TOTAL_DECK_COUNT = 15; // 5 suits * 3 = 15

  const TURN_ROTATION_ORDER = [
    { team: 'A', slot: 1, label: 'ALPHA 1' },
    { team: 'B', slot: 1, label: 'OMEGA 1' },
    { team: 'A', slot: 2, label: 'ALPHA 2' },
    { team: 'B', slot: 2, label: 'OMEGA 2' }
  ];

  const MQTT_BROKERS = [
    { name: 'HiveMQ Public Cloud', host: 'broker.hivemq.com', port: 8884, path: '/mqtt' },
    { name: 'EMQX Public Cloud', host: 'broker.emqx.io', port: 8084, path: '/mqtt' }
  ];
  const STORAGE_KEY = 'acma_matrix_session_v1';

  // =========================================================================
  // AUDIO SYNTHESIZER (Pure Web Audio API - Zero External Asset Lag)
  // =========================================================================
  class SoundFX {
    constructor() {
      this.ctx = null;
      this.enabled = true;
    }

    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    playCardTap() {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.04);
    }

    playCardDeal() {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    }

    playTurnChime() {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);

        gain.gain.setValueAtTime(0.14, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.28);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.3);
      });
    }

    playErrorBuzz() {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.linearRampToValueAtTime(70, now + 0.25);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    }

    playVictoryFanfare() {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const chords = [523.25, 659.25, 783.99, 1046.50];
      chords.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);

        gain.gain.setValueAtTime(0.22, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.6);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.65);
      });
    }
  }

  const sound = new SoundFX();

  // Subtle mobile haptic feedback helper
  function vibrateDevice(pattern = 15) {
    if ('vibrate' in navigator) {
      try { navigator.vibrate(pattern); } catch (e) { /* ignore */ }
    }
  }

  // =========================================================================
  // APPLICATION LOCAL STATE
  // =========================================================================
  const local = {
    playerId: null,
    playerName: '',
    roomId: null,
    isHost: false,
    myTeam: null,      // 'A' or 'B'
    mySlot: null,      // 1 or 2
    selectedHandIndices: [], // Strictly client-side memory: card indices chosen to reveal
    selectedGuessSuit: null, // Suit chosen in modal
    isHandMasked: false,     // Privacy visor toggle
    mqttClient: null,
    broadcastChannel: null,
    isConnected: false,
    reconnectTimer: null
  };

  // Authoritative State (Managed by Host, mirrored to all devices)
  let gameState = {
    roomId: null,
    status: 'lobby', // 'lobby' | 'staging' | 'playing' | 'round_over'
    roundNumber: 1,
    turnIndex: 0,    // 0: A1, 1: B1, 2: A2, 3: B2
    deck: [],
    targetCard: null, // Revealed to clients only at round_over
    teamAHand: [],
    teamBHand: [],
    cemetery: [],
    eliminatedSuits: [],
    winner: null,
    players: {
      A1: null,
      A2: null,
      B1: null,
      B2: null
    },
    // Invisible Rating Record: { [playerId]: { rating: number, pointsThisRound: number, name: string } }
    hiddenRatings: {}
  };

  // =========================================================================
  // DOM REFERENCES
  // =========================================================================
  const dom = {
    // Screens
    screenLobby: document.getElementById('screen-lobby'),
    screenRoom: document.getElementById('screen-room'),
    screenGame: document.getElementById('screen-game'),

    // Lobby
    playerNameInput: document.getElementById('player-name-input'),
    roomCodeInput: document.getElementById('room-code-input'),
    btnCreateRoom: document.getElementById('btn-create-room'),
    btnJoinRoom: document.getElementById('btn-join-room'),
    btnQuickSolo: document.getElementById('btn-quick-solo'),
    wsNetworkStatus: document.getElementById('ws-network-status'),
    btnOpenRulesLobby: document.getElementById('btn-open-rules-lobby'),

    // Staging / Room
    displayRoomCode: document.getElementById('display-room-code'),
    btnCopyRoom: document.getElementById('btn-copy-room'),
    btnLeaveRoom: document.getElementById('btn-leave-room'),
    roomReadyCount: document.getElementById('room-ready-count'),
    btnFillBots: document.getElementById('btn-fill-bots'),
    btnStartGame: document.getElementById('btn-start-game'),
    seatCards: {
      A1: document.getElementById('seat-A-1'),
      A2: document.getElementById('seat-A-2'),
      B1: document.getElementById('seat-B-1'),
      B2: document.getElementById('seat-B-2')
    },

    // Game Arena
    gameRoomIdTag: document.getElementById('game-room-id-tag'),
    gameRoundNumber: document.getElementById('game-round-number'),
    turnRotationNodes: {
      A1: document.querySelector('.node-a1'),
      B1: document.querySelector('.node-b1'),
      A2: document.querySelector('.node-a2'),
      B2: document.querySelector('.node-b2')
    },
    turnTitleLabel: document.getElementById('turn-title-label'),
    turnSubLabel: document.getElementById('turn-sub-label'),
    deckCountBadge: document.getElementById('deck-count-badge'),
    cemeteryCountPill: document.getElementById('cemetery-count-pill'),
    cemeteryCardStream: document.getElementById('cemetery-card-stream'),
    suitCensusChips: document.getElementById('suit-census-chips'),
    playerHandTeamBadge: document.getElementById('player-hand-team-badge'),
    handCardDock: document.getElementById('hand-card-dock'),
    btnPrivacyVisor: document.getElementById('btn-privacy-visor'),
    handSelectionCounter: document.getElementById('hand-selection-counter'),
    btnActionReveal: document.getElementById('btn-action-reveal'),
    revealSublabel: document.getElementById('reveal-sublabel'),
    btnActionGuess: document.getElementById('btn-action-guess'),
    btnGameRules: document.getElementById('btn-game-rules'),
    btnSoundToggle: document.getElementById('btn-sound-toggle'),

    // Modals
    modalGuess: document.getElementById('modal-guess'),
    btnCloseGuessModal: document.getElementById('btn-close-guess-modal'),
    btnConfirmGuess: document.getElementById('btn-confirm-guess'),
    suitGuessCards: document.querySelectorAll('.suit-guess-card'),

    modalRoundOver: document.getElementById('modal-round-over'),
    roundVictoryIcon: document.getElementById('round-victory-icon'),
    roundVictorySubtitle: document.getElementById('round-victory-subtitle'),
    roundVictoryTitle: document.getElementById('round-victory-title'),
    roundRevealedCardFrame: document.getElementById('round-revealed-card-frame'),
    hostRoundControls: document.getElementById('host-round-controls'),
    guestRoundWaiting: document.getElementById('guest-round-waiting'),
    btnNextRoundStandard: document.getElementById('btn-next-round-standard'),
    btnEqualizeRebalance: document.getElementById('btn-equalize-rebalance'),
    btnExitRoundOver: document.getElementById('btn-exit-round-over'),
    btnExitGame: document.getElementById('btn-exit-game'),

    modalConfirmExit: document.getElementById('modal-confirm-exit'),
    btnCancelExit: document.getElementById('btn-cancel-exit'),
    btnConfirmExit: document.getElementById('btn-confirm-exit'),
    confirmExitDescription: document.getElementById('confirm-exit-description'),

    modalMatrixDossier: document.getElementById('modal-matrix-dossier'),
    btnCloseDossier: document.getElementById('btn-close-dossier'),
    toastContainer: document.getElementById('toast-container')
  };

  // =========================================================================
  // UTILITIES & HELPERS
  // =========================================================================
  function generateRoomId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  function generatePlayerId() {
    return 'ply_' + Math.random().toString(36).substring(2, 9);
  }

  function showToast(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    dom.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      setTimeout(() => toast.remove(), 250);
    }, duration);
  }

  function switchScreen(screenName) {
    [dom.screenLobby, dom.screenRoom, dom.screenGame].forEach(s => s.classList.remove('active'));
    if (screenName === 'lobby') dom.screenLobby.classList.add('active');
    else if (screenName === 'staging') dom.screenRoom.classList.add('active');
    else if (screenName === 'game') dom.screenGame.classList.add('active');
  }

  function saveLocalSession() {
    const payload = {
      roomId: local.roomId,
      playerId: local.playerId,
      playerName: local.playerName,
      isHost: local.isHost,
      myTeam: local.myTeam,
      mySlot: local.mySlot,
      gameState: local.isHost ? gameState : null
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) { /* ignore */ }
  }

  function clearLocalSession() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
  }

  // =========================================================================
  // CARD DECK & DEDUCTIVE MATRIX BUILDER
  // =========================================================================
  function createFullDeck() {
    const deck = [];
    SUITS.forEach(suit => {
      for (let i = 0; i < CARDS_PER_SUIT; i++) {
        deck.push(suit);
      }
    });
    // Strict Fisher-Yates Shuffle
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  function renderCardHTML(suit, isMini = false) {
    if (isMini) {
      return `
        <div class="mini-cemetery-card suit-color-${suit}" title="${suit.toUpperCase()}">
          <svg viewBox="0 0 100 100"><use href="#suit-${suit}"></use></svg>
        </div>
      `;
    }
    return `
      <div class="luxury-card card-faceup suit-color-${suit}">
        <div class="card-pip-top">
          <svg class="card-mini-svg"><use href="#suit-${suit}"></use></svg>
        </div>
        <div class="card-center-suit">
          <svg class="card-hero-svg"><use href="#suit-${suit}"></use></svg>
        </div>
        <div class="card-pip-bottom">
          <svg class="card-mini-svg"><use href="#suit-${suit}"></use></svg>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // REALTIME MULTI-DEVICE NETWORKING (High-Performance MQTT Cloud + Local Bus)
  // =========================================================================
  function getRoomTopic(roomId, subtopic) {
    return `acma/v2/${String(roomId).toUpperCase()}/${subtopic}`;
  }

  function disconnectNetwork() {
    clearTimeout(local.reconnectTimer);
    if (local.mqttClient) {
      try {
        local.mqttClient.disconnect();
      } catch (e) {}
      local.mqttClient = null;
    }
    if (local.broadcastChannel) {
      try {
        local.broadcastChannel.close();
      } catch (e) {}
      local.broadcastChannel = null;
    }
    local.isConnected = false;
  }

  function initNetwork(onConnectedCallback) {
    if (!local.roomId) return;

    // Disconnect any existing sessions first
    disconnectNetwork();

    // 1. Local BroadcastChannel for instant zero-latency multi-tab testing
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        local.broadcastChannel = new BroadcastChannel(`acma_bc_${local.roomId}`);
        local.broadcastChannel.onmessage = (event) => {
          handleIncomingPacket(event.data);
        };
      } catch (e) {
        console.warn('BroadcastChannel not available:', e);
      }
    }

    // 2. Connect to Public High-Capacity MQTT Broker
    connectMqttBroker(0, onConnectedCallback);
  }

  function connectMqttBroker(brokerIdx, onConnectedCallback) {
    if (brokerIdx >= MQTT_BROKERS.length) {
      brokerIdx = 0;
    }
    const broker = MQTT_BROKERS[brokerIdx];
    const shortName = broker.name.split(' ')[0];

    dom.wsNetworkStatus.textContent = `Connecting to ${shortName}...`;
    dom.wsNetworkStatus.previousElementSibling.style.background = '#f59e0b';

    const clientId = 'acma_' + local.playerId + '_' + Math.random().toString(36).substring(2, 6);

    if (typeof Paho === 'undefined' || !Paho.MQTT) {
      console.warn('Paho MQTT unavailable, operating in local bus mode');
      dom.wsNetworkStatus.textContent = `Local Multi-Tab Live`;
      dom.wsNetworkStatus.previousElementSibling.style.background = '#10b981';
      if (onConnectedCallback) onConnectedCallback();
      return;
    }

    try {
      local.mqttClient = new Paho.MQTT.Client(broker.host, broker.port, broker.path, clientId);
    } catch (err) {
      console.error('MQTT Client initialization error:', err);
      tryNextBroker(brokerIdx, onConnectedCallback);
      return;
    }

    local.mqttClient.onConnectionLost = (responseObject) => {
      local.isConnected = false;
      console.warn('[ACMA MQTT] Connection lost:', responseObject.errorMessage);
      dom.wsNetworkStatus.textContent = 'Network: Reconnecting...';
      dom.wsNetworkStatus.previousElementSibling.style.background = '#ef4444';

      clearTimeout(local.reconnectTimer);
      local.reconnectTimer = setTimeout(() => {
        if (local.roomId) {
          connectMqttBroker(brokerIdx, onConnectedCallback);
        }
      }, 3000);
    };

    local.mqttClient.onMessageArrived = (message) => {
      try {
        handleIncomingPacket(message.payloadString);
      } catch (err) {
        console.warn('Packet handle error:', err);
      }
    };

    local.mqttClient.connect({
      useSSL: true,
      timeout: 6,
      keepAliveInterval: 30,
      cleanSession: true,
      onSuccess: () => {
        local.isConnected = true;
        console.log(`[ACMA MQTT] Connected to ${broker.name} (Room: ${local.roomId})`);
        dom.wsNetworkStatus.textContent = `Room ${local.roomId} Online (${shortName})`;
        dom.wsNetworkStatus.previousElementSibling.style.background = '#10b981';

        // Subscribe to State and Action topics
        const stateTopic = getRoomTopic(local.roomId, 'state');
        const actionTopic = getRoomTopic(local.roomId, 'actions');

        try {
          local.mqttClient.subscribe(stateTopic, { qos: 1 });
          local.mqttClient.subscribe(actionTopic, { qos: 1 });
        } catch (e) {
          console.warn('Subscribe error:', e);
        }

        if (onConnectedCallback) onConnectedCallback();
      },
      onFailure: (err) => {
        console.warn(`[ACMA MQTT] Failed to connect to ${broker.name}:`, err);
        tryNextBroker(brokerIdx, onConnectedCallback);
      }
    });
  }

  function tryNextBroker(failedIdx, onConnectedCallback) {
    const nextIdx = (failedIdx + 1) % MQTT_BROKERS.length;
    const nextBrokerName = MQTT_BROKERS[nextIdx].name.split(' ')[0];
    dom.wsNetworkStatus.textContent = `Connecting to ${nextBrokerName}...`;
    clearTimeout(local.reconnectTimer);
    local.reconnectTimer = setTimeout(() => {
      if (local.roomId) {
        connectMqttBroker(nextIdx, onConnectedCallback);
      }
    }, 1500);
  }

  function broadcastPacket(type, payload = {}) {
    if (!local.roomId) return;

    const packet = {
      roomId: local.roomId,
      senderId: local.playerId,
      type: type,
      payload: payload,
      timestamp: Date.now()
    };
    const jsonStr = JSON.stringify(packet);

    // 1. BroadcastChannel (for instant multi-tab testing)
    if (local.broadcastChannel) {
      try {
        local.broadcastChannel.postMessage(jsonStr);
      } catch (e) {}
    }

    // 2. MQTT Cloud Relay
    if (local.mqttClient && local.isConnected) {
      try {
        const isState = (type === 'SYNC_STATE');
        const targetSubtopic = isState ? 'state' : 'actions';
        const topic = getRoomTopic(local.roomId, targetSubtopic);

        const message = new Paho.MQTT.Message(jsonStr);
        message.destinationName = topic;
        message.qos = 1;
        // Retain state so that ANY device connecting immediately receives latest room state from broker!
        if (isState) {
          message.retained = true;
        }
        local.mqttClient.send(message);
      } catch (err) {
        console.warn('[ACMA MQTT] Broadcast error:', err);
      }
    }
  }

  function handleIncomingPacket(rawData) {
    let packet;
    try {
      packet = (typeof rawData === 'string') ? JSON.parse(rawData) : rawData;
    } catch (e) {
      return;
    }
    if (packet && typeof packet.data === 'string') {
      try { packet = JSON.parse(packet.data); } catch (e) { return; }
    } else if (packet && packet.data && packet.data.type) {
      packet = packet.data;
    }

    // Strict multi-device room isolation: ignore packets from other rooms
    if (!packet || !packet.roomId || packet.roomId.toUpperCase() !== (local.roomId || '').toUpperCase()) return;

    // Ignore packets sent by myself (unless it is SYNC_STATE when I'm not host)
    if (packet.senderId === local.playerId && packet.type !== 'SYNC_STATE') return;

    const { type, payload, senderId } = packet;

    // Handle messages based on host or client authority
    switch (type) {
      case 'SYNC_STATE':
        // Host has broadcast authoritative state
        onStateSynchronized(payload);
        break;

      case 'REQUEST_CLAIM_SEAT':
        if (local.isHost) {
          hostHandleClaimSeat(payload.seatKey, payload.playerId, payload.playerName);
        }
        break;

      case 'REQUEST_START_GAME':
        if (local.isHost) {
          hostStartNewRound();
        }
        break;

      case 'REQUEST_ACTION_REVEAL':
        if (local.isHost) {
          hostExecuteReveal(payload.playerSeat, payload.cardIndices);
        }
        break;

      case 'REQUEST_ACTION_GUESS':
        if (local.isHost) {
          hostExecuteGuess(payload.playerSeat, payload.guessedSuit);
        }
        break;

      case 'REQUEST_NEXT_ROUND':
        if (local.isHost) {
          hostStartNewRound(false);
        }
        break;

      case 'REQUEST_EQUALIZED_REBALANCE':
        if (local.isHost) {
          hostExecuteEqualizeAndRebalance();
        }
        break;

      case 'PLAYER_JOIN':
      case 'PLAYER_REJOIN':
      case 'REQUEST_STATE':
        if (local.isHost) {
          hostHandleRejoin(senderId, payload.playerName);
        }
        break;

      case 'PLAYER_LEFT':
        handlePlayerLeftPacket(payload);
        break;

      default:
        break;
    }
  }

  function handlePlayerLeftPacket(payload) {
    if (!payload) return;

    if (payload.isHost) {
      showToast('The Room Host left. Session ended.', 'error', 3500);
      executeExitRoom(false);
      return;
    }

    if (local.isHost) {
      const seatKey = payload.seatKey;
      if (seatKey && gameState.players[seatKey] && gameState.players[seatKey].id === payload.playerId) {
        if (gameState.status === 'playing') {
          // Replace with AI Operative so 2v2 rotation loop continues without freezing
          const botId = 'bot_' + Math.random().toString(36).substring(2, 7);
          const botName = (payload.playerName || 'Operative') + ' [AI]';
          gameState.players[seatKey] = { id: botId, name: botName, isBot: true };
          gameState.hiddenRatings[botId] = { rating: 1000, pointsThisRound: 0, name: botName };
          showToast(`${payload.playerName} abandoned match. AI operative substituted.`, 'info', 2500);
          hostBroadcastState();
          checkAndTriggerBotTurn();
        } else if (gameState.status === 'staging') {
          gameState.players[seatKey] = null;
          showToast(`${payload.playerName} vacated seat.`, 'info', 2000);
          hostBroadcastState();
        }
      }
    } else {
      showToast(`${payload.playerName} left the match.`, 'info', 2000);
    }
  }

  // =========================================================================
  // HOST AUTHORITATIVE GAME LOGIC & MATRIX MATH
  // =========================================================================
  function hostInitializeRoom(roomId) {
    gameState = {
      roomId: roomId,
      status: 'staging',
      roundNumber: 1,
      turnIndex: 0,
      deck: [],
      targetCard: null,
      teamAHand: [],
      teamBHand: [],
      cemetery: [],
      eliminatedSuits: [],
      winner: null,
      players: {
        A1: { id: local.playerId, name: local.playerName, isBot: false },
        A2: null,
        B1: null,
        B2: null
      },
      hiddenRatings: {
        [local.playerId]: { rating: 1000, pointsThisRound: 0, name: local.playerName }
      }
    };

    local.myTeam = 'A';
    local.mySlot = 1;
    hostBroadcastState();
  }

  function hostBroadcastState() {
    const stateForBroadcast = JSON.parse(JSON.stringify(gameState));
    if (stateForBroadcast.status === 'playing') {
      stateForBroadcast.targetCard = null;
    }
    delete stateForBroadcast.hiddenRatings;
    broadcastPacket('SYNC_STATE', stateForBroadcast);
    saveLocalSession();
    onStateSynchronized(gameState);
  }

  function hostHandleClaimSeat(seatKey, playerId, playerName) {
    if (!gameState.players[seatKey] || gameState.players[seatKey].isBot) {
      // Remove player from any previous seat
      for (const key in gameState.players) {
        if (gameState.players[key] && gameState.players[key].id === playerId) {
          gameState.players[key] = null;
        }
      }
      gameState.players[seatKey] = { id: playerId, name: playerName, isBot: false };
      if (!gameState.hiddenRatings[playerId]) {
        gameState.hiddenRatings[playerId] = { rating: 1000, pointsThisRound: 0, name: playerName };
      }
      hostBroadcastState();
    }
  }

  function hostHandleRejoin(playerId, playerName) {
    let wasSeated = false;
    for (const key in gameState.players) {
      if (gameState.players[key] && gameState.players[key].id === playerId) {
        gameState.players[key].name = playerName;
        wasSeated = true;
        break;
      }
    }
    if (!wasSeated) {
      showToast(`${playerName || 'Operative'} entered the room`, 'info', 2200);
    }
    // Immediately blast authoritative room state so guest syncs without delay
    hostBroadcastState();
  }

  function hostStartNewRound(isFreshRoundOne = true) {
    // Reset round scores
    for (const pid in gameState.hiddenRatings) {
      gameState.hiddenRatings[pid].pointsThisRound = 0;
    }

    // Mathematical matrix: exactly 15 cards
    const deck = createFullDeck();
    
    // 1 card pulled into hidden targetCard
    const targetCard = deck.pop();

    // 3 cards dealt to Team A, 3 cards dealt to Team B
    const teamAHand = [deck.pop(), deck.pop(), deck.pop()];
    const teamBHand = [deck.pop(), deck.pop(), deck.pop()];

    // Remaining 8 cards stay in draw deck
    gameState.deck = deck;
    gameState.targetCard = targetCard;
    gameState.teamAHand = teamAHand;
    gameState.teamBHand = teamBHand;
    gameState.cemetery = [];
    gameState.eliminatedSuits = [];
    gameState.winner = null;
    gameState.turnIndex = 0; // A1 starts round
    gameState.status = 'playing';

    if (!isFreshRoundOne) {
      gameState.roundNumber += 1;
    }

    hostBroadcastState();

    // If active player is a bot, trigger bot turn
    checkAndTriggerBotTurn();
  }

  // =========================================================================
  // ACTION 1: REVEAL & DRAW
  // =========================================================================
  function hostExecuteReveal(playerSeat, cardIndices) {
    if (gameState.status !== 'playing') return;

    const currentTurn = TURN_ROTATION_ORDER[gameState.turnIndex];
    const expectedSeat = `${currentTurn.team}${currentTurn.slot}`;
    if (playerSeat !== expectedSeat) {
      console.warn('Action attempted out of turn');
      return;
    }

    const team = currentTurn.team;
    const teamHand = team === 'A' ? gameState.teamAHand : gameState.teamBHand;
    const activePlayer = gameState.players[expectedSeat];

    // Validate indices: 1 to 3 selected
    if (!Array.isArray(cardIndices) || cardIndices.length < 1 || cardIndices.length > 3) return;

    // Sort indices descending to splice safely
    const sortedIndices = [...new Set(cardIndices)].sort((a, b) => b - a);
    const revealedCards = [];

    sortedIndices.forEach(idx => {
      if (idx >= 0 && idx < teamHand.length) {
        const [card] = teamHand.splice(idx, 1);
        if (card) {
          revealedCards.push(card);
          gameState.cemetery.push(card);
        }
      }
    });

    // Draw replacements from deck
    const countToDraw = revealedCards.length;
    for (let i = 0; i < countToDraw; i++) {
      if (gameState.deck.length > 0) {
        teamHand.push(gameState.deck.pop());
      }
    }

    // Invisible Points System: +10 points to active player's round score
    if (activePlayer && gameState.hiddenRatings[activePlayer.id]) {
      gameState.hiddenRatings[activePlayer.id].pointsThisRound += 10;
    }

    // Advance turn to next in strict 4-player rotation loop
    gameState.turnIndex = (gameState.turnIndex + 1) % 4;

    hostBroadcastState();
    checkAndTriggerBotTurn();
  }

  // =========================================================================
  // ACTION 2: SUBMIT GUESS
  // =========================================================================
  function hostExecuteGuess(playerSeat, guessedSuit) {
    if (gameState.status !== 'playing') return;

    const currentTurn = TURN_ROTATION_ORDER[gameState.turnIndex];
    const expectedSeat = `${currentTurn.team}${currentTurn.slot}`;
    if (playerSeat !== expectedSeat) return;

    const activePlayer = gameState.players[expectedSeat];
    const targetSuit = gameState.targetCard;

    if (guessedSuit === targetSuit) {
      // 🏆 CORRECT GUESS: Instant win for active player's team!
      gameState.winner = currentTurn.team;
      gameState.status = 'round_over';

      // Points: +50 points to BOTH teammates on winning team
      const winningTeamSeats = currentTurn.team === 'A' ? ['A1', 'A2'] : ['B1', 'B2'];
      winningTeamSeats.forEach(seatKey => {
        const ply = gameState.players[seatKey];
        if (ply && gameState.hiddenRatings[ply.id]) {
          gameState.hiddenRatings[ply.id].pointsThisRound += 50;
        }
      });

      // Calculate recency-weighted rating formula for all 4 players:
      // newRating = (pointsThisRound * 0.7) + (previousRating * 0.3)
      for (const pid in gameState.hiddenRatings) {
        const record = gameState.hiddenRatings[pid];
        const points = record.pointsThisRound || 0;
        const prev = record.rating || 1000;
        record.rating = Math.round((points * 0.7) + (prev * 0.3));
      }

      hostBroadcastState();
    } else {
      // ❌ INCORRECT GUESS: Error state, suit deactivated globally, -30 points from active player
      if (!gameState.eliminatedSuits.includes(guessedSuit)) {
        gameState.eliminatedSuits.push(guessedSuit);
      }

      if (activePlayer && gameState.hiddenRatings[activePlayer.id]) {
        gameState.hiddenRatings[activePlayer.id].pointsThisRound -= 30;
      }

      // Advance turn rotation
      gameState.turnIndex = (gameState.turnIndex + 1) % 4;

      hostBroadcastState();
      checkAndTriggerBotTurn();
    }
  }

  // =========================================================================
  // THE EQUALIZE & REBALANCE MATRIX ENGINE
  // =========================================================================
  function hostExecuteEqualizeAndRebalance() {
    if (gameState.status !== 'round_over') return;

    // Gather all 4 players and their computed performance rating
    const seatKeys = ['A1', 'A2', 'B1', 'B2'];
    const activeOperatives = [];

    seatKeys.forEach(seat => {
      const p = gameState.players[seat];
      if (p) {
        const r = (gameState.hiddenRatings[p.id] && gameState.hiddenRatings[p.id].rating) || 1000;
        activeOperatives.push({ ...p, currentRating: r, originalSeat: seat });
      }
    });

    if (activeOperatives.length < 4) {
      showToast('Need 4 seated players to execute Rebalance Matrix', 'error');
      return;
    }

    // 1. Sort all 4 connected players by computed rating from highest to lowest
    activeOperatives.sort((a, b) => b.currentRating - a.currentRating);

    // 2. Automatically assign Rank 1 (highest) and Rank 4 (lowest) to form new Team A
    const newTeamA_P1 = activeOperatives[0]; // Rank 1
    const newTeamA_P2 = activeOperatives[3]; // Rank 4

    // 3. Automatically assign Rank 2 and Rank 3 to form new Team B
    const newTeamB_P1 = activeOperatives[1]; // Rank 2
    const newTeamB_P2 = activeOperatives[2]; // Rank 3

    gameState.players = {
      A1: { id: newTeamA_P1.id, name: newTeamA_P1.name, isBot: newTeamA_P1.isBot },
      A2: { id: newTeamA_P2.id, name: newTeamA_P2.name, isBot: newTeamA_P2.isBot },
      B1: { id: newTeamB_P1.id, name: newTeamB_P1.name, isBot: newTeamB_P1.isBot },
      B2: { id: newTeamB_P2.id, name: newTeamB_P2.name, isBot: newTeamB_P2.isBot }
    };

    // 4. Flush all hands, reset deck array pointer, and kick off next round seamlessly!
    hostStartNewRound(false);
  }

  // =========================================================================
  // BOT AUTOMATION (For Solo Auditing & Testing Seamlessly)
  // =========================================================================
  function hostFillBots() {
    const botNames = ['Vesper-AI', 'Phantom-AI', 'Cipher-AI', 'Sol-AI'];
    let nameIdx = 0;
    ['A1', 'A2', 'B1', 'B2'].forEach(seat => {
      if (!gameState.players[seat]) {
        const bId = 'bot_' + Math.random().toString(36).substring(2, 7);
        const bName = botNames[nameIdx++ % botNames.length];
        gameState.players[seat] = { id: bId, name: bName, isBot: true };
        gameState.hiddenRatings[bId] = { rating: 1000, pointsThisRound: 0, name: bName };
      }
    });
    hostBroadcastState();
  }

  function checkAndTriggerBotTurn() {
    if (!local.isHost || gameState.status !== 'playing') return;

    const currentTurn = TURN_ROTATION_ORDER[gameState.turnIndex];
    const seatKey = `${currentTurn.team}${currentTurn.slot}`;
    const activePlayer = gameState.players[seatKey];

    if (activePlayer && activePlayer.isBot) {
      setTimeout(() => {
        executeBotDecision(seatKey, currentTurn.team);
      }, 1100);
    }
  }

  function executeBotDecision(seatKey, team) {
    if (gameState.status !== 'playing') return;

    const teamHand = team === 'A' ? gameState.teamAHand : gameState.teamBHand;
    const cemetery = gameState.cemetery;
    const eliminated = gameState.eliminatedSuits;

    // Bot deductive intelligence: count seen suits
    const visibleCounts = { spades: 0, hearts: 0, diamonds: 0, clubs: 0, demon: 0 };
    teamHand.forEach(s => visibleCounts[s] = (visibleCounts[s] || 0) + 1);
    cemetery.forEach(s => visibleCounts[s] = (visibleCounts[s] || 0) + 1);

    const candidates = SUITS.filter(s => {
      if (eliminated.includes(s)) return false;
      if (visibleCounts[s] >= 3) return false; // Impossible to be target
      return true;
    });

    // If bot has eliminated all candidates down to 1 suit, GUESS!
    if (candidates.length === 1 && Math.random() < 0.95) {
      hostExecuteGuess(seatKey, candidates[0]);
      return;
    }

    // 25% chance to attempt guess if candidates <= 2
    if (candidates.length <= 2 && Math.random() < 0.35) {
      const chosenSuit = candidates[Math.floor(Math.random() * candidates.length)];
      hostExecuteGuess(seatKey, chosenSuit);
      return;
    }

    // Otherwise Reveal & Draw: pick 1 or 2 duplicate or known cards
    const numToReveal = Math.min(teamHand.length, Math.floor(Math.random() * 2) + 1);
    const chosenIndices = [];
    for (let i = 0; i < numToReveal; i++) {
      chosenIndices.push(i);
    }
    hostExecuteReveal(seatKey, chosenIndices);
  }

  // =========================================================================
  // CLIENT STATE RE-RENDER & SYNCHRONIZATION
  // =========================================================================
  function onStateSynchronized(newState) {
    const prevState = JSON.parse(JSON.stringify(gameState));
    if (local.isHost && gameState.hiddenRatings && newState !== gameState) {
      if (!newState.hiddenRatings) newState.hiddenRatings = gameState.hiddenRatings;
      if (gameState.status === 'playing' && !newState.targetCard) newState.targetCard = gameState.targetCard;
    }
    gameState = newState;
    saveLocalSession();

    // Detect my current seat in the room
    local.myTeam = null;
    local.mySlot = null;
    for (const seatKey in gameState.players) {
      const p = gameState.players[seatKey];
      if (p && p.id === local.playerId) {
        local.myTeam = seatKey.charAt(0);
        local.mySlot = parseInt(seatKey.charAt(1), 10);
        break;
      }
    }

    // Handle screen transition
    if (gameState.status === 'staging') {
      switchScreen('staging');
      renderStagingScreen();
    } else if (gameState.status === 'playing' || gameState.status === 'round_over') {
      switchScreen('game');
      renderGameScreen(prevState);
    }
  }

  // Render Staging / Room Seats
  function renderStagingScreen() {
    dom.displayRoomCode.textContent = gameState.roomId || '----';

    let seatedCount = 0;
    ['A1', 'A2', 'B1', 'B2'].forEach(seatKey => {
      const seatCard = dom.seatCards[seatKey];
      const occupant = gameState.players[seatKey];
      const occupantEl = seatCard.querySelector('.seat-occupant');
      const claimBtn = seatCard.querySelector('.btn-seat-claim');

      seatCard.classList.remove('occupied', 'self-occupied');

      if (occupant) {
        seatedCount++;
        seatCard.classList.add('occupied');
        occupantEl.textContent = occupant.name + (occupant.isBot ? ' [BOT]' : '');
        if (occupant.id === local.playerId) {
          seatCard.classList.add('self-occupied');
          claimBtn.textContent = 'YOU';
          claimBtn.disabled = true;
        } else {
          claimBtn.textContent = 'SEATED';
          claimBtn.disabled = true;
        }
      } else {
        occupantEl.textContent = 'OPEN SEAT';
        claimBtn.textContent = 'CLAIM SEAT';
        claimBtn.disabled = false;
      }
    });

    dom.roomReadyCount.textContent = `${seatedCount}/4 SEATED`;

    // Only host can start game or fill bots
    if (local.isHost) {
      dom.btnFillBots.style.display = 'block';
      dom.btnStartGame.style.display = 'block';
      dom.btnStartGame.disabled = seatedCount < 4;
    } else {
      dom.btnFillBots.style.display = 'none';
      dom.btnStartGame.style.display = 'none';
    }
  }

  // Render Active Match Arena
  function renderGameScreen(prevState) {
    dom.gameRoomIdTag.textContent = gameState.roomId;
    dom.gameRoundNumber.textContent = gameState.roundNumber;
    dom.deckCountBadge.textContent = gameState.deck ? gameState.deck.length : 8;

    // Detect state changes for auditory & toast cues
    if (prevState && prevState.status === 'playing') {
      // Check for newly eliminated suits
      if (gameState.eliminatedSuits && prevState.eliminatedSuits && gameState.eliminatedSuits.length > prevState.eliminatedSuits.length) {
        const lastEliminated = gameState.eliminatedSuits[gameState.eliminatedSuits.length - 1];
        sound.playErrorBuzz();
        vibrateDevice([100, 60, 100]);
        showToast(`❌ Deduction failed: ${lastEliminated.toUpperCase()} suit eliminated!`, 'error', 2600);
      }
      // Check for newly revealed cards in cemetery
      else if (gameState.cemetery && prevState.cemetery && gameState.cemetery.length > prevState.cemetery.length) {
        const diff = gameState.cemetery.length - prevState.cemetery.length;
        sound.playCardDeal();
        showToast(`🪦 ${diff} card${diff > 1 ? 's' : ''} moved to public cemetery`, 'info', 1800);
      }
    }

    // 1. Turn Rotation HUD & Active Banner
    const currentTurn = TURN_ROTATION_ORDER[gameState.turnIndex];
    const activeSeatKey = `${currentTurn.team}${currentTurn.slot}`;
    const activePlayer = gameState.players[activeSeatKey];
    const isMyTurn = (local.myTeam === currentTurn.team && local.mySlot === currentTurn.slot);

    // Update 4-node rotation indicator
    ['A1', 'B1', 'A2', 'B2'].forEach(key => {
      const node = dom.turnRotationNodes[key];
      if (node) {
        if (key === activeSeatKey) node.classList.add('active-turn');
        else node.classList.remove('active-turn');
      }
    });

    // Update Turn Banner
    const playerNameDisplay = activePlayer ? activePlayer.name : activeSeatKey;
    if (isMyTurn) {
      dom.turnTitleLabel.textContent = `⚡ YOUR TURN (${playerNameDisplay})`;
      dom.turnSubLabel.textContent = 'Select 1-3 cards to Reveal & Draw OR Submit Final Deduction';
      sound.playTurnChime();
      vibrateDevice([30, 50, 30]);
    } else {
      dom.turnTitleLabel.textContent = `${playerNameDisplay}'s TURN (${currentTurn.label})`;
      dom.turnSubLabel.textContent = 'Analyzing vector frequencies...';
    }

    // 2. Cemetery & Live Census
    renderCemeteryStream();
    updateSuitCensus();

    // 3. Shared Team Hand (Strict Local Isolation)
    renderSharedTeamHand(isMyTurn);

    // 4. Action Console Buttons
    updateActionConsole(isMyTurn);

    // 5. Check if round concluded
    if (gameState.status === 'round_over') {
      renderRoundOverModal();
    } else {
      dom.modalRoundOver.classList.remove('active');
    }
  }

  function renderCemeteryStream() {
    const cemetery = gameState.cemetery || [];
    dom.cemeteryCountPill.textContent = `${cemetery.length} CARDS`;

    if (cemetery.length === 0) {
      dom.cemeteryCardStream.innerHTML = '<div class="cemetery-empty-state">No cards revealed yet this round.</div>';
      return;
    }

    dom.cemeteryCardStream.innerHTML = cemetery.map(suit => renderCardHTML(suit, true)).join('');
    // Auto-scroll stream to end on new card
    dom.cemeteryCardStream.parentElement.scrollLeft = dom.cemeteryCardStream.parentElement.scrollWidth;
  }

  function updateSuitCensus() {
    const census = { spades: 0, hearts: 0, diamonds: 0, clubs: 0, demon: 0 };
    (gameState.cemetery || []).forEach(suit => {
      if (census[suit] !== undefined) census[suit]++;
    });

    SUITS.forEach(suit => {
      const chip = dom.suitCensusChips.querySelector(`[data-suit="${suit}"]`);
      if (chip) {
        const count = census[suit];
        chip.querySelector('.census-val').textContent = `${count}/3`;
        if (count >= 3 || (gameState.eliminatedSuits || []).includes(suit)) {
          chip.classList.add('depleted');
        } else {
          chip.classList.remove('depleted');
        }
      }
    });
  }

  function renderSharedTeamHand(isMyTurn) {
    const team = local.myTeam || 'A';
    const hand = team === 'A' ? (gameState.teamAHand || []) : (gameState.teamBHand || []);
    dom.playerHandTeamBadge.textContent = `TEAM ${team === 'A' ? 'ALPHA' : 'OMEGA'} HAND (SHARED)`;

    // Clean up local indices if hand length changed
    local.selectedHandIndices = local.selectedHandIndices.filter(i => i < hand.length);

    // Apply hand-masking / privacy visor
    if (local.isHandMasked) {
      dom.handCardDock.classList.add('hand-masked');
      dom.handCardDock.innerHTML = `
        <div class="hand-mask-shield-overlay" id="mask-shield-overlay">
          <span>🔒 PRIVACY SHIELD ACTIVE</span>
          <small>Tap anywhere to reveal hand</small>
        </div>
      `;
      document.getElementById('mask-shield-overlay').addEventListener('click', togglePrivacyVisor);
      return;
    }

    dom.handCardDock.classList.remove('hand-masked');

    if (hand.length === 0) {
      dom.handCardDock.innerHTML = '<div class="hand-placeholder">All cards in hand revealed.</div>';
      return;
    }

    dom.handCardDock.innerHTML = hand.map((suit, idx) => {
      const isSelected = local.selectedHandIndices.includes(idx);
      return `
        <div class="hand-card-slot" data-index="${idx}">
          <div class="hand-card ${isSelected ? 'selected' : ''}">
            ${renderCardHTML(suit, false)}
          </div>
          ${isSelected ? `<div class="card-select-badge">${local.selectedHandIndices.indexOf(idx) + 1}</div>` : ''}
        </div>
      `;
    }).join('');

    // Attach local client-side selection touch listeners
    dom.handCardDock.querySelectorAll('.hand-card-slot').forEach(slot => {
      // Use touchend for clean mobile interaction without sticky hover
      slot.addEventListener('pointerup', (e) => {
        e.preventDefault();
        const idx = parseInt(slot.dataset.index, 10);
        handleLocalCardSelection(idx, isMyTurn);
      });
    });

    // Update Selection Hint
    const selCount = local.selectedHandIndices.length;
    if (selCount === 0) {
      dom.handSelectionCounter.textContent = isMyTurn 
        ? 'Tap 1 to 3 cards to Reveal & Draw replacements' 
        : 'Standby: Teammate or Opponent is calculating move';
    } else {
      dom.handSelectionCounter.textContent = `${selCount} card${selCount > 1 ? 's' : ''} selected to Reveal & Draw`;
    }
  }

  function handleLocalCardSelection(cardIndex, isMyTurn) {
    if (!isMyTurn) {
      showToast('Wait for your turn in the rotation loop', 'info', 1800);
      return;
    }

    sound.playCardTap();
    vibrateDevice(12);

    const pos = local.selectedHandIndices.indexOf(cardIndex);
    if (pos >= 0) {
      local.selectedHandIndices.splice(pos, 1);
    } else {
      if (local.selectedHandIndices.length >= 3) {
        showToast('Maximum 3 cards can be revealed per turn', 'info');
        return;
      }
      local.selectedHandIndices.push(cardIndex);
    }

    // Re-render local hand view immediately without triggering network broadcast
    renderSharedTeamHand(isMyTurn);
    updateActionConsole(isMyTurn);
  }

  function updateActionConsole(isMyTurn) {
    const selCount = local.selectedHandIndices.length;
    
    // Reveal & Draw button
    if (isMyTurn && selCount >= 1 && selCount <= 3) {
      dom.btnActionReveal.disabled = false;
      dom.btnActionReveal.classList.add('ready-to-act');
      dom.revealSublabel.textContent = `(Reveal ${selCount} & Draw)`;
    } else {
      dom.btnActionReveal.disabled = true;
      dom.btnActionReveal.classList.remove('ready-to-act');
      dom.revealSublabel.textContent = isMyTurn ? '(Select 1-3 Cards)' : '(Not Your Turn)';
    }

    // Submit Guess button
    dom.btnActionGuess.disabled = !isMyTurn;
  }

  // =========================================================================
  // PRIVACY VISOR (Screen Peeking Shield)
  // =========================================================================
  function togglePrivacyVisor() {
    local.isHandMasked = !local.isHandMasked;
    vibrateDevice(15);

    if (local.isHandMasked) {
      dom.btnPrivacyVisor.classList.add('visor-shield-active');
      dom.btnPrivacyVisor.querySelector('.visor-text').textContent = 'UNMASK';
    } else {
      dom.btnPrivacyVisor.classList.remove('visor-shield-active');
      dom.btnPrivacyVisor.querySelector('.visor-text').textContent = 'HIDE HAND';
    }

    const currentTurn = TURN_ROTATION_ORDER[gameState.turnIndex];
    const isMyTurn = (local.myTeam === currentTurn.team && local.mySlot === currentTurn.slot);
    renderSharedTeamHand(isMyTurn);
  }

  // =========================================================================
  // SUBMIT GUESS MODAL LOGIC
  // =========================================================================
  function openGuessModal() {
    local.selectedGuessSuit = null;
    dom.btnConfirmGuess.disabled = true;

    // Update suit availability in modal based on eliminated suits
    const eliminated = gameState.eliminatedSuits || [];
    dom.suitGuessCards.forEach(card => {
      const suit = card.dataset.suit;
      const tag = card.querySelector('.suit-status-tag');
      card.classList.remove('selected-guess');

      if (eliminated.includes(suit)) {
        card.disabled = true;
        tag.textContent = 'ELIMINATED';
        tag.classList.add('eliminated');
      } else {
        card.disabled = false;
        tag.textContent = 'AVAILABLE';
        tag.classList.remove('eliminated');
      }
    });

    dom.modalGuess.classList.add('active');
  }

  function closeGuessModal() {
    dom.modalGuess.classList.remove('active');
  }

  function onSelectGuessSuit(card) {
    if (card.disabled) return;
    sound.playCardTap();
    vibrateDevice(15);

    dom.suitGuessCards.forEach(c => c.classList.remove('selected-guess'));
    card.classList.add('selected-guess');
    local.selectedGuessSuit = card.dataset.suit;
    dom.btnConfirmGuess.disabled = false;
  }

  function confirmFinalGuess() {
    if (!local.selectedGuessSuit) return;
    const suit = local.selectedGuessSuit;
    closeGuessModal();

    const currentTurn = TURN_ROTATION_ORDER[gameState.turnIndex];
    const mySeat = `${local.myTeam}${local.mySlot}`;

    // Dispatch guess request
    if (local.isHost) {
      hostExecuteGuess(mySeat, suit);
    } else {
      broadcastPacket('REQUEST_ACTION_GUESS', {
        playerSeat: mySeat,
        guessedSuit: suit
      });
    }
  }

  // =========================================================================
  // ROUND OVER & VICTORY PRESENTATION
  // =========================================================================
  function renderRoundOverModal() {
    const isTeamAWinner = gameState.winner === 'A';
    dom.roundVictoryIcon.textContent = '🏆';
    dom.roundVictoryTitle.textContent = isTeamAWinner ? 'TEAM ALPHA WINS!' : 'TEAM OMEGA WINS!';
    dom.roundVictorySubtitle.textContent = `ROUND ${gameState.roundNumber} CONCLUDED`;

    // Render Revealed Target Card
    const targetSuit = gameState.targetCard || 'demon';
    dom.roundRevealedCardFrame.innerHTML = renderCardHTML(targetSuit, false);

    // Audio victory
    sound.playVictoryFanfare();
    vibrateDevice([50, 100, 50, 100]);

    // Host controls vs Guest waiting
    if (local.isHost) {
      dom.hostRoundControls.style.display = 'flex';
      dom.guestRoundWaiting.style.display = 'none';
    } else {
      dom.hostRoundControls.style.display = 'none';
      dom.guestRoundWaiting.style.display = 'block';
    }

    dom.modalRoundOver.classList.add('active');
  }

  // =========================================================================
  // EVENT LISTENERS & SETUP
  // =========================================================================
  function initEventListeners() {
    // 1. Audio toggle
    dom.btnSoundToggle.addEventListener('click', () => {
      sound.enabled = !sound.enabled;
      dom.btnSoundToggle.textContent = sound.enabled ? '🔊' : '🔇';
      showToast(sound.enabled ? 'Audio On' : 'Audio Muted', 'info', 1000);
    });

    // 2. Rules / Dossier Modal
    const openDossier = () => dom.modalMatrixDossier.classList.add('active');
    const closeDossier = () => dom.modalMatrixDossier.classList.remove('active');
    dom.btnOpenRulesLobby.addEventListener('click', openDossier);
    dom.btnGameRules.addEventListener('click', openDossier);
    dom.btnCloseDossier.addEventListener('click', closeDossier);

    // 3. Privacy Visor
    dom.btnPrivacyVisor.addEventListener('click', togglePrivacyVisor);

    // 4. Create Room
    dom.btnCreateRoom.addEventListener('click', () => {
      sound.init();
      const name = dom.playerNameInput.value.trim() || 'Operative-1';
      local.playerName = name;
      local.playerId = generatePlayerId();
      local.roomId = generateRoomId();
      local.isHost = true;

      saveLocalSession();
      hostInitializeRoom(local.roomId);
      showToast(`Room ${local.roomId} created`, 'success');
      initNetwork(() => hostBroadcastState());
    });

    // 5. Join Room
    dom.btnJoinRoom.addEventListener('click', () => {
      sound.init();
      const name = dom.playerNameInput.value.trim() || 'Operative-2';
      const code = dom.roomCodeInput.value.trim().toUpperCase();

      if (code.length !== 4) {
        showToast('Please enter a valid 4-character Room ID', 'error');
        return;
      }

      local.playerName = name;
      local.playerId = generatePlayerId();
      local.roomId = code;
      local.isHost = false;

      // Immediately switch joiner to staging screen with connecting feedback
      gameState.roomId = code;
      gameState.status = 'staging';
      switchScreen('staging');
      dom.displayRoomCode.textContent = code;
      dom.roomReadyCount.textContent = 'CONNECTING TO HOST...';

      saveLocalSession();
      initNetwork(() => {
        broadcastPacket('PLAYER_JOIN', { playerName: local.playerName });
        broadcastPacket('REQUEST_STATE', { playerName: local.playerName });
        showToast(`Connected to Room ${code}`, 'success');
      });
    });

    // 6. Quick Solo Practice Loop (Instant Audit for Developer)
    dom.btnQuickSolo.addEventListener('click', () => {
      sound.init();
      local.playerName = dom.playerNameInput.value.trim() || 'Auditor';
      local.playerId = generatePlayerId();
      local.roomId = generateRoomId();
      local.isHost = true;

      saveLocalSession();
      hostInitializeRoom(local.roomId);
      hostFillBots();
      hostStartNewRound(true);
      showToast('Solo Matrix Test Session Launched!', 'success');
      initNetwork(() => hostBroadcastState());
    });

    // 7. Staging Seat Selection
    ['A1', 'A2', 'B1', 'B2'].forEach(seatKey => {
      const seatCard = dom.seatCards[seatKey];
      const claimBtn = seatCard.querySelector('.btn-seat-claim');
      claimBtn.addEventListener('click', () => {
        sound.playCardTap();
        vibrateDevice(15);
        if (local.isHost) {
          hostHandleClaimSeat(seatKey, local.playerId, local.playerName);
        } else {
          broadcastPacket('REQUEST_CLAIM_SEAT', {
            seatKey: seatKey,
            playerId: local.playerId,
            playerName: local.playerName
          });
        }
      });
    });

    // 8. Host Staging Buttons
    dom.btnFillBots.addEventListener('click', () => {
      if (local.isHost) hostFillBots();
    });

    dom.btnStartGame.addEventListener('click', () => {
      if (local.isHost) hostStartNewRound(true);
    });

    // 9. Copy Room Code / Invite Link
    dom.btnCopyRoom.addEventListener('click', () => {
      const url = `${window.location.origin}${window.location.pathname}?room=${local.roomId}`;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(() => {
          showToast('Room link copied to clipboard!', 'success');
        });
      } else {
        showToast(`Room Code: ${local.roomId}`, 'info');
      }
    });

    // 10. Exit / Leave Room Controls (Staging, Midgame HUD, and Round Over Modal)
    dom.btnLeaveRoom.addEventListener('click', promptExitConfirmation);
    dom.btnExitGame.addEventListener('click', promptExitConfirmation);
    dom.btnExitRoundOver.addEventListener('click', promptExitConfirmation);

    dom.btnCancelExit.addEventListener('click', closeExitConfirmation);
    dom.btnConfirmExit.addEventListener('click', () => executeExitRoom(true));
    dom.modalConfirmExit.addEventListener('click', (e) => {
      if (e.target === dom.modalConfirmExit) closeExitConfirmation();
    });

    // 11. Reveal & Draw Action
    dom.btnActionReveal.addEventListener('click', () => {
      if (local.selectedHandIndices.length === 0) return;
      sound.playCardDeal();
      vibrateDevice(25);

      const indices = [...local.selectedHandIndices];
      local.selectedHandIndices = []; // Flush local selection
      const mySeat = `${local.myTeam}${local.mySlot}`;

      if (local.isHost) {
        hostExecuteReveal(mySeat, indices);
      } else {
        broadcastPacket('REQUEST_ACTION_REVEAL', {
          playerSeat: mySeat,
          cardIndices: indices
        });
      }
    });

    // 12. Guess Action & Modal
    dom.btnActionGuess.addEventListener('click', openGuessModal);
    dom.btnCloseGuessModal.addEventListener('click', closeGuessModal);
    dom.modalGuess.addEventListener('click', (e) => {
      if (e.target === dom.modalGuess) closeGuessModal();
    });
    dom.modalMatrixDossier.addEventListener('click', (e) => {
      if (e.target === dom.modalMatrixDossier) closeDossier();
    });
    dom.suitGuessCards.forEach(card => {
      card.addEventListener('click', () => onSelectGuessSuit(card));
    });
    dom.btnConfirmGuess.addEventListener('click', confirmFinalGuess);

    // 13. Round Over Progression
    dom.btnNextRoundStandard.addEventListener('click', () => {
      if (local.isHost) hostStartNewRound(false);
    });

    // MANDATORY HOST REBALANCE MATRIX TRIGGER
    dom.btnEqualizeRebalance.addEventListener('click', () => {
      if (local.isHost) {
        vibrateDevice([40, 60, 40]);
        hostExecuteEqualizeAndRebalance();
      }
    });
  }

  // =========================================================================
  // ROOM EXIT & ABANDON ENGINE (MIDGAME & POST-GAME)
  // =========================================================================
  function promptExitConfirmation() {
    sound.init();
    sound.playCardTap();
    vibrateDevice(20);

    if (local.isHost) {
      dom.confirmExitDescription.innerHTML = 
        'You are the <strong>Room Host</strong>. Exiting will terminate this room session and release all seated operatives back to the lobby.';
    } else {
      dom.confirmExitDescription.innerHTML = 
        'Exiting will vacate your seat and return you to the lobby. Are you sure you want to abandon the match?';
    }

    dom.modalConfirmExit.classList.add('active');
  }

  function closeExitConfirmation() {
    sound.playCardTap();
    dom.modalConfirmExit.classList.remove('active');
  }

  function executeExitRoom(shouldBroadcast = true) {
    sound.playCardTap();
    vibrateDevice([30, 40]);

    dom.modalConfirmExit.classList.remove('active');
    dom.modalRoundOver.classList.remove('active');
    dom.modalGuess.classList.remove('active');
    dom.modalMatrixDossier.classList.remove('active');

    if (shouldBroadcast && local.roomId) {
      const mySeat = (local.myTeam && local.mySlot) ? `${local.myTeam}${local.mySlot}` : null;
      broadcastPacket('PLAYER_LEFT', {
        playerId: local.playerId,
        playerName: local.playerName,
        seatKey: mySeat,
        isHost: local.isHost
      });
    }

    clearLocalSession();
    disconnectNetwork();

    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, '', window.location.pathname);
    }

    local.roomId = null;
    local.isHost = false;
    local.myTeam = null;
    local.mySlot = null;
    local.selectedHandIndices = [];
    local.isHandMasked = false;

    gameState = {
      roomId: null,
      status: 'lobby',
      roundNumber: 1,
      turnIndex: 0,
      deck: [],
      targetCard: null,
      teamAHand: [],
      teamBHand: [],
      cemetery: [],
      eliminatedSuits: [],
      winner: null,
      players: { A1: null, A2: null, B1: null, B2: null },
      hiddenRatings: {}
    };

    switchScreen('lobby');
    showToast('Returned to lobby', 'info', 2000);
  }

  // =========================================================================
  // HOT-SWAP RE-ENTRY & BOOTSTRAP INITIALIZATION
  // =========================================================================
  function checkHotSwapReentry() {
    // Check URL parameters for direct join links: ?room=XXXX
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    if (roomParam && roomParam.length === 4) {
      dom.roomCodeInput.value = roomParam.toUpperCase();
    }

    // Check LocalStorage for session recovery
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const session = JSON.parse(stored);
        if (session && session.roomId && session.playerId) {
          local.roomId = session.roomId;
          local.playerId = session.playerId;
          local.playerName = session.playerName;
          local.isHost = session.isHost;
          local.myTeam = session.myTeam || null;
          local.mySlot = session.mySlot || null;

          dom.playerNameInput.value = local.playerName;
          showToast(`Resuming session in room ${local.roomId}...`, 'info');

          initNetwork(() => {
            if (local.isHost) {
              if (session.gameState && session.gameState.roomId === local.roomId) {
                gameState = session.gameState;
                hostBroadcastState();
                if (gameState.status === 'playing') checkAndTriggerBotTurn();
              } else {
                hostInitializeRoom(local.roomId);
              }
            } else {
              broadcastPacket('PLAYER_REJOIN', { playerName: local.playerName });
            }
          });
        }
      }
    } catch (e) {
      console.warn('Re-entry parsing error:', e);
    }
  }

  // Start Application
  window.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    checkHotSwapReentry();
  });

})();
