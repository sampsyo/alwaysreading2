#!/bin/sh
indir=static
outdir=min
jsfiles="lib/underscore.js lib/json2.js lib/backbone.js lib/backbone-localstorage.js backbone-collectionview.js ar2.js"
jsout=ar2.js
cssin=ar2.css
cssout=ar2.css
htmlin=index.html
htmlout=index.html

mkdir -p $outdir

# JavaScript.
jsinargs=
for jsfile in $jsfiles
do
    jsinargs="$jsinargs --js $indir/$jsfile"
done
java -jar compiler.jar $jsinargs --js_output_file $outdir/$jsout

# CSS.
java -jar yuicompressor.jar $indir/$cssin > $outdir/$cssout

# HTML.
awk -f production.awk $indir/$htmlin > $outdir/$htmlout
