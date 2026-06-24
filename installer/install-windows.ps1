Add-Type -AssemblyName System.Windows.Forms | Out-Null
$ErrorActionPreference = "SilentlyContinue"

$ID = "jidfelkckdpaofiokbgkhmdpbkoillbk"
# ====== این آدرس را با مخزن گیت‌هاب خودت عوض کن ======
$UpdateUrl = "https://raw.githubusercontent.com/REPLACE_USER/REPLACE_REPO/main/updates.xml"
# ===================================================

function Box($text, $icon) {
  [System.Windows.Forms.MessageBox]::Show($text, "راست‌چین‌ساز هوش مصنوعی", "OK", $icon) | Out-Null
}

if ($UpdateUrl -like "*REPLACE_USER*") {
  Box("هنوز آماده‌ی نصب نیست.`n`nقبل از استفاده باید مخزن گیت‌هاب را راه‌اندازی کنی:`n۱) فایل rtl-fixer.crx را در Releases آپلود کن.`n۲) در فایل‌های updates.xml و installer، عبارت REPLACE_USER/REPLACE_REPO را با آدرس مخزنت عوض کن.`n`nبرای تستِ سریعِ خودِ افزونه از روش دستی (Load unpacked) روی پوشه‌ی extension استفاده کن.", "Warning")
  exit
}

$browsers = @{
  "Chrome" = "HKCU:\Software\Policies\Google\Chrome"
  "Edge"   = "HKCU:\Software\Policies\Microsoft\Edge"
  "Brave"  = "HKCU:\Software\Policies\BraveSoftware\Brave"
}
$val = "$ID;$UpdateUrl"
$done = @()
foreach ($name in $browsers.Keys) {
  $fl = $browsers[$name] + "\ExtensionInstallForcelist"
  New-Item -Path $fl -Force | Out-Null
  New-ItemProperty -Path $fl -Name "1" -Value $val -PropertyType String -Force | Out-Null
  $done += $name
}

Box("نصب شد ✓`n`nمرورگرها: $($done -join '، ')`n`nحالا همه‌ی پنجره‌های مرورگر را ببند و دوباره باز کن. افزونه خودکار نصب می‌شود.`n`nبرای بررسی، در نوار آدرس chrome://policy را باز کن و دنبال ExtensionInstallForcelist بگرد.", "Information")
