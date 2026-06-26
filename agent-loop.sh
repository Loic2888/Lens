#!/usr/bin/env bash
# =============================================================================
# agent_loop.sh — Konsole Analyzer agentic build loop
#
# Flow:
#   1. Claude Code builds the project from CLAUDE.md
#   2. Checker agent runs tests + linting, collects errors into a report
#   3. If errors found → Claude Code repairs (même session via --resume)
#   4. Repeat steps 2-3 up to MAX_ITERATIONS times
#   5. After loop → Claude Code runs le skill code-documentation
#
# Usage:
#   chmod +x agent_loop.sh
#   ./agent_loop.sh
#
# Requirements:
#   - claude CLI installé et authentifié (npm i -g @anthropic-ai/claude-code)
#   - Node.js >= 20
#   - jq installé (apt install jq / brew install jq)
#   - Lancer depuis le dossier racine du projet (là où se trouve CLAUDE.md)
# =============================================================================
 
set -uo pipefail
 
# ── Config ────────────────────────────────────────────────────────────────────
MAX_ITERATIONS=3
PROJECT_ROOT="$(pwd)"
LOG_DIR="$PROJECT_ROOT/.agent_logs"
SKILL_PATH="$HOME/alkemia/.claude/skills/code-documentation/SKILL.md"
 
# Flags Claude Code communs à tous les appels
CLAUDE_FLAGS="--dangerously-skip-permissions --output-format json"
 
# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'
 
# ── Helpers ───────────────────────────────────────────────────────────────────
log()     { echo -e "${BLUE}[agent_loop]${NC} $*"; }
success() { echo -e "${GREEN}[✓]${NC} $*"; }
warn()    { echo -e "${YELLOW}[⚠]${NC} $*"; }
error()   { echo -e "${RED}[✗]${NC} $*"; }
section() {
  echo -e "\n${CYAN}══════════════════════════════════════════${NC}"
  echo -e "${CYAN}  $*${NC}"
  echo -e "${CYAN}══════════════════════════════════════════${NC}\n"
}
 
# Appelle claude -p et retourne le texte result + stocke session_id
# Usage: result=$(claude_run "prompt" ["session_id"])
claude_run() {
  local prompt="$1"
  local session_arg=""
  if [ -n "${2:-}" ]; then
    session_arg="--resume $2"
  fi
 
  local raw
  # shellcheck disable=SC2086
  raw=$(claude -p "$prompt" $CLAUDE_FLAGS $session_arg 2>&1) || true
 
  # Extraire session_id et result depuis le JSON
  LAST_SESSION_ID=$(echo "$raw" | jq -r '.session_id // empty' 2>/dev/null || echo "")
  LAST_RESULT=$(echo "$raw" | jq -r '.result // empty' 2>/dev/null || echo "$raw")
 
  echo "$LAST_RESULT"
}
 
# ── Sanity checks ─────────────────────────────────────────────────────────────
mkdir -p "$LOG_DIR"
 
if [ ! -f "$PROJECT_ROOT/CLAUDE.md" ]; then
  error "CLAUDE.md introuvable dans $PROJECT_ROOT — abandon."
  exit 1
fi
 
if ! command -v claude &> /dev/null; then
  error "Claude Code CLI introuvable. Installe avec : npm i -g @anthropic-ai/claude-code"
  exit 1
fi
 
if ! command -v jq &> /dev/null; then
  error "jq introuvable. Installe avec : apt install jq (ou brew install jq)"
  exit 1
fi
 
# Variables globales pour le session_id et le résultat
LAST_SESSION_ID=""
LAST_RESULT=""
 
# ── PHASE 1 — Build initial ───────────────────────────────────────────────────
section "PHASE 1 — Build initial"
log "Lancement de Claude Code pour construire le projet depuis CLAUDE.md..."
 
BUILD_PROMPT="Lis CLAUDE.md attentivement et implémente le projet complet exactement comme spécifié.
Suis l'ordre d'implémentation défini dans la section 'Implementation order for Claude Code'.
Crée tous les fichiers et dossiers. Installe toutes les dépendances avec npm install.
Ne saute aucune étape. Quand tu as terminé, affiche DONE."
 
build_output=$(claude_run "$BUILD_PROMPT")
BUILD_SESSION="$LAST_SESSION_ID"
 
echo "$build_output" > "$LOG_DIR/build_initial.log"
log "Session ID build : $BUILD_SESSION"
success "Build initial terminé."
 
# ── PHASE 2-4 — Check / Repair loop ──────────────────────────────────────────
iteration=1
has_errors=false
REPAIR_SESSION="$BUILD_SESSION"   # on reprend le contexte du build
 
