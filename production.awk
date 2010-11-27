BEGIN { indebug=0 }

/PRODUCTION!/ { next }

/[^\/]DEBUG!/ { indebug=1; next }
/\/DEBUG!/ { indebug=0; next }
indebug==1 { next }

{ print }
