/**
 * ==============================================================================
 * ARENA VOICE — PROCEDURAL SOUND SYNTHESIZER (WEB AUDIO API)
 * ==============================================================================
 * 
 * Milestone 5B: Audio & Visual Event Synchronization
 * Conforme Decisão Arquitetural ADR-027.
 * 
 * Estratégia de Áudio: Síntese Procedural em Runtime (100% Offline-First)
 * - Zero dependência externa de assets (sem arquivos WAV/MP3 externos para download);
 * - Zero latência de rede e sem gargalos de decodificação assíncrona;
 * - Compatível com ambientes corporativos restritos e redes isoladas (air-gapped);
 * - Geração acústica via nós nativos da Web Audio API: OscillatorNode,
 *   BiquadFilterNode, GainNode, e buffers de ruído procedural.
 * 
 * Assinaturas Acústicas dos Eventos da Arena:
 * 1. ChairTurned: Whoosh pneumático de rotação + duplo clique de catraca mecânica.
 * 2. VotingOpen: Acorde estéreo de fanfarra moderna / stinger televisivo em Fá Maior.
 * 3. Timer15Seconds: Sub-kick de tensão / batimento cardíaco + clique de alta frequência.
 * 4. VotingClosed: Gongo profundo ressonante com queda sub-bass e impacto metálico.
 * 5. UnanimousApproval: Fanfarra triunfal em arpejo ascendente (Dó-Mi-Sol-Dó-Mi).
 * 6. ChairsReset: Tom futurista descendente suave com relaxamento acústico.
 */

class SoundSynthesizer {
  /**
   * Helper: Cria um AudioBuffer curto de ruído branco gerado em memória.
   * @param {AudioContext} ctx
   * @param {number} durationSeconds
   * @returns {AudioBuffer}
   */
  static createNoiseBuffer(ctx, durationSeconds = 0.5) {
    const sampleRate = ctx.sampleRate;
    const bufferSize = Math.floor(sampleRate * durationSeconds);
    const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      // Distribuição linear uniforme de ruído branco [-1.0, 1.0]
      data[i] = Math.random() * 2 - 1;
    }

