#!/bin/sh
#  remote-gx-ir/home/gx/local/default/fastdiscover.sh
#  
#  @author Leonardo Laureti <https://loltgt.ga>
#  @version 2020-08-03
#  @license MIT License
#  
IPTVS=$(curl http://127.0.0.1/iptvs.json | sed 's/.*\[{\([^}]*\)},{.*/\1/')
BAKIPTVNAME=$(echo $IPTVS | sed 's/.*"name":"\([^"]*\)".*/\1/')
BAKIPTVADDR=$(echo $IPTVS | sed 's/.*"server":"\([^"]*\)".*/\1/' | sed 's/#.*/\1/')
PROCNETTCP=$(cat /proc/net/tcp | tr '\n' ' ' | tr -s ' ')
MRTCPPORT=$(echo $PROCNETTCP | sed 's/.*0: 00000000:\([^ ]*\).*/\1/')
MSTCPPORT=$(echo $PROCNETTCP | sed 's/.*1: 00000000:\([^ ]*\).*/\1/')

curl -G http://127.0.0.1/iptvsubmit --data-urlencode "name=$BAKIPTVNAME" --data-urlencode 'protocol=m3u_playlist' --data-urlencode "address=$BAKIPTVADDR#$MSTCPPORT|$MRTCPPORT" --data-urlencode 'user_agent=' --data-urlencode 'handle=7' --data-urlencode 'default_portal=false'

