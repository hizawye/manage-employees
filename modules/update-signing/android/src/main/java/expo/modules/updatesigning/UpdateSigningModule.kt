package expo.modules.updatesigning

import android.content.pm.PackageManager
import android.content.pm.Signature
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.security.MessageDigest

private const val LEGACY = "fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c"
private const val PUBLISHER = "6b9387315148728014951f9143f0ac848c15fa05a6ef2d35095fd962400ff526"

private fun Signature.sha256(): String = MessageDigest.getInstance("SHA-256")
  .digest(toByteArray()).joinToString("") { "%02x".format(it) }

class UpdateSigningModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ManageEmployeesUpdateSigning")
    Constant("needsSigningMigration") { isBridgeInstall() }
  }

  @Suppress("DEPRECATION")
  private fun isBridgeInstall(): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) return false
    val context = appContext.reactContext ?: return false
    val signing = try {
      context.packageManager.getPackageInfo(context.packageName, PackageManager.GET_SIGNING_CERTIFICATES).signingInfo
    } catch (_: PackageManager.NameNotFoundException) {
      return false
    } ?: return false
    return !signing.hasMultipleSigners() &&
      signing.apkContentsSigners?.singleOrNull()?.sha256() == PUBLISHER &&
      signing.signingCertificateHistory?.any { it.sha256() == LEGACY } == true
  }
}