    return buffer;
  }

  /**
   * 1. ChairTurned: Whoosh pneumático + catraca mecânica
   * Simula a cadeira pesada girando velozmente no pedestal e travando na posição frontal.
   * @param {AudioContext} ctx
   * @param {GainNode} destinationGain
   */
  static synthesizeWhoosh(ctx, destinationGain) {
    if (!ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime;

    try {
      // ── Camada 1: Whoosh de Vento / Ruído Filtrado ────────────────────────
      const noiseDuration = 0.45;
      const noiseBuffer = this.createNoiseBuffer(ctx, noiseDuration);
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;

      // Filtro passa-faixa varrendo de 1400Hz para 220Hz
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.setValueAtTime(2.8, now);
      filter.frequency.setValueAtTime(1400, now);
      filter.frequency.exponentialRampToValueAtTime(220, now + noiseDuration);

      // Envelope de amplitude do whoosh
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.001, now);
      noiseGain.gain.linearRampToValueAtTime(0.42, now + 0.04);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + noiseDuration);

      noiseSource.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(destinationGain);

      noiseSource.start(now);
      noiseSource.stop(now + noiseDuration);

      // ── Camada 2: Duplo Clique de Catraca / Latch Mecânico ────────────────
      const ratchetTimes = [now + 0.12, now + 0.22];
      const ratchetFreqs = [520, 680];

      ratchetTimes.forEach((t, i) => {
        const osc = ctx.createOscillator();
        const env = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(ratchetFreqs[i], t);
        osc.frequency.exponentialRampToValueAtTime(180, t + 0.05);

        env.gain.setValueAtTime(0.001, t);
        env.gain.linearRampToValueAtTime(0.28, t + 0.008);
        env.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

        osc.connect(env);
        env.connect(destinationGain);

        osc.start(t);
        osc.stop(t + 0.07);
      });
    } catch (err) {
      console.warn('[SoundSynthesizer] Falha ao sintetizar ChairTurned:', err);
    }
  }

  /**
   * 2. VotingOpen: Acorde moderno de abertura / Stinger de TV
   * Acorde harmônico brilhante (F4, A4, C5) com arpejo cintilante anunciando a votação.
   * @param {AudioContext} ctx
   * @param {GainNode} destinationGain
   */
  static synthesizeVotingOpen(ctx, destinationGain) {
    if (!ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime;

    try {
      // Tríade Fá Maior (F4: 349.23, A4: 440.0, C5: 523.25) + oitava F5 (698.46)
      const chordNotes = [
        { freq: 349.23, delay: 0.0,  duration: 1.2, gain: 0.22 },
        { freq: 440.00, delay: 0.04, duration: 1.3, gain: 0.24 },
        { freq: 523.25, delay: 0.08, duration: 1.4, gain: 0.26 },
        { freq: 698.46, delay: 0.14, duration: 1.5, gain: 0.20 },
      ];

      chordNotes.forEach(({ freq, delay, duration, gain }) => {
        const startTime = now + delay;
        const osc = ctx.createOscillator();
        const subOsc = ctx.createOscillator();
        const env = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        // Sub-oscilador levemente desafinado (+4 cents) para largura estéreo/shimmer
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(freq * 1.002, startTime);

        env.gain.setValueAtTime(0.001, startTime);
        env.gain.linearRampToValueAtTime(gain, startTime + 0.025);
        env.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.connect(env);
        subOsc.connect(env);
        env.connect(destinationGain);

        osc.start(startTime);
        subOsc.start(startTime);
        osc.stop(startTime + duration + 0.05);
        subOsc.stop(startTime + duration + 0.05);
      });
    } catch (err) {
      console.warn('[SoundSynthesizer] Falha ao sintetizar VotingOpen:', err);
    }
  }

  /**
   * 3. Timer15Seconds: Sub-kick de tensão / Ticker de urgência
   * Disparado a cada segundo nos últimos 15 segundos da rodada.
   * Nos últimos 5 segundos (isCritical = true), ganha pulso duplo simulando taquicardia.
   * @param {AudioContext} ctx
   * @param {GainNode} destinationGain
   * @param {boolean} isCritical
   */
  static synthesizeTimerTicker(ctx, destinationGain, isCritical = false) {
    if (!ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime;

    try {
      const playPulse = (time, intensity = 1.0) => {
        // Camada Sub-Bass (Thump tipo batimento cardíaco)
        const subOsc = ctx.createOscillator();
        const subEnv = ctx.createGain();

        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(isCritical ? 115 : 95, time);
        subOsc.frequency.exponentialRampToValueAtTime(42, time + 0.09);

        subEnv.gain.setValueAtTime(0.001, time);
        subEnv.gain.linearRampToValueAtTime(0.32 * intensity, time + 0.01);
        subEnv.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

        subOsc.connect(subEnv);
        subEnv.connect(destinationGain);

        subOsc.start(time);
        subOsc.stop(time + 0.14);

        // Camada Transient Click (Agulha de cronômetro analógico)
        const clickOsc = ctx.createOscillator();
        const clickEnv = ctx.createGain();

        clickOsc.type = 'triangle';
        clickOsc.frequency.setValueAtTime(isCritical ? 1800 : 1350, time);

        clickEnv.gain.setValueAtTime(0.001, time);
        clickEnv.gain.linearRampToValueAtTime(0.18 * intensity, time + 0.004);
        clickEnv.gain.exponentialRampToValueAtTime(0.001, time + 0.035);

        clickOsc.connect(clickEnv);
        clickEnv.connect(destinationGain);

        clickOsc.start(time);
        clickOsc.stop(time + 0.04);
      };

      // Pulso primário
      playPulse(now, 1.0);

      // Se crítico (<= 5s), adiciona segundo pulso sincopado ("tum-tum")
      if (isCritical) {
        playPulse(now + 0.14, 0.75);
      }
    } catch (err) {
      console.warn('[SoundSynthesizer] Falha ao sintetizar TimerTicker:', err);
    }
  }

  /**
   * 4. VotingClosed: Gongo de encerramento / Impacto cênico final
   * Impacto ressonante profundo que encerra a votação com autoridade e peso cênico.
   * @param {AudioContext} ctx
   * @param {GainNode} destinationGain
   */
  static synthesizeVotingClosed(ctx, destinationGain) {
    if (!ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime;

    try {
      const duration = 2.4;

      // ── Camada 1: Fundamental Sub-Drop Ressonante (E2: ~82.4Hz -> 40Hz) ────
      const fundamental = ctx.createOscillator();
      const fundGain = ctx.createGain();

      fundamental.type = 'sine';
      fundamental.frequency.setValueAtTime(82.4, now);
      fundamental.frequency.exponentialRampToValueAtTime(38.0, now + 0.4);

      fundGain.gain.setValueAtTime(0.001, now);
      fundGain.gain.linearRampToValueAtTime(0.48, now + 0.02);
      fundGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      fundamental.connect(fundGain);
      fundGain.connect(destinationGain);

      fundamental.start(now);
      fundamental.stop(now + duration);

      // ── Camada 2: Ressonância Metálica / Harmônicos Inarmônicos do Gongo ───
      const partials = [
        { freq: 196.0, gain: 0.22, decay: 1.6 },
        { freq: 370.0, gain: 0.16, decay: 1.1 },
        { freq: 587.0, gain: 0.11, decay: 0.8 },
      ];

      partials.forEach(({ freq, gain, decay }) => {
        const osc = ctx.createOscillator();
        const env = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        env.gain.setValueAtTime(0.001, now);
        env.gain.linearRampToValueAtTime(gain, now + 0.015);
        env.gain.exponentialRampToValueAtTime(0.001, now + decay);

        osc.connect(env);
        env.connect(destinationGain);

        osc.start(now);
        osc.stop(now + decay + 0.05);
      });

      // ── Camada 3: Ataque Percussivo Metal Strike (Ruído Filtrado) ──────────
      const strikeNoise = this.createNoiseBuffer(ctx, 0.08);
      const strikeSource = ctx.createBufferSource();
      strikeSource.buffer = strikeNoise;

      const strikeFilter = ctx.createBiquadFilter();
      strikeFilter.type = 'bandpass';
      strikeFilter.frequency.setValueAtTime(2400, now);
      strikeFilter.Q.setValueAtTime(4.0, now);

      const strikeGain = ctx.createGain();
      strikeGain.gain.setValueAtTime(0.001, now);
      strikeGain.gain.linearRampToValueAtTime(0.25, now + 0.005);
      strikeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      strikeSource.connect(strikeFilter);
      strikeFilter.connect(strikeGain);
      strikeGain.connect(destinationGain);

      strikeSource.start(now);
      strikeSource.stop(now + 0.09);
    } catch (err) {
      console.warn('[SoundSynthesizer] Falha ao sintetizar VotingClosed:', err);
    }
  }

  /**
   * 5. UnanimousApproval / Celebration: Fanfarra triunfal em arpejo
   * Acionado quando todas as 5 cadeiras viram para o projeto (5 de 5).
   * @param {AudioContext} ctx
   * @param {GainNode} destinationGain
   */
  static synthesizeCelebration(ctx, destinationGain) {
    if (!ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime;

    try {
      // Sequência gloriosa: C4 -> E4 -> G4 -> C5 -> E5 em staccato com reverb natural
      const notes = [
        { freq: 261.63, delay: 0.00, duration: 1.8, gain: 0.22 },
        { freq: 329.63, delay: 0.09, duration: 1.8, gain: 0.24 },
        { freq: 392.00, delay: 0.18, duration: 2.0, gain: 0.26 },
        { freq: 523.25, delay: 0.27, duration: 2.2, gain: 0.28 },
        { freq: 659.25, delay: 0.38, duration: 2.4, gain: 0.30 },
      ];

      notes.forEach(({ freq, delay, duration, gain }) => {
        const startTime = now + delay;
        const osc = ctx.createOscillator();
        const env = ctx.createGain();

        // Sawtooth suavizado por filtro passa-baixa para timbre acobreado de metais/fanfarra
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, startTime);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1900, startTime);
        filter.frequency.exponentialRampToValueAtTime(800, startTime + duration);

        env.gain.setValueAtTime(0.001, startTime);
        env.gain.linearRampToValueAtTime(gain, startTime + 0.03);
        env.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.connect(filter);
        filter.connect(env);
        env.connect(destinationGain);

        osc.start(startTime);
        osc.stop(startTime + duration + 0.05);
      });
    } catch (err) {
      console.warn('[SoundSynthesizer] Falha ao sintetizar Celebration:', err);
    }
  }

  /**
   * 6. ChairsReset: Tom descendente suave de retorno
   * @param {AudioContext} ctx
   * @param {GainNode} destinationGain
   */
  static synthesizeReset(ctx, destinationGain) {
    if (!ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime;

    try {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(540, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.35);

      env.gain.setValueAtTime(0.001, now);
      env.gain.linearRampToValueAtTime(0.2, now + 0.02);
      env.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(env);
      env.connect(destinationGain);

      osc.start(now);
      osc.stop(now + 0.38);
    } catch (err) {
      console.warn('[SoundSynthesizer] Falha ao sintetizar Reset:', err);
    }
  }
}

export default SoundSynthesizer;
