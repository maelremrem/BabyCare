#!/bin/sh

set -eu

UPDATE_DIR="${BABYCARE_UPDATE_DIR:-/update}"
REQUEST_FILE="${UPDATE_DIR}/request.json"
STATUS_FILE="${UPDATE_DIR}/status.json"
ROLLBACK_FILE="${UPDATE_DIR}/rollback.json"
COMPOSE_FILE="${BABYCARE_COMPOSE_FILE:-/config/compose.yml}"
COMPOSE_PROJECT="${BABYCARE_COMPOSE_PROJECT:-babycare}"
APP_SERVICE="${BABYCARE_COMPOSE_SERVICE:-babycare}"
APP_IMAGE="${BABYCARE_DOCKER_IMAGE:-ghcr.io/maelremrem/babycare}"
HEALTH_URL="${BABYCARE_HEALTH_URL:-http://babycare:3000/api/health}"

mkdir -p "${UPDATE_DIR}"

write_status() {
  state="$1"
  progress="$2"
  command="$3"
  message="${4:-}"
  target_version="${5:-}"
  temporary_file="${STATUS_FILE}.$$"
  jq -n \
    --arg state "${state}" \
    --argjson progress "${progress}" \
    --arg command "${command}" \
    --arg message "${message}" \
    --arg targetVersion "${target_version}" \
    --arg updatedAt "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    '{state:$state,progress:$progress,command:$command,message:$message,targetVersion:(if $targetVersion == "" then null else $targetVersion end),updatedAt:$updatedAt}' \
    > "${temporary_file}"
  chmod 0644 "${temporary_file}"
  mv -f "${temporary_file}" "${STATUS_FILE}"
}

compose() {
  docker compose -f "${COMPOSE_FILE}" -p "${COMPOSE_PROJECT}" "$@"
}

current_container() {
  compose ps -q "${APP_SERVICE}"
}

current_version() {
  curl -fsS --max-time 3 "${HEALTH_URL}" 2>/dev/null | jq -r '.version // empty' || true
}

wait_for_version() {
  expected="$1"
  attempt=0
  while [ "${attempt}" -lt 30 ]; do
    version="$(current_version)"
    if [ -n "${version}" ] && { [ -z "${expected}" ] || [ "${version}" = "${expected}" ]; }; then
      return 0
    fi
    attempt=$((attempt + 1))
    sleep 1
  done
  return 1
}

restart_app() {
  compose up -d --no-deps --force-recreate --pull never "${APP_SERVICE}"
}

save_rollback() {
  image_reference="$1"
  version="$2"
  temporary_file="${ROLLBACK_FILE}.$$"
  jq -n --arg target "${image_reference}" --arg version "${version}" --arg createdAt "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    '{target:$target,version:$version,createdAt:$createdAt}' > "${temporary_file}"
  chmod 0644 "${temporary_file}"
  mv -f "${temporary_file}" "${ROLLBACK_FILE}"
}

