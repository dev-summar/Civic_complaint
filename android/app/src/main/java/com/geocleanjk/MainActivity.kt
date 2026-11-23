package com.geocleanjk

import android.app.AlertDialog
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.os.Bundle
import android.widget.Toast
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import java.io.File

class MainActivity : ReactActivity() {

  /**
   * react-native-screens must not restore the previous fragment.
   * Restoring it leaves every text field visible but unable to focus,
   * so taps never open the keyboard.
   */
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(null)
    showLastCrash()
  }

  private fun showLastCrash() {
    val file = File(filesDir, MainApplication.CRASH_FILE)
    if (!file.exists()) return
    val details = runCatching { file.readText() }.getOrDefault("")
    file.delete()
    if (details.isBlank()) return

    AlertDialog.Builder(this)
        .setTitle("SwachhSetu closed unexpectedly")
        .setMessage("Tap \"Copy details\" and send them to the developer.\n\n${details.take(2500)}")
        .setPositiveButton("Copy details") { _, _ ->
          val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
          clipboard.setPrimaryClip(ClipData.newPlainText("SwachhSetu crash", details))
          Toast.makeText(this, "Crash details copied", Toast.LENGTH_SHORT).show()
        }
        .setNegativeButton("Close", null)
        .show()
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "SwachhSetu"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
