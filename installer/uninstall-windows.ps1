Add-Type -AssemblyName System.Windows.Forms | Out-Null
$ErrorActionPreference = "SilentlyContinue"
$paths = @(
  "HKCU:\Software\Policies\Google\Chrome\ExtensionInstallForcelist",
  "HKCU:\Software\Policies\Microsoft\Edge\ExtensionInstallForcelist",
  "HKCU:\Software\Policies\BraveSoftware\Brave\ExtensionInstallForcelist"
)
foreach ($p in $paths) { Remove-ItemProperty -Path $p -Name "1" -ErrorAction SilentlyContinue }
[System.Windows.Forms.MessageBox]::Show("حذف شد. مرورگر را ببند و دوباره باز کن.", "راست‌چین‌ساز هوش مصنوعی", "OK", "Information") | Out-Null
