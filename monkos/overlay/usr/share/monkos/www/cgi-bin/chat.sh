#!/bin/sh
# CGI bridge between the web chat and /usr/bin/banana. GET ?a=chat&m=..  ?a=teach&q=..&r=..  ?a=brain  ?a=forget&q=..
urldecode() { printf '%b' "$(printf '%s' "$1" | sed 's/+/ /g; s/\\/\\\\/g; s/%\([0-9A-Fa-f][0-9A-Fa-f]\)/\\x\1/g')"; }
param() { printf '%s' "$QUERY_STRING" | tr '&' '\n' | sed -n "s/^$1=//p" | head -n1; }
js() { printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g' | awk 'BEGIN{ORS="\\n"}1' | sed 's/\\n$//'; }
echo "Content-Type: application/json"; echo "Cache-Control: no-store"; echo
case "$(param a)" in
  teach) q=$(urldecode "$(param q)"); r=$(urldecode "$(param r)")
    banana --teach "$q" "$r" >/dev/null; printf '{"status":"TAUGHT","reply":"Ooh ooh! Learned it!"}\n';;
  forget) banana --forget "$(urldecode "$(param q)")" >/dev/null; printf '{"status":"FORGOT","reply":"Poof!"}\n';;
  brain) printf '{"brain":['; banana --brain | awk -F'\t' 'function e(s){gsub(/\\/,"\\\\",s);gsub(/"/,"\\\"",s);return s}
      {printf "%s[\"%s\",\"%s\"]",(NR>1?",":""),e($1),e($2)}'; printf ']'
    [ -e /var/lib/monkos/.volatile ] && printf ',"volatile":true'; printf '}\n';;
  *) out=$(banana --once "$(urldecode "$(param m)")"); st=$(printf '%s\n' "$out" | sed -n 1p)
    printf '{"status":"%s","reply":"%s"}\n' "$st" "$(js "$(printf '%s\n' "$out" | sed 1d)")";;
esac
