#!/usr/bin/env bash

set -Eeuo pipefail

readonly APP_DIR="/opt/babycare"
readonly APP_USER="babycare"
readonly RELEASE_API_URL="https://api.github.com/repos/maelremrem/BabyCare/releases/latest"
readonly SERVICE_NAME="babycare.service"
readonly SERVICE_PATH="/etc/systemd/system/${SERVICE_NAME}"
readonly UPDATE_SERVICE_NAME="babycare-update.service"
readonly UPDATE_PATH_NAME="babycare-update.path"
readonly RELEASES_DIR="${APP_DIR}/releases"
readonly CURRENT_LINK="${APP_DIR}/current"
readonly DATA_DIR="/var/lib/babycare"
readonly UPDATE_DIR="/var/lib/babycare-update"

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

update_existing_checkout() {
  local tracked_changes=""
  local changed_files=""
  local stash_name=""

  tracked_changes="$(git -C "${APP_DIR}" status --porcelain --untracked-files=no)"

  if [[ -n "${tracked_changes}" ]]; then
    changed_files="$(
      {
        git -C "${APP_DIR}" diff --name-only
        git -C "${APP_DIR}" diff --name-only --cached
      } | sort -u
    )"

    if [[ "${changed_files}" == "package-lock.json" ]]; then
      echo "Changement local généré détecté sur package-lock.json : restauration avant mise à jour."
      git -C "${APP_DIR}" restore --staged --worktree package-lock.json
    else
      stash_name="babycare-install-$(date +%Y%m%d-%H%M%S)"
      echo "Changements locaux détectés : sauvegarde dans le stash Git '${stash_name}' avant mise à jour."
      git -C "${APP_DIR}" stash push --message "${stash_name}"
      echo "La mise à jour continue. Vous pourrez inspecter ces changements avec : git -C ${APP_DIR} stash list"
    fi
  fi

  git -C "${APP_DIR}" pull --ff-only origin "${REPOSITORY_BRANCH}"
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
apt-get install -y ca-certificates curl gnupg jq git build-essential python3 iproute2

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

echo "[3/6] Récupération de la dernière release BabyCare"
case "$(uname -m)" in
  x86_64) release_arch="amd64" ;;
  aarch64|arm64) release_arch="arm64" ;;
  *) echo "Architecture non supportée : $(uname -m)" >&2; exit 1 ;;
esac

release_json="$(mktemp)"
release_archive="$(mktemp --suffix=.tar.gz)"
release_checksum="$(mktemp)"
release_staging=""
source_staging=""
cleanup_release_files() {
  rm -f "${release_json}" "${release_archive}" "${release_checksum}"
  if [[ -n "${release_staging}" && -d "${release_staging}" ]]; then rm -rf "${release_staging}"; fi
  if [[ -n "${source_staging}" && -d "${source_staging}" ]]; then rm -rf "${source_staging}"; fi
}
trap cleanup_release_files EXIT

release_http_status="$(curl -sS --retry 3 -w '%{http_code}' -H "Accept: application/vnd.github+json" -H "User-Agent: BabyCare-installer" "${RELEASE_API_URL}" -o "${release_json}")"
if [[ "${release_http_status}" == "200" ]]; then
  release_tag="$(jq -r '.tag_name // empty' "${release_json}")"
else
  echo "Aucune GitHub Release publiée n’est disponible (${release_http_status}). Recherche du dernier tag pour réparation locale."
  release_tag="$(git ls-remote --tags --sort='-v:refname' https://github.com/maelremrem/BabyCare.git 'v*.*.*' | awk -F/ 'NR == 1 {print $3}')"
  if [[ -z "${release_tag}" ]]; then
    echo "Impossible de trouver un tag BabyCare publié. Vérifiez le workflow GitHub release.yml." >&2
    exit 1
  fi
