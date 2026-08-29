#!/usr/bin/env bash

set -Eeuo pipefail

readonly APP_DIR="/opt/babycare"
readonly APP_USER="babycare"
readonly REPOSITORY_URL="https://github.com/maelremrem/BabyCare.git"
readonly REPOSITORY_BRANCH="main"
readonly SERVICE_NAME="babycare.service"
readonly SERVICE_PATH="/etc/systemd/system/${SERVICE_NAME}"

detect_server_ip() {
  local detected_ip=""

  if command -v ip >/dev/null 2>&1; then
    detected_ip="$(ip route get 1.1.1.1 2>/dev/null | awk '{for (i=1; i<=NF; i++) if ($i == "src") {print $(i+1); exit}}')"
  fi

  if [[ -z "${detected_ip}" ]] && command -v hostname >/dev/null 2>&1; then
    detected_ip="$(hostname -I 2>/dev/null | awk '{print $1}')"
  fi

  if [[ -z "${detected_ip}" ]]; then
    detected_ip="ADRESSE_DU_SERVEUR"
  fi

  echo "${detected_ip}"
}

if [[ ${EUID} -ne 0 ]]; then
  echo "Ce script doit être lancé avec sudo : sudo ./scripts/install.sh" >&2
  exit 1
fi

if [[ ! -f /etc/debian_version ]]; then
  echo "Installation interrompue : ce script cible Debian et les conteneurs LXC Debian." >&2
  exit 1
fi

echo "[1/6] Installation des dépendances système"
apt-get update
apt-get install -y ca-certificates curl gnupg git build-essential python3 iproute2

node_major=0
if command -v node >/dev/null 2>&1; then
  node_major="$(node -p "process.versions.node.split('.')[0]")"
fi

if (( node_major < 22 )) || ! command -v npm >/dev/null 2>&1; then
  echo "[2/6] Installation de Node.js 22"
  nodesource_setup="$(mktemp)"
  trap 'rm -f "${nodesource_setup:-}"' EXIT
  curl -fsSL https://deb.nodesource.com/setup_22.x -o "${nodesource_setup}"
  bash "${nodesource_setup}"
  apt-get install -y nodejs
else
  echo "[2/6] Node.js ${node_major} est déjà disponible"
fi

echo "[3/6] Récupération de BabyCare"
if [[ -d "${APP_DIR}/.git" ]]; then
  git -C "${APP_DIR}" pull --ff-only origin "${REPOSITORY_BRANCH}"
elif [[ -e "${APP_DIR}" ]]; then
  if [[ -n "$(find "${APP_DIR}" -mindepth 1 -maxdepth 1 -print -quit)" ]]; then
    echo "Installation interrompue : ${APP_DIR} existe mais n’est pas un clone Git BabyCare." >&2
    echo "Déplacez son contenu puis relancez la commande d’installation." >&2
    exit 1
  fi
  git clone --branch "${REPOSITORY_BRANCH}" --single-branch "${REPOSITORY_URL}" "${APP_DIR}"
else
  git clone --branch "${REPOSITORY_BRANCH}" --single-branch "${REPOSITORY_URL}" "${APP_DIR}"
fi

if ! id "${APP_USER}" >/dev/null 2>&1; then
  useradd --system --home-dir "${APP_DIR}" --shell /usr/sbin/nologin "${APP_USER}"
fi
install -d -m 0750 -o "${APP_USER}" -g "${APP_USER}" "${APP_DIR}/data"
chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}/data"

echo "[4/6] Installation des dépendances et compilation"
cd "${APP_DIR}"
npm ci
npm run build
npm prune --omit=dev

echo "[5/6] Installation du service systemd"
install -m 0644 "${APP_DIR}/scripts/babycare.service" "${SERVICE_PATH}"
systemctl daemon-reload
systemctl enable "${SERVICE_NAME}"
systemctl restart "${SERVICE_NAME}"

echo "[6/6] Vérification du service"
systemctl --no-pager --full status "${SERVICE_NAME}"

echo
echo "BabyCare est à jour et démarrera automatiquement avec Debian."
echo "Ouvrez http://$(detect_server_ip):3000 depuis votre réseau local."
