import { ref, onBeforeUnmount } from 'vue'
import { Message } from '@arco-design/web-vue'
import Recorder from 'js-audio-recorder'
import { audioToText, messageToAudio } from '@/services/audio'

/**
 * 语音输入：js-audio-recorder 录音 → /audio/audio-to-text(ASR) → 识别文本回调
 *
 * @param onTranscript 识别成功回调，参数为识别出的文本
 */
export const useVoiceInput = (onTranscript: (text: string) => void) => {
  /** 是否正在录音 */
  const isRecording = ref(false)
  /** 是否正在语音识别（录音已结束，等待 ASR 返回） */
  const isRecognizing = ref(false)
  let recorder: Recorder | null = null

  /** 开始录音 */
  const start = async () => {
    // 16kHz / 16bit / 单声道，适配硅基流动 sensevoice-small
    recorder = new Recorder({ sampleRate: 16000, sampleBits: 16, numChannels: 1 })
    try {
      await recorder.start()
      isRecording.value = true
    } catch (error: any) {
      const name = error?.name
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        Message.error('麦克风权限被拒绝，请在浏览器设置中允许后重试')
      } else if (name === 'NotFoundError') {
        Message.error('未检测到麦克风设备')
      } else {
        Message.error('录音启动失败，请稍后重试')
      }
      recorder.destroy()
      recorder = null
    }
  }

  /** 停止录音并提交 ASR */
  const stop = async () => {
    if (!recorder) return
    isRecording.value = false
    // stop() 后 WAV 数据同步可用，先取 Blob 再销毁实例
    const wavBlob: Blob = recorder.getWAVBlob()
    await recorder.destroy()
    recorder = null

    if (wavBlob.size <= 44) {
      Message.warning('录音时间太短')
      return
    }

    isRecognizing.value = true
    try {
      const resp = await audioToText(wavBlob)
      if (resp.data.text) onTranscript(resp.data.text)
    } catch {
      // 请求层已统一提示错误
    } finally {
      isRecognizing.value = false
    }
  }

  /** 点击麦克风：录音 / 停止二一切换 */
  const toggleRecording = () => {
    if (isRecording.value) {
      stop()
    } else if (!isRecognizing.value) {
      start()
    }
  }

  onBeforeUnmount(() => {
    if (recorder) {
      recorder.stop()
      recorder.destroy()
      recorder = null
    }
    isRecording.value = false
  })

  return { isRecording, isRecognizing, toggleRecording }
}

/** base64 → Uint8Array */
const base64ToUint8 = (base64: string): Uint8Array => {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/**
 * 语音输出：/audio/message-to-audio(TTS, SSE)
 * 协议：tts_message（data.audio 为 base64 MP3 分片）→ tts_end（收尾）
 * 收集全部分片后合成 MP3 Blob 播放，兼容 Safari（Safari MSE 不支持 audio/mpeg）
 */
export const useAudioPlayer = () => {
  /** 正在后端合成语音的消息 id */
  const synthesizingId = ref('')
  /** 正在浏览器播放语音的消息 id */
  const playingId = ref('')
  let audioEl: HTMLAudioElement | null = null
  let objectUrl: string | null = null

  /** 停止当前播放并释放资源 */
  const stop = () => {
    if (audioEl) {
      audioEl.pause()
      audioEl = null
    }
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl)
      objectUrl = null
    }
    synthesizingId.value = ''
    playingId.value = ''
  }

  /** 播放指定消息的语音 */
  const play = (messageId: string) => {
    if (!messageId || synthesizingId.value || playingId.value) return

    // 停掉上一条
    stop()
    synthesizingId.value = messageId
    const chunks: Uint8Array[] = []
    let settled = false

    const fail = () => {
      if (settled) return
      settled = true
      synthesizingId.value = ''
      playingId.value = ''
      Message.error('语音播放失败，请稍后重试')
    }

    const startPlayback = () => {
      if (chunks.length === 0) {
        fail()
        return
      }
      synthesizingId.value = ''
      playingId.value = messageId
      const blob = new Blob(chunks, { type: 'audio/mpeg' })
      objectUrl = URL.createObjectURL(blob)
      audioEl = new Audio(objectUrl)
      audioEl.addEventListener('ended', () => {
        playingId.value = ''
      })
      audioEl.addEventListener('error', () => {
        playingId.value = ''
        Message.error('语音播放失败，请稍后重试')
      })
      audioEl.play().catch(() => {
        playingId.value = ''
        Message.error('语音播放失败，请稍后重试')
      })
    }

    // ssePost 在首个读事件后即 resolve，结束时机必须以 tts_end 事件为准
    messageToAudio(
      messageId,
      (eventResponse) => {
        const event = eventResponse?.event
        const data = eventResponse?.data
        if (event === 'tts_message' && data?.audio) {
          chunks.push(base64ToUint8(data.audio))
        } else if (event === 'tts_end') {
          if (!settled) {
            settled = true
            startPlayback()
          }
        }
      },
      // 流异常关闭（未收到 tts_end）：按失败处理，避免按钮永久 loading
      () => fail(),
    ).catch(fail)
  }

  onBeforeUnmount(stop)

  return { synthesizingId, playingId, play, stop }
}
