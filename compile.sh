#!/bin/sh
outdir=min
jsfiles="lib/underscore.js lib/json2.js lib/backbone.js lib/backbone-localstorage.js backbone-collectionview.js ar2.js"
jsout=$outdir/ar2.js
cssin=ar2.css
cssout=$outdir/ar2.css

mkdir -p $outdir

jsinargs=
for jsfile in $jsfiles
do
    jsinargs="$jsinargs --js $jsfile"
done
java -jar compiler.jar $jsinargs --js_output_file $jsout

java -jar yuicompressor.jar $cssin > $cssout
