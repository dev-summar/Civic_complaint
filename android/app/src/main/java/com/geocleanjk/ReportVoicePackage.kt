package com.geocleanjk

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaPlayer
import android.media.MediaRecorder
import android.util.Base64
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.speech.tts.Voice
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.uimanager.ViewManager
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.Locale

class ReportVoicePackage : ReactPackage {
  override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> =
    listOf(ReportVoiceModule(context))

  override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> =
    emptyList()
}

class ReportVoiceModule(private val context: ReactApplicationContext) :
  ReactContextBaseJavaModule(context), LifecycleEventListener {
  private data class Reply(val text: String, val language: String, val promise: Promise)

  private val main = Handler(Looper.getMainLooper())
  private var recognizer: SpeechRecognizer? = null
  private var listening: Promise? = null
  private var speaker: TextToSpeech? = null
  private var speakerReady = false
  private var queuedReply: Reply? = null
  private var playingReply: Reply? = null
  private var utteranceId: String? = null
  private var speakerGeneration = 0
  private var speechStarted = false
  private var fallbackTried = false
  private var playingUsesNetwork = false
  private var availableVoices: List<Voice> = emptyList()
  private val selectedVoices = mutableMapOf<String, Voice?>()
  private val warmups = mutableListOf<Pair<String, Promise>>()
  private var activeLanguage: String? = null
  private var activeVoiceName: String? = null
  private var clip: MediaPlayer? = null
  private var clipPromise: Promise? = null
  private var capturePromise: Promise? = null
  private var audioRecord: AudioRecord? = null
  @Volatile private var captureStop = false
  @Volatile private var captureDiscard = false

  init {
    context.addLifecycleEventListener(this)
  }

  override fun getName() = "ReportVoice"

  @ReactMethod fun addListener(eventName: String) {}
  @ReactMethod fun removeListeners(count: Int) {}

  private fun event(type: String, text: String? = null, level: Double? = null) {
    if (!context.hasActiveReactInstance()) return
    val value = Arguments.createMap().apply {
      putString("type", type)
      if (text != null) putString("text", text)
      if (level != null) putDouble("level", level)
    }
    context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit("ReportVoiceState", value)
  }

  @ReactMethod
  fun listen(language: String, promise: Promise) {
    main.post {
      if (listening != null) {
        promise.reject("VOICE_BUSY", "Speech recognition is already active.")
        return@post
      }
      stopSpeech()
      if (context.checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
        promise.reject("VOICE_PERMISSION", "Microphone permission is required.")
        return@post
      }
      if (!SpeechRecognizer.isRecognitionAvailable(context)) {
        promise.reject("VOICE_UNAVAILABLE", "No speech recognition service is available.")
        return@post
      }
      try {
        val service = SpeechRecognizer.createSpeechRecognizer(context)
        recognizer = service
        listening = promise
        var switching = language == "hinglish" && Build.VERSION.SDK_INT >= 34
        fun recognitionIntent() = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
          putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
          putExtra(RecognizerIntent.EXTRA_LANGUAGE, if (language == "hinglish") "hi-IN" else language)
          putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3)
          putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
          if (Build.VERSION.SDK_INT >= 33) {
            putStringArrayListExtra(RecognizerIntent.EXTRA_BIASING_STRINGS,
              arrayListOf("नाली", "सीवर", "कचरा", "गड्ढा", "स्ट्रीट लाइट", "drain", "pothole", "garbage"))
          }
          if (switching && Build.VERSION.SDK_INT >= 34) {
            putExtra(RecognizerIntent.EXTRA_ENABLE_LANGUAGE_SWITCH, RecognizerIntent.LANGUAGE_SWITCH_BALANCED)
            putStringArrayListExtra(RecognizerIntent.EXTRA_LANGUAGE_SWITCH_ALLOWED_LANGUAGES, arrayListOf("hi-IN", "en-IN"))
          }
        }
        service.setRecognitionListener(object : RecognitionListener {
          override fun onResults(results: Bundle?) {
            if (recognizer !== service) return
            val text = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()
            val confidence = results?.getFloatArray(SpeechRecognizer.CONFIDENCE_SCORES)?.firstOrNull()
            finishListening(text, confidence = confidence)
          }

          override fun onError(error: Int) {
            if (recognizer !== service) return
            // Some phones have only one installed language model. Fall back once.
            if (switching && error in listOf(12, 13, SpeechRecognizer.ERROR_SERVER)) {
              switching = false
              service.startListening(recognitionIntent())
              return
            }
            finishListening(null, error)
          }

          override fun onReadyForSpeech(params: Bundle?) { if (recognizer === service) event("ready") }
          override fun onBeginningOfSpeech() { if (recognizer === service) event("speech") }
          override fun onRmsChanged(rmsdB: Float) {
            if (recognizer === service) event("level", level = ((rmsdB + 2) / 12.0).coerceIn(0.0, 1.0))
          }
          override fun onBufferReceived(buffer: ByteArray?) {}
          override fun onEndOfSpeech() { if (recognizer === service) event("processing") }
          override fun onPartialResults(partialResults: Bundle?) {
            if (recognizer === service) event("partial", partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull())
          }
          override fun onEvent(eventType: Int, params: Bundle?) {}
        })
        service.startListening(recognitionIntent())
        main.postDelayed({
          if (recognizer === service) {
            finishListening(null, SpeechRecognizer.ERROR_SPEECH_TIMEOUT)
          }
        }, 35000)
      } catch (error: RuntimeException) {
        clearRecognizer()
        promise.reject("VOICE_UNAVAILABLE", error)
      }
    }
  }

  /**
   * Records 16 kHz mono WAV for Bhashini. Hindi, English, Dogri and Kashmiri are transcribed
   * on the server from this clip; the phone's speech recognizer is not used for them.
   */
  @ReactMethod
  fun capture(promise: Promise) {
    main.post {
      if (capturePromise != null || listening != null) {
        promise.reject("VOICE_BUSY", "Speech recognition is already active.")
        return@post
      }
      if (context.checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
        promise.reject("VOICE_PERMISSION", "Microphone permission is required.")
        return@post
      }
      stopSpeech()
      captureStop = false
      captureDiscard = false
      capturePromise = promise
      Thread {
        var record: AudioRecord? = null
        try {
          val rate = 16000
          val min = AudioRecord.getMinBufferSize(rate, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT)
          if (min <= 0) throw IllegalStateException("microphone buffer")
          record = AudioRecord(
            MediaRecorder.AudioSource.MIC, rate, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT, min * 2,
          )
          if (record.state != AudioRecord.STATE_INITIALIZED) throw IllegalStateException("microphone")
          audioRecord = record
          record.startRecording()
          main.post { if (capturePromise != null) event("ready") }
          val pcm = java.io.ByteArrayOutputStream()
          val buffer = ShortArray(min.coerceAtLeast(2) / 2)
          val startedAt = System.currentTimeMillis()
          var speech = false
          var quietAt = 0L
          var lastLevel = 0L
          while (!captureStop && System.currentTimeMillis() - startedAt < 20000) {
            val count = record.read(buffer, 0, buffer.size)
            if (count < 0) break
            if (count == 0) continue
            var energy = 0.0
            val bytes = ByteArray(count * 2)
            for (index in 0 until count) {
              val sample = buffer[index].toInt()
              energy += sample.toDouble() * sample.toDouble()
              bytes[index * 2] = (sample and 0xff).toByte()
              bytes[index * 2 + 1] = ((sample shr 8) and 0xff).toByte()
            }
            pcm.write(bytes)
            val rms = Math.sqrt(energy / count) / 32768.0
            val now = System.currentTimeMillis()
            if (now - lastLevel > 100) {
              lastLevel = now
              val level = (rms * 8).coerceIn(0.0, 1.0)
              main.post { if (capturePromise != null) event("level", level = level) }
            }
            if (rms > 0.045) {
              if (!speech) {
                speech = true
                main.post { if (capturePromise != null) event("speech") }
              }
              quietAt = 0
            } else if (speech) {
              if (quietAt == 0L) quietAt = now
              if (now - quietAt > 1100) break
            }
          }
          try { record.stop() } catch (error: Exception) {}
          record.release()
          if (audioRecord === record) audioRecord = null
          record = null
          val body = pcm.toByteArray()
          val duration = System.currentTimeMillis() - startedAt
          val audio = if (captureDiscard || body.size < 16000 || duration < 500) null
            else Base64.encodeToString(wavBytes(body, rate), Base64.NO_WRAP)
          main.post {
            if (capturePromise != null && audio != null) event("processing")
            finishCapture(audio)
          }
        } catch (error: Exception) {
          try { record?.release() } catch (ignored: Exception) {}
          if (audioRecord === record) audioRecord = null
          main.post {
            val pending = capturePromise
            capturePromise = null
            pending?.reject("VOICE_UNAVAILABLE", "The microphone could not start.")
          }
        }
      }.start()
    }
  }

  @ReactMethod
  fun stopListening() {
    main.post {
      requestCaptureStop(false)
      try {
        recognizer?.stopListening()
      } catch (error: RuntimeException) {
        finishListening(null, SpeechRecognizer.ERROR_CLIENT)
      }
    }
  }

  @ReactMethod
  fun prepare(language: String, promise: Promise) {
    main.post {
      warmups.add(language to promise)
      startSpeaker()
    }
  }

  @ReactMethod
  fun playAudio(base64: String, promise: Promise) {
    main.post {
      stopSpeech()
      try {
        val bytes = Base64.decode(base64, Base64.DEFAULT)
        val wav = bytes.size >= 4 && bytes[0] == 'R'.code.toByte() && bytes[1] == 'I'.code.toByte()
          && bytes[2] == 'F'.code.toByte() && bytes[3] == 'F'.code.toByte()
        val file = java.io.File(context.cacheDir, if (wav) "setu-reply.wav" else "setu-reply.mp3")
        file.outputStream().use { it.write(bytes) }
        val media = MediaPlayer()
        clip = media
        clipPromise = promise
        media.setAudioAttributes(AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_MEDIA)
          .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
          .build())
        media.setDataSource(file.absolutePath)
        media.setOnPreparedListener {
          event("speech_started")
          it.start()
        }
        media.setOnCompletionListener { stopClip(true) }
        media.setOnErrorListener { _, _, _ ->
          stopClip(false)
          true
        }
        media.prepareAsync()
      } catch (error: Exception) {
        stopClip(null)
        promise.resolve(false)
      }
    }
  }

  private fun stopClip(success: Boolean?) {
    val pending = clipPromise
    clipPromise = null
    val media = clip
    clip = null
    if (media != null) {
      media.setOnCompletionListener(null)
      media.setOnErrorListener(null)
      try { if (media.isPlaying) media.stop() } catch (error: Exception) {}
      media.release()
    }
    if (success != null) pending?.resolve(success)
  }

  @ReactMethod
  fun speak(text: String, language: String, promise: Promise) {
    main.post {
      if (listening != null) {
        promise.resolve(false)
        return@post
      }
      stopSpeech()
      queuedReply = Reply(text, language, promise)
      startSpeaker()
    }
  }

  private fun startSpeaker() {
      if (speakerReady) {
        finishWarmups()
        playReply()
      } else if (speaker == null) {
        val generation = ++speakerGeneration
        speaker = TextToSpeech(context) { status ->
          main.post {
            if (generation == speakerGeneration) {
              if (status == TextToSpeech.SUCCESS) {
                speakerReady = true
                availableVoices = speaker?.voices?.filter {
                  !it.features.orEmpty().contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED)
                }.orEmpty()
                selectedVoices.clear()
                activeLanguage = null
                activeVoiceName = null
                speaker?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                  override fun onStart(id: String?) { main.post {
                    if (id == utteranceId) { speechStarted = true; event("speech_started") }
                  } }
                  override fun onDone(id: String?) = completeSpeech(id, true)
                  @Deprecated("Required by Android TextToSpeech")
                  override fun onError(id: String?) = completeSpeech(id, false)
                  override fun onError(id: String?, errorCode: Int) = completeSpeech(id, false)
                })
                finishWarmups()
                playReply()
              } else {
                failSpeaker()
              }
            }
          }
        }
        main.postDelayed({
          if (generation == speakerGeneration && !speakerReady) failSpeaker()
        }, 4000)
      }
  }

  private fun finishWarmups() {
    val requests = warmups.toList()
    warmups.clear()
    requests.forEach { (language, promise) ->
      // Warm only synthesis resources. This never records or plays audio.
      val ready = if (playingReply == null) configureVoice(language, false)
        else bestVoice(language, false) != null
      promise.resolve(ready)
    }
  }

  private fun failSpeaker() {
    speakerGeneration++
    warmups.forEach { it.second.resolve(false) }
    warmups.clear()
    stopSpeech()
    speaker?.shutdown()
    speaker = null
    speakerReady = false
    availableVoices = emptyList()
    selectedVoices.clear()
    activeLanguage = null
    activeVoiceName = null
  }

  private fun bestVoice(language: String, localOnly: Boolean, networkOnly: Boolean = false): Voice? {
    val key = "$language:$localOnly:$networkOnly"
    if (selectedVoices.containsKey(key)) return selectedVoices[key]
    val locale = Locale.forLanguageTag(language)
    val best = availableVoices.filter {
      it.locale.language == locale.language && (!localOnly || !it.isNetworkConnectionRequired) &&
        (!networkOnly || it.isNetworkConnectionRequired)
    }.sortedWith(compareBy<Voice> { it.isNetworkConnectionRequired }
      .thenByDescending { it.locale.country == locale.country }
      .thenByDescending { it.quality }.thenBy { it.latency }).firstOrNull()
    selectedVoices[key] = best
    return best
  }

  private fun configureVoice(language: String, localOnly: Boolean, networkOnly: Boolean = false): Boolean {
    val engine = speaker ?: return false
    val best = bestVoice(language, localOnly, networkOnly)
    if (best != null) {
      if (activeVoiceName != best.name && engine.setVoice(best) != TextToSpeech.SUCCESS) return false
      activeVoiceName = best.name
      activeLanguage = language
      return true
    }
    if (localOnly || networkOnly) return false
    if (activeLanguage == language) return true
    if (engine.setLanguage(Locale.forLanguageTag(language)) < 0) return false
    activeLanguage = language
    activeVoiceName = engine.voice?.name
    return true
  }

  @ReactMethod
  fun cancel() {
    main.post {
      requestCaptureStop(true)
      finishListening(null)
      stopSpeech()
    }
  }

  private fun requestCaptureStop(discard: Boolean) {
    if (discard) captureDiscard = true
    captureStop = true
    try { audioRecord?.stop() } catch (error: Exception) {}
  }

  private fun finishCapture(audio: String?) {
    val pending = capturePromise ?: return
    capturePromise = null
    val discarded = captureDiscard
    captureDiscard = false
    captureStop = false
    pending.resolve(if (discarded) null else audio)
  }

  private fun wavBytes(pcm: ByteArray, sampleRate: Int): ByteArray {
    val out = ByteArray(44 + pcm.size)
    val view = ByteBuffer.wrap(out).order(ByteOrder.LITTLE_ENDIAN)
    out[0] = 'R'.code.toByte(); out[1] = 'I'.code.toByte(); out[2] = 'F'.code.toByte(); out[3] = 'F'.code.toByte()
    view.putInt(4, 36 + pcm.size)
    out[8] = 'W'.code.toByte(); out[9] = 'A'.code.toByte(); out[10] = 'V'.code.toByte(); out[11] = 'E'.code.toByte()
    out[12] = 'f'.code.toByte(); out[13] = 'm'.code.toByte(); out[14] = 't'.code.toByte(); out[15] = ' '.code.toByte()
    view.putInt(16, 16)
    view.putShort(20, 1.toShort())
    view.putShort(22, 1.toShort())
    view.putInt(24, sampleRate)
    view.putInt(28, sampleRate * 2)
    view.putShort(32, 2.toShort())
    view.putShort(34, 16.toShort())
    out[36] = 'd'.code.toByte(); out[37] = 'a'.code.toByte(); out[38] = 't'.code.toByte(); out[39] = 'a'.code.toByte()
    view.putInt(40, pcm.size)
    System.arraycopy(pcm, 0, out, 44, pcm.size)
    return out
  }

  private fun clearRecognizer() {
    listening = null
    val service = recognizer
    recognizer = null
    service?.destroy()
  }

  private fun finishListening(text: String?, error: Int? = null, confidence: Float? = null) {
    val promise = listening
    clearRecognizer()
    if (error != null && error != SpeechRecognizer.ERROR_NO_MATCH && error != SpeechRecognizer.ERROR_SPEECH_TIMEOUT) {
      val code = when (error) {
        SpeechRecognizer.ERROR_NETWORK, SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "VOICE_NETWORK"
        SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "VOICE_PERMISSION"
        12, 13 -> "VOICE_LANGUAGE"
        SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "VOICE_BUSY"
        else -> "VOICE_RECOGNITION"
      }
      promise?.reject(code, "Speech recognition could not finish.")
    } else {
      promise?.resolve(if (text == null) null else Arguments.createMap().apply {
        putString("text", text)
        if (confidence != null && confidence >= 0) putDouble("confidence", confidence.toDouble())
      })
    }
  }

  private fun stopSpeech() {
    queuedReply?.promise?.resolve(false)
    queuedReply = null
    playingReply?.promise?.resolve(false)
    playingReply = null
    utteranceId = null
    speechStarted = false
    if (speakerReady) speaker?.stop()
    stopClip(true)
  }

  private fun playReply(localOnly: Boolean = false, networkOnly: Boolean = false) {
    val reply = queuedReply ?: return
    queuedReply = null
    val engine = speaker
    val supported = engine != null && configureVoice(reply.language, localOnly, networkOnly)
    if (!supported) {
      reply.promise.resolve(false)
      return
    }
    val best = bestVoice(reply.language, localOnly, networkOnly)
    playingUsesNetwork = best?.isNetworkConnectionRequired ?: true
    engine?.setSpeechRate(1.0f)
    engine?.setPitch(1.0f)
    engine?.setAudioAttributes(AudioAttributes.Builder().setUsage(if (Build.VERSION.SDK_INT >= 26) AudioAttributes.USAGE_ASSISTANT else AudioAttributes.USAGE_MEDIA)
      .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build())
    fallbackTried = localOnly || networkOnly
    speechStarted = false
    val id = java.util.UUID.randomUUID().toString()
    playingReply = reply
    utteranceId = id
    val started = engine?.speak(reply.text, TextToSpeech.QUEUE_FLUSH, null, id) == TextToSpeech.SUCCESS
    if (!started) {
      if (!fallbackTried && !playingUsesNetwork && bestVoice(reply.language, false, true) != null) {
        retryVoice(networkOnly = true)
        return
      }
      playingReply = null
      utteranceId = null
      reply.promise.resolve(false)
    }
    main.postDelayed({
      if (utteranceId == id && !speechStarted && playingUsesNetwork && !fallbackTried && bestVoice(reply.language, true) != null) retryVoice(localOnly = true)
    }, 1500)
    main.postDelayed({
      if (utteranceId == id && !speechStarted) stopSpeech()
    }, 8000)
    main.postDelayed({
      if (utteranceId == id) {
        stopSpeech()
      }
    }, 45000)
  }

  private fun retryVoice(localOnly: Boolean = false, networkOnly: Boolean = false) {
    val reply = playingReply ?: return
    playingReply = null
    utteranceId = null
    speaker?.stop()
    queuedReply = reply
    playReply(localOnly, networkOnly)
  }

  private fun completeSpeech(id: String?, success: Boolean) {
    main.post {
      if (id != null && id == utteranceId) {
        if (!success && !speechStarted && playingUsesNetwork && !fallbackTried && bestVoice(playingReply?.language ?: "en-IN", true) != null) {
          retryVoice(localOnly = true)
          return@post
        }
        if (!success && !speechStarted && !playingUsesNetwork && !fallbackTried && bestVoice(playingReply?.language ?: "en-IN", false, true) != null) {
          retryVoice(networkOnly = true)
          return@post
        }
        val reply = playingReply
        playingReply = null
        utteranceId = null
        reply?.promise?.resolve(success)
      }
    }
  }

  override fun onHostResume() {}
  override fun onHostPause() { event("cancelled"); cancel() }
  override fun onHostDestroy() = cancel()

  override fun invalidate() {
    context.removeLifecycleEventListener(this)
    cancel()
    main.post {
      failSpeaker()
    }
    super.invalidate()
  }
}
