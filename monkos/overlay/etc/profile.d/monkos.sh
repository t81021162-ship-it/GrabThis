# MonkOS login hook: start services; on the console, drop straight into the chat.
monkos-start 2>/dev/null
case "$-" in *i*) if [ -z "$DISPLAY" ] && [ -z "$MONKOS_CHAT" ] && [ -t 0 ]; then
  export MONKOS_CHAT=1; banana; fi;; esac
alias chat=banana 2>/dev/null
PS1='\[\033[1;33m\]monk\[\033[0m\]@\[\033[1;32m\]jungle\[\033[0m\]:\w\$ '