fi
release_version="${release_tag#v}"
if [[ ! "${release_version}" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Release GitHub invalide : ${release_tag}" >&2
  exit 1
fi
archive_name="babycare-${release_tag}-linux-${release_arch}.tar.gz"
if [[ "${release_http_status}" == "200" ]]; then
  archive_url="$(jq -r --arg name "${archive_name}" '.assets[] | select(.name == $name) | .browser_download_url' "${release_json}")"
  checksum_url="$(jq -r --arg name "${archive_name}.sha256" '.assets[] | select(.name == $name) | .browser_download_url' "${release_json}")"
  if [[ -z "${archive_url}" || -z "${checksum_url}" ]]; then
    echo "La release ${release_tag} ne contient pas l’archive ${release_arch} attendue." >&2
    exit 1
  fi
  curl -fsSL --retry 3 "${archive_url}" -o "${release_archive}"
  curl -fsSL --retry 3 "${checksum_url}" -o "${release_checksum}"
  if [[ "$(awk '{print $1}' "${release_checksum}")" != "$(sha256sum "${release_archive}" | awk '{print $1}')" ]]; then
    echo "Checksum SHA-256 invalide pour ${archive_name}." >&2
    exit 1
  fi
fi

install -d -m 0755 "${APP_DIR}" "${RELEASES_DIR}"
release_staging="${RELEASES_DIR}/.${release_version}-install-$$"
release_dir="${RELEASES_DIR}/${release_version}"
install -d -m 0755 "${release_staging}"
if [[ "${release_http_status}" == "200" ]]; then
  tar -xzf "${release_archive}" -C "${release_staging}"
else
  source_staging="$(mktemp -d)"
  git clone --quiet --depth 1 --branch "${release_tag}" https://github.com/maelremrem/BabyCare.git "${source_staging}/source"
  cd "${source_staging}/source"
  npm ci
  npm run build:distribution
  npm prune --omit=dev --no-save
  cp -a package.json node_modules server dist-modern dist-ios15 scripts "${release_staging}/"
fi
if [[ ! -f "${release_staging}/package.json" || "$(jq -r '.name' "${release_staging}/package.json")" != "babycare" || "$(jq -r '.version' "${release_staging}/package.json")" != "${release_version}" ]]; then
  echo "L’archive téléchargée ne correspond pas à BabyCare ${release_version}." >&2
  exit 1
fi
for required_path in server/app.js dist-modern/index.html dist-ios15/index.html node_modules scripts; do
  [[ -e "${release_staging}/${required_path}" ]] || { echo "Release incomplète : ${required_path} absent." >&2; exit 1; }
done

if ! id "${APP_USER}" >/dev/null 2>&1; then
  useradd --system --home-dir "${APP_DIR}" --shell /usr/sbin/nologin "${APP_USER}"
fi
install -d -m 0750 -o "${APP_USER}" -g "${APP_USER}" "${DATA_DIR}"
install -d -m 0770 -o "${APP_USER}" -g "${APP_USER}" "${UPDATE_DIR}"
if [[ ! -e "${DATA_DIR}/babycare.db" && -e "${APP_DIR}/data/babycare.db" ]]; then
  echo "Migration conservatrice de la base vers ${DATA_DIR}"
  cp -a "${APP_DIR}/data/babycare.db"* "${DATA_DIR}/"
  chown -R "${APP_USER}:${APP_USER}" "${DATA_DIR}"
fi

if [[ ! -f "${release_staging}/.npmrc" ]]; then
  if [[ -f "${release_staging}/scripts/release.npmrc" ]]; then
    install -m 0644 "${release_staging}/scripts/release.npmrc" "${release_staging}/.npmrc"
  else
    printf '%s\n' 'ignore-scripts=true' 'audit=false' 'fund=false' 'update-notifier=false' > "${release_staging}/.npmrc"
    chmod 0644 "${release_staging}/.npmrc"
  fi
fi

echo "Validation des dépendances natives distribuées"
if [[ -f "${release_staging}/scripts/verify-native-runtime.js" ]]; then
  NODE_ENV=production node "${release_staging}/scripts/verify-native-runtime.js"
else
  (
    cd "${release_staging}"
    NODE_ENV=production node -e "const Database = require('better-sqlite3'); const database = new Database(':memory:'); database.prepare('SELECT 1').get(); database.close()"
  )
fi

echo "[4/6] Préparation de la release locale et des services systemd"
chown -R "${APP_USER}:${APP_USER}" "${release_staging}"
if [[ -e "${release_dir}" ]]; then
  mv "${release_dir}" "${release_dir}.replaced-$(date +%Y%m%d-%H%M%S)"
fi
mv "${release_staging}" "${release_dir}"
ln -s "${release_dir}" "${CURRENT_LINK}.new"
mv -Tf "${CURRENT_LINK}.new" "${CURRENT_LINK}"

echo "[5/6] Installation des services systemd"
install -m 0644 "${release_dir}/scripts/babycare.service" "${SERVICE_PATH}"
install -m 0644 "${release_dir}/scripts/${UPDATE_SERVICE_NAME}" "/etc/systemd/system/${UPDATE_SERVICE_NAME}"
install -m 0644 "${release_dir}/scripts/${UPDATE_PATH_NAME}" "/etc/systemd/system/${UPDATE_PATH_NAME}"
systemctl daemon-reload
systemctl enable "${SERVICE_NAME}"
systemctl enable --now "${UPDATE_PATH_NAME}"
systemctl restart "${SERVICE_NAME}"

echo "[6/6] Vérification du service BabyCare v${release_version}"
service_ready=false
for attempt in {1..60}; do
  if curl -fsS --max-time 2 http://127.0.0.1:3000/api/health >/dev/null 2>&1; then
    service_ready=true
    break
  fi
  sleep 1
done
if [[ "${service_ready}" != true ]]; then
  echo "BabyCare n’a pas répondu après son démarrage. Consultez : journalctl -u ${SERVICE_NAME}" >&2
  exit 1
fi
systemctl --no-pager --full status "${SERVICE_NAME}"

echo
echo "BabyCare est à jour et démarrera automatiquement avec Debian."
echo "Ouvrez http://$(detect_server_ip):3000 depuis votre réseau local."
if [[ -s "${DATA_DIR}/.auth-password" && -r "${DATA_DIR}/.auth-password" ]]; then
  printf '\nMot de passe généré : %s\n' "$(cat "${DATA_DIR}/.auth-password")"
  printf 'Conservé dans : %s/.auth-password\n' "${DATA_DIR}"
  echo "Si vous avez configuré un mot de passe personnalisé, utilisez celui-ci à la place."
else
  echo "Utilisez le mot de passe configuré pour le service BabyCare."
fi