install_update() {
  request="$1"
  version="$(jq -r '.version // empty' "${request}")"
  if ! printf '%s' "${version}" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$'; then
    write_status "error" 100 "Mise à jour Docker interrompue" "Version de release invalide"
    return 1
  fi

  container="$(current_container)"
  if [ -z "${container}" ]; then
    write_status "error" 100 "Mise à jour Docker interrompue" "Conteneur BabyCare introuvable" "${version}"
    return 1
  fi
  previous_image="$(docker inspect --format '{{.Image}}' "${container}")"
  previous_version="$(current_version)"

  pull_log="${UPDATE_DIR}/docker-pull.$$.log"
  write_status "downloading" 0 "Téléchargement de l’image ${APP_IMAGE}:${version}" "" "${version}"
  docker pull "${APP_IMAGE}:${version}" > "${pull_log}" 2>&1 &
  pull_pid="$!"
  download_progress=0
  while kill -0 "${pull_pid}" 2>/dev/null; do
    write_status "downloading" "${download_progress}" "Téléchargement de l’image ${APP_IMAGE}:${version}" "" "${version}"
    if [ "${download_progress}" -lt 49 ]; then
      download_progress=$((download_progress + 1))
    fi
    sleep 1
  done
  if ! wait "${pull_pid}"; then
    rm -f "${pull_log}"
    write_status "error" 100 "docker pull ${APP_IMAGE}:${version}" "L’image distribuée n’est pas encore disponible." "${version}"
    return 1
  fi
  rm -f "${pull_log}"
  write_status "downloading" 50 "Image ${APP_IMAGE}:${version} téléchargée" "" "${version}"
  write_status "verifying" 58 "Vérification de l’image OCI ${APP_IMAGE}:${version}" "" "${version}"
  candidate_image="$(docker image inspect --format '{{.Id}}' "${APP_IMAGE}:${version}")"
  if [ -z "${candidate_image}" ]; then
    write_status "error" 100 "Vérification de l’image OCI" "Image Docker invalide" "${version}"
    return 1
  fi

  rollback_reference="${APP_IMAGE}:babycare-rollback"
  write_status "installing" 70 "Préparation du rollback Docker" "" "${version}"
  docker image tag "${previous_image}" "${rollback_reference}"
  save_rollback "${rollback_reference}" "${previous_version}"
  write_status "installing" 85 "Activation de l’image BabyCare v${version}" "" "${version}"
  docker image tag "${candidate_image}" "${APP_IMAGE}:latest"

  write_status "restarting" 95 "Redémarrage du conteneur BabyCare" "" "${version}"
  if ! restart_app; then
    write_status "restarting" 99 "Redémarrage en échec, rollback Docker automatique" "" "${version}"
    docker image tag "${rollback_reference}" "${APP_IMAGE}:latest"
    restart_app || true
    wait_for_version "${previous_version}" || true
    write_status "error" 100 "Rollback Docker automatique terminé" "BabyCare v${version} n’a pas pu redémarrer." "${version}"
    return 1
  fi
  write_status "checking" 98 "Contrôle de santé de BabyCare v${version}" "" "${version}"
  if ! wait_for_version "${version}"; then
    write_status "restarting" 99 "Contrôle de santé en échec, rollback Docker automatique" "" "${version}"
    docker image tag "${rollback_reference}" "${APP_IMAGE}:latest"
    restart_app || true
    wait_for_version "${previous_version}" || true
    write_status "error" 100 "Rollback Docker automatique terminé" "BabyCare v${version} n’a pas passé le contrôle de santé." "${version}"
    return 1
  fi

  write_status "complete" 100 "BabyCare v${version} est actif dans Docker" "" "${version}"
}

rollback_update() {
  if [ ! -f "${ROLLBACK_FILE}" ]; then
    write_status "error" 100 "Rollback Docker interrompu" "Aucune image précédente n’est disponible."
    return 1
  fi
  target="$(jq -r '.target // empty' "${ROLLBACK_FILE}")"
  target_version="$(jq -r '.version // empty' "${ROLLBACK_FILE}")"
  if [ -z "${target}" ] || ! docker image inspect "${target}" >/dev/null 2>&1; then
    write_status "error" 100 "Rollback Docker interrompu" "L’image précédente est introuvable."
    return 1
  fi

  container="$(current_container)"
  current_image="$(docker inspect --format '{{.Image}}' "${container}")"
  current_app_version="$(current_version)"
  docker image tag "${current_image}" "${APP_IMAGE}:babycare-redo"
  docker image tag "${target}" "${APP_IMAGE}:latest"
  save_rollback "${APP_IMAGE}:babycare-redo" "${current_app_version}"

  write_status "restarting" 95 "Rollback Docker vers BabyCare v${target_version}" "" "${target_version}"
  if ! restart_app || ! wait_for_version "${target_version}"; then
    docker image tag "${APP_IMAGE}:babycare-redo" "${APP_IMAGE}:latest"
    restart_app || true
    wait_for_version "${current_app_version}" || true
    write_status "error" 100 "Rollback Docker interrompu" "La version initiale a été restaurée." "${target_version}"
    return 1
  fi
  write_status "complete" 100 "Rollback Docker vers BabyCare v${target_version} terminé" "" "${target_version}"
}

process_request() {
  processing_file="${UPDATE_DIR}/request.processing"
  mv "${REQUEST_FILE}" "${processing_file}" 2>/dev/null || return 0
  action="$(jq -r '.action // empty' "${processing_file}")"
  runtime="$(jq -r '.runtime // "docker"' "${processing_file}")"
  if [ "${runtime}" != "docker" ]; then
    write_status "error" 100 "Mise à jour Docker interrompue" "Requête destinée à un autre moteur de mise à jour."
  elif [ "${action}" = "update" ]; then
    install_update "${processing_file}" || true
  elif [ "${action}" = "rollback" ]; then
    rollback_update || true
  else
    write_status "error" 100 "Mise à jour Docker interrompue" "Action inconnue."
  fi
  rm -f "${processing_file}"
}

write_status "idle" 0 "Worker de mise à jour Docker prêt"
if [ -f "${UPDATE_DIR}/request.processing" ]; then
  mv -f "${UPDATE_DIR}/request.processing" "${REQUEST_FILE}"
fi
while true; do
  if [ -f "${REQUEST_FILE}" ]; then
    process_request
  fi
  sleep 1
done
