#!/bin/sh

MAX_DAYS=$1
case ${MAX_DAYS} 
   in ''|*[!0-9]*) echo "ERROR: MAX_DAYS '"${MAX_DAYS}"' is not an positive integer."; exit;;
   *) echo "Caching from today to "${MAX_DAYS}" days back.\n";;
esac

## Activate the semaphore
LCK="/tmp/event_cache.LCK";
#LCK="/tmp/event_cache_rebuild.LCK";
exec 8>$LCK;

#host=`hostname`
host='hekbeta.helioviewer.org'

echo ""
echo "### "`date`" ###"

## Check if lock was achieved before launching command(s)
if flock -n -x 8; then
   
   for i in $(seq 0 1 ${MAX_DAYS})
   do
      startTime=`date --date="$i days ago" +"%Y-%m-%dT00:00:00.000Z"`
      date_path=`date --date="$i days ago" +"%Y/%m/%d/"`
      cache_pat="/mnt/data/cache-hek.delphi/events/"${date_path}
      timestamp=`date +"%s"`
      
      max_age_s=$(((${i}*60*60)+(60*60*24*90)))
      if [ ${i} -lt 12 ]; then
         max_age_s=`echo $i | awk '{print 3600*2^$1}'`
      fi
#      max_age_s=1
      
      count=`expr 0`
      for file in `find $cache_pat -iname "*.json" -exec ls -1 {} \;`
      do
         file_timestamp=`date +"%s" -r ${file}`
         age_secs=$((${timestamp}-${file_timestamp}))
         echo "${file} is "${age_secs}" seconds old. ${max_age_s} allowed."
         
         if [ ${age_secs} -gt ${max_age_s} ]; then
            wget --delete-after -a /tmp/event_cache.txt "http://"${host}"/api/index.php?action=getEvents&startTime="${startTime}"&cacheOnly=true&force=true"
            #sleep 2
         fi
         
         count=`expr $count + 1` 
      done
      
      if [ ${count} -eq 0 ]; then
        echo "Caching "${startTime}
        wget --delete-after -a /tmp/event_cache.txt "http://"${host}"/api/index.php?action=getEvents&startTime="${startTime}"&cacheOnly=true"
        sleep 3
      fi
   done
   
   
else
   echo `date` 1>&2
   echo "REJECTED.  An "$0" script with lock-file "${LCK}" is already running." 1>&2
   exit 1
fi

echo ""

