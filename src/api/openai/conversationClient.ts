import { AudioPlayer, createAudioResource, StreamType } from '@discordjs/voice';
import { PassThrough } from 'stream';
import { logger } from '../../config/logger.js';
import WebSocket from 'ws';
import { AudioUtils } from '../../utils/audio.js';

// const client = new OpenAI({

// });
const sessionUpdate = {
  type: 'session.update',
  session: {
    input_audio_format: 'pcm16',
  },
};

const realtimeSessionURL = 'https://api.openai.com/v1/realtime';
export class OpenAIConversationalAI {
  private url: string = realtimeSessionURL;
  private model = 'gpt-4o-realtime-preview';
  private apiKey: string;
  private socket: WebSocket | null;
  private audioPlayer: AudioPlayer;
  private currentAudioStream: PassThrough | null;
  private audioBufferQueue: Buffer[] = [];
  private isProcessing: boolean = false;

  constructor(audioPlayer: AudioPlayer, apiKey: string) {
    this.apiKey = apiKey;
    this.audioPlayer = audioPlayer;
    this.currentAudioStream = null;
    this.socket = null;
  }

  public async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      logger.info('Connecting to OpenAI API...');
      let isResolved = false;
      const newUrl = new URL(this.url);
      newUrl.searchParams.append('model', this.model);
      this.socket = new WebSocket(newUrl.toString(), {
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          'OpenAI-Beta': 'realtime=v1',
        },
      });
      this.socket.on('open', () => {
        logger.info('Connected to OpenAI API');
        isResolved = true;
        resolve();
      });
      this.socket.on('error', (error: any) => {
        logger.error('WebSocket error:', error);
        if (!isResolved) {
          isResolved = true;
          reject(error);
        }
      });

      this.socket.on('close', () => {
        logger.info('WebSocket connection closed');
      });

      this.socket.on('message', (message: any) => this.handleEvent(message));
    });
  }
  private cleanup(): void {
    if (this.currentAudioStream && !this.currentAudioStream.destroyed) {
      this.currentAudioStream.push(null);
      this.currentAudioStream.destroy();
      this.currentAudioStream = null;
    }
  }
  public disconnect(): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.close();
    }
    this.cleanup();
  }
  /**
   * Initializes the audio stream for playback.
   * @private
   * @returns {void}
   */
  private initializeAudioStream(): void {
    if (!this.currentAudioStream || this.currentAudioStream.destroyed) {
      this.currentAudioStream = new PassThrough();
      this.audioPlayer.play(
        createAudioResource(this.currentAudioStream, {
          inputType: StreamType.Raw,
        }),
      );
    }
  }

  private async processAudioQueue(): Promise<void> {
    if (this.isProcessing || this.audioBufferQueue.length === 0) return;

    this.isProcessing = true;

    while (this.audioBufferQueue.length > 0) {
      const audioBuffer = this.audioBufferQueue.shift()!;
      try {
        this.initializeAudioStream();
        const pcmBuffer = await AudioUtils.mono24khzToStereo48kHz(audioBuffer);
        this.currentAudioStream?.write(pcmBuffer);
      } catch (error) {
        logger.error('Error processing audio buffer:', error);
      }
    }

    this.isProcessing = false;
  }

  /**
   * Appends input audio to the WebSocket.
   * @param {Buffer} buffer - The audio buffer to append.
   * @returns {void}
   */
  appendInputAudio(buffer: Buffer): void {
    if (buffer.byteLength === 0 || this.socket?.readyState !== WebSocket.OPEN)
      return;

    const base64Audio = {
      type: 'input_audio_buffer.append',

      audio: buffer.toString('base64'),
    };

    this.socket.send(JSON.stringify(base64Audio));
  }

  private handleEvent(message: WebSocket.RawData): void {
    const event = JSON.parse(message.toString());
    switch (event.type) {
      case 'session.created':
        logger.info('Session created:', event);
        this.socket?.send(JSON.stringify(sessionUpdate));
        break;
      case 'session.ended':
        logger.info('Session ended:', event);
        break;
      case 'response.audio.delta':
        logger.info('Audio delta received:', event);
        this.audioBufferQueue.push(Buffer.from(event.delta, 'base64'));
        this.processAudioQueue();
        break;
      default:
        console.log('Received message:', message.toString());
        break;
    }
  }
}
