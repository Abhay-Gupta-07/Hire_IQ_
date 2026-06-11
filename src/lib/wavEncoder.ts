/**
 * Client-side audio conversion utility.
 * Decodes standard WebM/Opus or AAC recorded from MediaRecorder,
 * resamples to 16kHz Mono PCM, and returns a high-fidelity WAV blob.
 */

export async function convertWebmToWav(webmBlob: Blob): Promise<Blob> {
  // 1. ArrayBuffer from Blob
  const arrayBuffer = await webmBlob.arrayBuffer();

  // 2. Create AudioContext to decode audio data
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) {
    throw new Error("Web Audio API is not supported in this browser.");
  }

  const audioCtx = new AudioCtx();
  let audioBuffer: AudioBuffer;

  try {
    audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  } catch (err) {
    console.error("Failed to decode audio data with default AudioContext, trying offline alternative:", err);
    // Fallback using OfflineAudioContext
    const offlineCtx = new OfflineAudioContext(1, 44100, 44100);
    audioBuffer = await offlineCtx.decodeAudioData(arrayBuffer);
  } finally {
    await audioCtx.close();
  }

  // 3. Resample & Downmix to 16kHz mono PCM
  const targetSampleRate = 16000;
  const numChannels = 1; // Mono is preferred for speech recognition models
  const duration = audioBuffer.duration;
  const numFrames = Math.ceil(duration * targetSampleRate);

  const offlineCtx = new OfflineAudioContext(numChannels, numFrames, targetSampleRate);
  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineCtx.destination);
  source.start();

  const renderedBuffer = await offlineCtx.startRendering();
  const channelData = renderedBuffer.getChannelData(0);

  // 4. Encode to WAV PCM format
  const wavBuffer = encodeWav(channelData, targetSampleRate);
  return new Blob([wavBuffer], { type: "audio/wav" });
}

function encodeWav(channelData: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + channelData.length * 2);
  const view = new DataView(buffer);

  /* RIFF identifier */
  writeString(view, 0, "RIFF");
  /* file length */
  view.setUint32(4, 36 + channelData.length * 2, true);
  /* RIFF type */
  writeString(view, 8, "WAVE");
  /* format chunk identifier */
  writeString(view, 12, "fmt ");
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw PCM) */
  view.setUint16(20, 1, true);
  /* channel count */
  view.setUint16(22, 1, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * 2, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, 2, true);
  /* bits per sample */
  view.setUint16(34, 16, true);
  /* data chunk identifier */
  writeString(view, 36, "data");
  /* data chunk length */
  view.setUint32(40, channelData.length * 2, true);

  // Write PCM audio samples
  let offset = 44;
  for (let i = 0; i < channelData.length; i++) {
    // Clamp standard floats [-1.0, 1.0] to 16-bit signed integer INT16_MIN to INT16_MAX
    let sample = channelData[i];
    if (sample > 1.0) sample = 1.0;
    else if (sample < -1.0) sample = -1.0;

    const pcmSample = sample < 0 ? sample * 32768 : sample * 32767;
    view.setInt16(offset, pcmSample, true);
    offset += 2;
  }

  return buffer;
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