while [ $iteration -le $MAX_ITERATIONS ]; do
  section "ITÉRATION $iteration / $MAX_ITERATIONS — Check & Repair"
 
  ERROR_REPORT="$LOG_DIR/errors_iter_${iteration}.md"
  has_errors=false
 
  {
    echo "# Error Report — Itération $iteration"
    echo "Généré : $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo ""
  } > "$ERROR_REPORT"
 
  # ── Checker ───────────────────────────────────────────────────────────────
  log "Checker en cours (itération $iteration)..."
 
  # 1. Vérification syntaxique server
  echo "## Server — syntaxe Node.js" >> "$ERROR_REPORT"
  if [ -d "$PROJECT_ROOT/server" ]; then
    cd "$PROJECT_ROOT/server"
    [ ! -d "node_modules" ] && npm install --silent 2>/dev/null || true
 
    syntax_errors=""
    while IFS= read -r -d '' file; do
      result=$(node --check "$file" 2>&1) || {
        syntax_errors+="**$file**\n\`\`\`\n$result\n\`\`\`\n\n"
        has_errors=true
      }
    done < <(find src -name "*.js" -print0 2>/dev/null)
 
    if [ -n "$syntax_errors" ]; then
      echo -e "$syntax_errors" >> "$ERROR_REPORT"
    else
      echo "✅ Aucune erreur de syntaxe côté server." >> "$ERROR_REPORT"
    fi
    cd "$PROJECT_ROOT"
  else
    echo "❌ Dossier server/ introuvable." >> "$ERROR_REPORT"
    has_errors=true
  fi
 
  # 2. Build Vite client
  echo "" >> "$ERROR_REPORT"
  echo "## Client — Vite build" >> "$ERROR_REPORT"
  if [ -d "$PROJECT_ROOT/client" ]; then
    cd "$PROJECT_ROOT/client"
    [ ! -d "node_modules" ] && npm install --silent 2>/dev/null || true
 
    build_out=$(npm run build 2>&1) || {
      echo "❌ Vite build échoué :" >> "$ERROR_REPORT"
      echo '```' >> "$ERROR_REPORT"
      echo "$build_out" >> "$ERROR_REPORT"
      echo '```' >> "$ERROR_REPORT"
      has_errors=true
    }
    echo "$build_out" | grep -q "built in" && echo "✅ Vite build OK." >> "$ERROR_REPORT" || true
    cd "$PROJECT_ROOT"
  else
    echo "❌ Dossier client/ introuvable." >> "$ERROR_REPORT"
    has_errors=true
  fi
 
  # 3. Fichiers structurellement requis
  echo "" >> "$ERROR_REPORT"
  echo "## Fichiers requis" >> "$ERROR_REPORT"
  required_files=(
    "server/index.js"
    "server/routes/analyze.js"
    "server/services/scraper.js"
    "server/services/analyzer.js"
    "server/services/scorer.js"
    "server/utils/urlHelper.js"
    "server/.env.example"
    "client/src/App.jsx"
    "client/src/api.js"
    "client/src/components/UrlForm.jsx"
    "client/src/components/ResultCard.jsx"
    "client/src/components/ScoreGauge.jsx"
    "client/src/components/Loader.jsx"
    "client/.env.example"
    "README.md"
  )
 
  missing=()
  for f in "${required_files[@]}"; do
    [ ! -f "$PROJECT_ROOT/$f" ] && missing+=("$f") && has_errors=true
  done
 
  if [ ${#missing[@]} -eq 0 ]; then
    echo "✅ Tous les fichiers requis sont présents." >> "$ERROR_REPORT"
  else
    echo "❌ Fichiers manquants :" >> "$ERROR_REPORT"
    for f in "${missing[@]}"; do echo "  - $f" >> "$ERROR_REPORT"; done
  fi
 
  # 4. Sécurité basique
  echo "" >> "$ERROR_REPORT"
  echo "## Sécurité" >> "$ERROR_REPORT"
  sec_ok=true
 
  if grep -rn "sk-ant-" "$PROJECT_ROOT/server/" 2>/dev/null | grep -v ".env" | grep -v ".example" | grep -q "sk-ant-"; then
    echo "❌ Clé Anthropic hardcodée détectée dans les sources." >> "$ERROR_REPORT"
    has_errors=true
    sec_ok=false
  fi
 
  if [ -f "$PROJECT_ROOT/server/utils/urlHelper.js" ]; then
    if grep -q "127\.\|192\.168\.\|localhost\|10\." "$PROJECT_ROOT/server/utils/urlHelper.js"; then
      echo "✅ Protection SSRF détectée dans urlHelper.js." >> "$ERROR_REPORT"
    else
      echo "⚠ Protection SSRF absente dans urlHelper.js." >> "$ERROR_REPORT"
      has_errors=true
      sec_ok=false
    fi
  fi
 
  [ "$sec_ok" = true ] && echo "✅ Aucun problème de sécurité critique." >> "$ERROR_REPORT"
 
  # ── Décision : sortie anticipée ou repair ────────────────────────────────
  echo "" >> "$ERROR_REPORT"
  echo "## Résumé" >> "$ERROR_REPORT"
 
  if [ "$has_errors" = false ]; then
    echo "✅ Aucune erreur — build propre." >> "$ERROR_REPORT"
    success "Itération $iteration : aucune erreur. Sortie anticipée de la boucle."
    break
  fi
 
  echo "❌ Erreurs détectées — repair nécessaire." >> "$ERROR_REPORT"
  warn "Itération $iteration : erreurs trouvées. Lancement du repair agent..."
 
  # ── Repair ────────────────────────────────────────────────────────────────
  error_content=$(cat "$ERROR_REPORT")
 
  REPAIR_PROMPT="Tu es un agent de réparation. Le checker a trouvé des erreurs dans le projet.
 
Voici le rapport d'erreurs :
 
$error_content
 
Ta mission :
1. Corrige chaque erreur listée ci-dessus.
2. Ne retouche pas les fichiers qui n'ont aucune erreur.
3. Après avoir corrigé, vérifie que les fixes sont cohérents avec l'architecture définie dans CLAUDE.md.
4. N'introduis pas de nouvelles dépendances absentes de CLAUDE.md.
5. Quand tu as terminé, affiche REPAIRS_DONE."
 
  repair_output=$(claude_run "$REPAIR_PROMPT" "$REPAIR_SESSION")
  REPAIR_SESSION="$LAST_SESSION_ID"   # on garde le fil pour la prochaine itération
 
  echo "$repair_output" > "$LOG_DIR/repair_iter_${iteration}.log"
  success "Repair itération $iteration terminé."
 
  iteration=$((iteration + 1))
done
 
# ── Status final ──────────────────────────────────────────────────────────────
section "Boucle terminée"
if [ "$has_errors" = true ] && [ $iteration -gt $MAX_ITERATIONS ]; then
  warn "$MAX_ITERATIONS itérations atteintes avec des erreurs résiduelles."
  warn "Consulte $LOG_DIR/ pour les rapports complets."
  warn "Passage à la documentation malgré tout..."
else
  success "Projet construit et validé avec succès."
fi
 
# ── PHASE 5 — Documentation ───────────────────────────────────────────────────
section "PHASE 5 — Documentation (skill code-documentation)"
log "Lecture du skill et lancement de l'agent de documentation..."
 
if [ -f "$SKILL_PATH" ]; then
  skill_content=$(cat "$SKILL_PATH")
else
  warn "Skill introuvable à $SKILL_PATH"
  skill_content="Documente chaque fichier source avec un header de fichier, des commentaires de fonctions et de classes en prose anglaise. Ne modifie jamais la logique du code. Crée ou mets à jour README.md."
fi
 
DOC_PROMPT="Tu es un agent de documentation. Applique le skill suivant à la lettre :
 
--- SKILL START ---
$skill_content
--- SKILL END ---
 
Applique ce skill à l'ensemble du projet konsole-analyzer.
Documente tous les fichiers source dans server/ et client/src/.
Ignore : node_modules/, dist/, .env, fichiers lock.
Quand tu as terminé, affiche DOCUMENTATION_DONE."
 
doc_output=$(claude_run "$DOC_PROMPT" "$REPAIR_SESSION")
echo "$doc_output" > "$LOG_DIR/documentation.log"
 
success "Documentation terminée."
 
# ── Done ──────────────────────────────────────────────────────────────────────
section "Toutes les phases terminées"
echo ""
log "Logs disponibles dans : $LOG_DIR/"
ls -lh "$LOG_DIR/"
echo ""
success "konsole-analyzer est construit, validé et documenté."
echo ""
echo "  Prochaines étapes :"
echo "  1. cp server/.env.example server/.env  →  remplis ANTHROPIC_API_KEY"
echo "  2. cp client/.env.example client/.env  →  remplis VITE_API_URL"
echo "  3. cd server && npm run dev"
echo "  4. cd client && npm run dev"
echo "  5. Ouvre http://localhost:5173"
echo ""
