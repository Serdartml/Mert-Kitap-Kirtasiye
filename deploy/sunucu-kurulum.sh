#!/usr/bin/env bash
# Yeni Hetzner sunucusunu (Ubuntu 24.04) bir kez hazırlar. root olarak çalıştırın:
#
#   curl -fsSL https://raw.githubusercontent.com/<kullanici>/<depo>/main/deploy/sunucu-kurulum.sh -o kurulum.sh
#   (depo gizliyse dosyayı kopyala-yapıştır ile sunucuya alın)
#   bash kurulum.sh "ssh-ed25519 AAAA... github-actions-yayin"
#
# Argüman: GitHub Actions'ın sunucuya bağlanacağı anahtarın AÇIK (public) kısmı (README, "Canlı yayın").
# Betik tekrar çalıştırılabilir; var olanı bozmaz.
set -euo pipefail

DEPLOY_KEY="${1:-}"
if [[ -z "$DEPLOY_KEY" ]]; then
  echo "Kullanım: bash kurulum.sh \"<github actions açık anahtarı>\"" >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

echo "==> Sistem güncelleniyor"
apt-get update
apt-get -y upgrade
apt-get install -y ca-certificates curl ufw fail2ban unattended-upgrades

echo "==> Otomatik güvenlik güncellemeleri"
dpkg-reconfigure -f noninteractive unattended-upgrades

echo "==> Docker"
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sh
fi

echo "==> 2 GB takas alanı (derleme sunucuda yapılmaz ama bellek taşmalarına karşı)"
if [[ ! -f /swapfile ]]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo "/swapfile none swap sw 0 0" >> /etc/fstab
fi

echo "==> deploy kullanıcısı"
if ! id deploy >/dev/null 2>&1; then
  useradd --create-home --shell /bin/bash deploy
fi
usermod -aG docker deploy
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
touch /home/deploy/.ssh/authorized_keys
grep -qxF "$DEPLOY_KEY" /home/deploy/.ssh/authorized_keys || echo "$DEPLOY_KEY" >> /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys

echo "==> Uygulama klasörü"
install -d -m 750 -o deploy -g deploy /opt/mertkitap

echo "==> SSH: yalnızca anahtarla giriş"
cat > /etc/ssh/sshd_config.d/10-mertkitap.conf <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
EOF
systemctl reload ssh || systemctl reload sshd

echo "==> Güvenlik duvarı (22, 80, 443)"
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

echo "==> Günlük temizlik görevi (03:00 UTC; eskiden vercel.json crons)"
cat > /usr/local/bin/mertkitap-temizlik <<'EOF'
#!/usr/bin/env bash
# /api/cron/temizlik uç noktasını CRON_SECRET ile çağırır (lib/cleanup.ts).
set -euo pipefail
SECRET=$(grep -E '^CRON_SECRET=' /opt/mertkitap/.env | head -n1 | cut -d= -f2- | tr -d '"' | tr -d "'")
curl -fsS --max-time 120 -H "Authorization: Bearer ${SECRET}" http://127.0.0.1:3000/api/cron/temizlik
echo
EOF
chmod 755 /usr/local/bin/mertkitap-temizlik
cat > /etc/cron.d/mertkitap <<'EOF'
CRON_TZ=UTC
0 3 * * * deploy /usr/local/bin/mertkitap-temizlik >> /var/log/mertkitap-temizlik.log 2>&1
EOF
touch /var/log/mertkitap-temizlik.log
chown deploy:deploy /var/log/mertkitap-temizlik.log

echo
echo "Kurulum tamam. Sıradaki adım: GitHub'da yayın iş akışını çalıştırın (README, \"Canlı yayın\")."
