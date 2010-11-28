#!/bin/sh
indir=static
outdir=min
jsfiles="lib/underscore.js lib/json2.js lib/backbone.js backbone-collectionview.js ar2.js"
jsout=ar2.js
cssin=ar2.css
cssout=ar2.css
htmlin=index.html
htmlout=index.html
others=openid

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

# Other.
for other in $others
do
    cp -r $indir/$other $outdir
done
