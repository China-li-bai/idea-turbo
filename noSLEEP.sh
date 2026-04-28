#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$SCRIPT_DIR/.nosleep.pid"
LOG_FILE="$SCRIPT_DIR/.nosleep.log"
START_TIME=$(date +%s)

cleanup() {
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    echo "[noSLEEP] Stopped after ${DURATION}s at $(date)" >> "$LOG_FILE"
    rm -f "$PID_FILE"
    exit 0
}

inhibit_via_systemd() {
    if command -v systemd-inhibit &>/dev/null; then
        systemd-inhibit --what=sleep:idle --who=noSLEEP --why="Prevent system sleep" --mode=block true 2>/dev/null &
        INHIBIT_PID=$!
        echo "[noSLEEP] systemd-inhibit active (PID: $INHIBIT_PID)" >> "$LOG_FILE"
    fi
}

inhibit_via_setterm() {
    setterm -blank 0 -powersave off -dump 2>/dev/null
}

inhibit_via_logind() {
    local loginctl_path
    loginctl_path=$(command -v loginctl 2>/dev/null)
    if [ -n "$loginctl_path" ]; then
        $loginctl_path inhibit --what=sleep:idle --who=noSLEEP --why="Prevent system sleep" --mode=block 2>/dev/null &
        LOGIND_PID=$!
        echo "[noSLEEP] loginctl inhibit active (PID: $LOGIND_PID)" >> "$LOG_FILE"
    fi
}

start() {
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
        echo "[noSLEEP] Already running (PID: $(cat "$PID_FILE"))"
        return 1
    fi

    echo "[noSLEEP] Starting anti-sleep daemon..."
    echo "[noSLEEP] Started at $(date)" > "$LOG_FILE"

    (
        trap cleanup EXIT INT TERM

        INHIBIT_PID=""
        LOGIND_PID=""

        inhibit_via_systemd
        inhibit_via_logind
        inhibit_via_setterm

        echo "[noSLEEP] Methods: systemd-inhibit + loginctl + setterm" >> "$LOG_FILE"
        echo "[noSLEEP] Heartbeat every 30s" >> "$LOG_FILE"

        while true; do
            sleep 30
            inhibit_via_setterm
            if [ -n "$INHIBIT_PID" ] && ! kill -0 "$INHIBIT_PID" 2>/dev/null; then
                inhibit_via_systemd
            fi
            if [ -n "$LOGIND_PID" ] && ! kill -0 "$LOGIND_PID" 2>/dev/null; then
                inhibit_via_logind
            fi
            echo "[noSLEEP] Heartbeat $(date +%H:%M:%S)" >> "$LOG_FILE"
        done
    ) &

    BG_PID=$!
    echo "$BG_PID" > "$PID_FILE"
    echo "[noSLEEP] Running in background (PID: $BG_PID)"
    echo "[noSLEEP] Log: $LOG_FILE"
    echo "[noSLEEP] Methods: systemd-inhibit + loginctl + setterm"
}

stop() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if kill -0 "$PID" 2>/dev/null; then
            kill -TERM "$PID" 2>/dev/null
            sleep 1
            kill -9 "$PID" 2>/dev/null
            rm -f "$PID_FILE"
            echo "[noSLEEP] Stopped (PID: $PID)"
        else
            rm -f "$PID_FILE"
            echo "[noSLEEP] Stale PID file cleaned"
        fi
    else
        echo "[noSLEEP] Not running"
    fi
}

status() {
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
        PID=$(cat "$PID_FILE")
        ELAPSED=$(( $(date +%s) - START_TIME ))
        echo "[noSLEEP] Running (PID: $PID)"
        tail -8 "$LOG_FILE" 2>/dev/null
    else
        echo "[noSLEEP] Not running"
        rm -f "$PID_FILE" 2>/dev/null
    fi
}

run() {
    echo "[noSLEEP] Running in foreground (Ctrl-C to stop)"
    echo "[noSLEEP] Started at $(date)"

    trap cleanup EXIT INT TERM

    INHIBIT_PID=""
    LOGIND_PID=""

    inhibit_via_systemd
    inhibit_via_logind
    inhibit_via_setterm

    echo "[noSLEEP] Methods: systemd-inhibit + loginctl + setterm"

    while true; do
        sleep 30
        inhibit_via_setterm
        if [ -n "$INHIBIT_PID" ] && ! kill -0 "$INHIBIT_PID" 2>/dev/null; then
            inhibit_via_systemd
        fi
        if [ -n "$LOGIND_PID" ] && ! kill -0 "$LOGIND_PID" 2>/dev/null; then
            inhibit_via_logind
        fi
        echo "[noSLEEP] Heartbeat $(date +%H:%M:%S)"
    done
}

case "${1:-start}" in
    start)   start   ;;
    stop)    stop    ;;
    restart) stop; sleep 1; start ;;
    status)  status  ;;
    run)     run     ;;
    *)
        echo "noSLEEP - Prevent system sleep (inspired by community best practices)"
        echo ""
        echo "Usage: $0 {start|stop|restart|status|run}"
        echo ""
        echo "  start   - Start in background (default)"
        echo "  stop    - Stop background daemon"
        echo "  restart - Restart background daemon"
        echo "  status  - Check status and recent log"
        echo "  run     - Run in foreground (Ctrl-C to stop)"
        echo ""
        echo "Methods used (multi-layer):"
        echo "  1. systemd-inhibit --what=sleep:idle (system-level lock)"
        echo "  2. loginctl inhibit (logind D-Bus lock)"
        echo "  3. setterm -blank 0 -powersave off (terminal level)"
        ;;
esac
