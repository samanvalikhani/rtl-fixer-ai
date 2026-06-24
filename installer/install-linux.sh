#!/usr/bin/env bash
# ====== این آدرس را با مخزن گیت‌هاب خودت عوض کن ======
UPDATE_URL="https://raw.githubusercontent.com/REPLACE_USER/REPLACE_REPO/main/updates.xml"
# ===================================================
ID="jidfelkckdpaofiokbgkhmdpbkoillbk"
JSON="{\"ExtensionInstallForcelist\":[\"$ID;$UPDATE_URL\"]}"
echo "نصب راست‌چین‌ساز — به دسترسی sudo نیاز است."
for dir in /etc/opt/chrome/policies/managed /etc/chromium/policies/managed /etc/opt/edge/policies/managed; do
  sudo mkdir -p "$dir" 2>/dev/null && echo "$JSON" | sudo tee "$dir/rtl-fixer.json" >/dev/null 2>&1
done
echo "انجام شد. مرورگر را ببند و دوباره باز کن."
