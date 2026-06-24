#!/bin/bash
# ====== این آدرس را با مخزن گیت‌هاب خودت عوض کن ======
UPDATE_URL="https://raw.githubusercontent.com/REPLACE_USER/REPLACE_REPO/main/updates.xml"
# ===================================================
ID="jidfelkckdpaofiokbgkhmdpbkoillbk"
VAL="$ID;$UPDATE_URL"
echo "نصب راست‌چین‌ساز — برای ثبت Policy به رمز مدیر (admin) نیاز است."
for d in com.google.Chrome com.microsoft.Edge com.brave.Browser; do
  sudo defaults write "/Library/Managed Preferences/$d" ExtensionInstallForcelist -array "$VAL" 2>/dev/null
done
echo "انجام شد. مرورگر را کامل ببند (Cmd+Q) و دوباره باز کن."
read -p "Enter برای بستن..."
